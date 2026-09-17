import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';

import { FieldType, GrafanaThemeType, PanelProps, toDataFrame } from '@grafana/data';
import { BigValueGraphMode } from '@grafana/schema';
import { FnGlobalState, INITIAL_FN_STATE } from 'app/core/reducers/fn-slice';
import { createMfe } from 'app/fn-app/create-mfe';
import { FNDashboardProps } from 'app/fn-app/types';
import {
  mfeDispatch,
  mfeGetStoreState,
  removeGrafanaStoreAndDashboard,
  updatePartialMfeStates,
  updateRenderingDashboardUID,
} from 'app/store/configureMfeStore';
import { configureStore } from 'app/store/configureStore';

import { StatPanel } from './StatPanel';
import { defaultOptions, Options } from './panelcfg.gen';

jest.unmock('@grafana/data');
jest.unmock('@grafana/ui');
jest.unmock('@grafana/runtime');
jest.mock('app/store/configureStore', () => {
  const { configureStore } = jest.requireActual<typeof import('@reduxjs/toolkit')>('@reduxjs/toolkit');
  const { fnSliceReducer } = jest.requireActual('app/core/reducers/fn-slice');
  return {
    configureStore: (initial: { fnGlobalState: FnGlobalState }) =>
      configureStore({
        reducer: { fnGlobalState: fnSliceReducer },
        preloadedState: initial,
        middleware: (defaults) => defaults({ serializableCheck: false }),
      }),
  };
});
jest.mock('app/fn_app', () => ({ __esModule: true, default: { init: jest.fn() } }));
jest.mock('app/core/services/backend_srv', () => ({ backendSrv: { cancelAllInFlightRequests: jest.fn() } }));
jest.mock('app/fn_logger', () => ({ FnLoggerService: { info: jest.fn(), error: jest.fn() } }));

describe('StatPanel dashboard click ownership', () => {
  afterEach(() => {
    cleanup();
    for (const uid of ['qualityMetrics', 'commentDrillDown']) {
      mfeDispatch(removeGrafanaStoreAndDashboard(uid));
    }
    mfeDispatch(updateRenderingDashboardUID(''));
    jest.restoreAllMocks();
  });

  it('keeps the Grafana data-link menu working without emitting host events outside MFE mode', () => {
    const eventListener = jest.fn();
    const openMenu = jest.fn();
    const store = configureStore({
      fnGlobalState: {
        ...INITIAL_FN_STATE,
        FNDashboard: false,
        mode: GrafanaThemeType.Light,
        metadata: { teams: [], eventListener },
      },
    });
    const panel = new StatPanel({
      options: defaultOptions,
      fieldConfig: { defaults: {}, overrides: [] },
    } as unknown as PanelProps<Options>);
    const valueProps = {
      value: { display: { title: 'Ordinary stat', text: '42', numeric: 42 } },
      width: 300,
      height: 150,
      count: 1,
    } as Parameters<StatPanel['renderComponent']>[0];
    const view = render(<Provider store={store}>{panel.renderComponent(valueProps, { openMenu })}</Provider>);

    fireEvent.click(view.getByText('Ordinary stat'));

    expect(openMenu).toHaveBeenCalledTimes(1);
    expect(eventListener).not.toHaveBeenCalled();
  });

  it.each([
    ['Critical', 'Minor'],
    ['SECURITY_AND_PRIVACY', 'FUNCTIONAL_CORRECTNESS'],
  ])('keeps %s and %s clicks working after child teardown', async (first, second) => {
    const parentListener = jest.fn();
    const childListener = jest.fn();
    for (const [uid, eventListener] of [
      ['qualityMetrics', parentListener],
      ['commentDrillDown', childListener],
    ] as const) {
      mfeDispatch(updatePartialMfeStates({ ...INITIAL_FN_STATE, uid, metadata: { teams: [], eventListener } }));
    }
    mfeDispatch(updateRenderingDashboardUID('qualityMetrics'));
    // Query results are fixtures; retain the real StatPanel, VizRepeater,
    // BigValue and DOM click handler throughout child ownership and teardown.
    const props = {
      options: {
        ...defaultOptions,
        graphMode: BigValueGraphMode.None,
        reduceOptions: { calcs: ['lastNotNull'], values: false },
      },
      width: 600,
      height: 200,
      data: {
        series: [
          toDataFrame({
            fields: [first, second].map((name) => ({
              name,
              type: FieldType.number,
              values: [78.4],
              config: {},
              display: () => ({ text: '78.4', numeric: 78.4 }),
            })),
          }),
        ],
      },
      fieldConfig: { defaults: {}, overrides: [] },
      renderCounter: 0,
    } as unknown as PanelProps<Options>;
    const store = mfeGetStoreState().fnGlobalReducer.grafanaStores.qualityMetrics;
    const childStore = mfeGetStoreState().fnGlobalReducer.grafanaStores.commentDrillDown;
    const panel = (renderCounter: number, child = false) => (
      <>
        <section data-testid="parent">
          <Provider store={store}>
            <StatPanel {...props} renderCounter={renderCounter} />
          </Provider>
        </section>
        {child && (
          <section data-testid="child">
            <Provider store={childStore}>
              <StatPanel {...props} renderCounter={renderCounter} />
            </Provider>
          </section>
        )}
      </>
    );
    const view = render(panel(0));
    const parent = within(view.getByTestId('parent'));
    fireEvent.click(parent.getByText(first));
    expect(parentListener).toHaveBeenCalledTimes(1);

    act(() => mfeDispatch(updateRenderingDashboardUID('commentDrillDown')));
    view.rerender(panel(1, true));
    const retainedParentValue = parent.getByText(first);
    fireEvent.click(within(view.getByTestId('child')).getByText(first));
    expect(childListener).toHaveBeenCalledTimes(1);
    await act(async () => {
      await createMfe.updateFnApp()({ renderingDashboardUid: 'qualityMetrics' } as unknown as FNDashboardProps, window);
      mfeDispatch(removeGrafanaStoreAndDashboard('commentDrillDown'));
    });
    view.rerender(panel(1));
    // Parent PureComponent props stay unchanged on close: exercise the retained handler.
    expect(parent.getByText(first)).toBe(retainedParentValue);
    fireEvent.click(parent.getByText(first));
    fireEvent.click(parent.getByText(second));
    expect(parentListener).toHaveBeenCalledTimes(3);
    expect(parentListener).toHaveBeenLastCalledWith({ type: 'statsPanelClick', data: { title: second, text: '78.4' } });
    expect(childListener).toHaveBeenCalledTimes(1);
  });
});

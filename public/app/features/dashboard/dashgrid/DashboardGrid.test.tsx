import { act, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { useEffectOnce } from 'react-use';
import { getGrafanaContextMock } from 'test/mocks/getGrafanaContextMock';

import { GrafanaThemeType, TextBoxVariableModel } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { Dashboard } from '@grafana/schema';
import appEvents from 'app/core/app_events';
import { GRID_CELL_VMARGIN, GRID_COLUMN_COUNT } from 'app/core/constants';
import { GrafanaContext } from 'app/core/context/GrafanaContext';
import { INITIAL_FN_STATE } from 'app/core/reducers/fn-slice';
import { GetVariables } from 'app/features/variables/state/selectors';
import { VariablesChanged } from 'app/features/variables/types';
import { configureStore } from 'app/store/configureStore';
import { DashboardMeta, StoreState } from 'app/types';

import { DashboardModel, PanelModel } from '../state';
import { createDashboardModelFixture } from '../state/__fixtures__/dashboardFixtures';

import { Component, DashboardGrid, Props } from './DashboardGrid';
import { LazyLoader, Props as LazyLoaderProps } from './LazyLoader';

// A bundled panel's package mock omits SceneDataLayerBase; this suite exercises
// the real dashboard graph, not that plugin's isolated scene stub.
jest.unmock('@grafana/scenes');
jest.unmock('@grafana/data');
jest.unmock('@grafana/ui');

// JSDOM has no layout; provide the viewport the grid needs to mount its panels.
jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }: { children: (size: { width: number; height: number }) => ReactNode }) =>
    children({ width: 1000, height: 800 }),
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  config: {
    ...jest.requireActual('@grafana/runtime').config,
    featureToggles: {
      panelFilterVariable: true,
    },
  },
}));

jest.mock('app/features/dashboard/dashgrid/LazyLoader', () => {
  const LazyLoader = jest.fn(({ children, onLoad }: Pick<LazyLoaderProps, 'children' | 'onLoad'>) => {
    useEffectOnce(() => {
      onLoad?.();
    });
    return <>{typeof children === 'function' ? children({ isInView: true }) : children}</>;
  });
  return { LazyLoader };
});

function setup(props: Props, initialState: Partial<StoreState> = {}) {
  const context = getGrafanaContextMock();
  const store = configureStore({
    fnGlobalState: {
      ...INITIAL_FN_STATE,
      FNDashboard: props.isFnDashboard ?? false,
      mode: GrafanaThemeType.Light,
      portalContainerID: props.portalContainerID ?? INITIAL_FN_STATE.portalContainerID,
    },
    ...initialState,
  });
  const container = document.createElement('div');
  container.id = props.portalContainerID ?? '';
  Object.defineProperties(container, {
    clientWidth: { value: 1000 },
    clientHeight: { value: 800 },
  });
  document.body.appendChild(container);

  return render(
    <GrafanaContext.Provider value={context}>
      <Provider store={store}>
        <Router history={locationService.getHistory()}>
          <DashboardGrid {...props} />
        </Router>
      </Provider>
    </GrafanaContext.Provider>,
    { container }
  );
}

function getRect(overrides: Partial<DOMRect>): DOMRect {
  return {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    toJSON: () => ({}),
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function getRequiredPanel(dashboard: DashboardModel, panelId: number): PanelModel {
  const panel = dashboard.getPanelById(panelId);
  if (!panel) {
    throw new Error(`Expected test dashboard to contain panel ${panelId}`);
  }

  return panel;
}

function getTestDashboard(
  overrides?: Partial<Dashboard>,
  metaOverrides?: Partial<DashboardMeta>,
  getVariablesFromState?: GetVariables
): DashboardModel {
  const data = Object.assign(
    {
      title: 'My dashboard',
      panels: [
        {
          id: 1,
          type: 'graph',
          title: 'My graph',
          gridPos: { x: 0, y: 0, w: 24, h: 10 },
        },
        {
          id: 2,
          type: 'table',
          title: 'My table',
          gridPos: { x: 0, y: 10, w: 25, h: 10 },
        },
        {
          id: 3,
          type: 'table',
          title: 'My table 2',
          gridPos: { x: 0, y: 20, w: 25, h: 100 },
        },
        {
          id: 4,
          type: 'gauge',
          title: 'My gauge',
          gridPos: { x: 0, y: 120, w: 25, h: 10 },
        },
      ],
    },
    overrides
  );

  return createDashboardModelFixture(data, metaOverrides, getVariablesFromState);
}

describe('DashboardGrid', () => {
  let fetchSpy: jest.SpyInstance;
  beforeAll(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!url.endsWith('.svg')) {
        throw new Error(`Unexpected grid test fetch: ${url}`);
      }
      return new Response('<svg xmlns="http://www.w3.org/2000/svg" />');
    });
  });
  afterAll(() => fetchSpy.mockRestore());

  it.each<{
    readonly FNDashboard: boolean;
    readonly dashboardAccessMode: 'standard' | 'custom';
    readonly preloadPanels: boolean;
    readonly lazy: boolean;
  }>([
    { FNDashboard: true, dashboardAccessMode: 'standard', preloadPanels: true, lazy: false },
    { FNDashboard: true, dashboardAccessMode: 'standard', preloadPanels: false, lazy: true },
    { FNDashboard: true, dashboardAccessMode: 'custom', preloadPanels: true, lazy: true },
    { FNDashboard: false, dashboardAccessMode: 'standard', preloadPanels: true, lazy: true },
  ])('only preloads explicitly opted-in embedded standard dashboards: %j', async ({ lazy, ...fnState }) => {
    jest.mocked(LazyLoader).mockClear();
    setup(
      { editPanel: null, viewPanel: null, isEditable: false, dashboard: getTestDashboard() },
      { fnGlobalState: { ...INITIAL_FN_STATE, mode: GrafanaThemeType.Light, ...fnState } }
    );
    expect(await screen.findByText('My gauge')).toBeInTheDocument();
    expect(jest.mocked(LazyLoader).mock.calls.length).toBeGreaterThan(0);
    expect(jest.mocked(LazyLoader).mock.calls.every(([props]) => Boolean(props.preload) === !lazy)).toBe(true);
  });

  it.each([undefined, false, true])('passes preload=%s to the existing panel loading path', (preloadPanels) => {
    const dashboard = getTestDashboard();
    const grid = new Component({
      editPanel: null,
      viewPanel: null,
      isEditable: false,
      dashboard,
      preloadPanels,
    });
    const rendered = grid.renderPanel(getRequiredPanel(dashboard, 4), 800, 300, false);
    expect(rendered.props.preload).toBe(preloadPanels);
  });

  it('Should render panels', async () => {
    const props: Props = {
      editPanel: null,
      viewPanel: null,
      isEditable: true,
      dashboard: getTestDashboard(),
    };

    act(() => {
      setup(props);
    });

    expect(await screen.findByText('My graph')).toBeInTheDocument();
    expect(await screen.findByText('My table')).toBeInTheDocument();
    expect(await screen.findByText('My table 2')).toBeInTheDocument();
    expect(await screen.findByText('My gauge')).toBeInTheDocument();
  });

  it('Should render only the selected panel in embedded view-panel mode', async () => {
    const dashboard = getTestDashboard();
    const viewPanel = getRequiredPanel(dashboard, 2);
    dashboard.initViewPanel(viewPanel);

    const props: Props = {
      editPanel: null,
      viewPanel,
      isEditable: false,
      isFnDashboard: true,
      portalContainerID: 'grafana-portal',
      dashboard,
    };

    act(() => {
      setup(props);
    });

    expect(await screen.findByText('My table')).toBeInTheDocument();
    expect(screen.queryByText('My graph')).toBeNull();
    expect(screen.queryByText('My table 2')).toBeNull();
    expect(screen.queryByText('My gauge')).toBeNull();
  });

  it('Should normalize selected panel layout in embedded view-panel mode without changing the dashboard model', () => {
    const dashboard = getTestDashboard();
    const viewPanel = getRequiredPanel(dashboard, 2);
    const originalGridPos = { x: 12, y: 10, w: 12, h: 10 };
    viewPanel.gridPos = { ...originalGridPos };
    dashboard.initViewPanel(viewPanel);

    const props: Props = {
      editPanel: null,
      viewPanel,
      isEditable: false,
      isFnDashboard: true,
      portalContainerID: 'grafana-portal',
      dashboard,
    };

    const grid = new Component(props);
    const layout = grid.buildLayout();
    const panelLayout = layout[0]!;

    expect(layout).toHaveLength(1);
    expect(panelLayout).toEqual(
      expect.objectContaining({
        x: 0,
        y: 0,
        w: GRID_COLUMN_COUNT,
        h: originalGridPos.h,
      })
    );

    grid.onLayoutChange([{ ...panelLayout, x: 8, y: 5, w: 8, h: 8 }]);

    expect(viewPanel.gridPos).toEqual(originalGridPos);
  });

  it('Should measure embedded view-panel height below dashboard controls', () => {
    const dashboard = getTestDashboard();
    const viewPanel = getRequiredPanel(dashboard, 2);
    dashboard.initViewPanel(viewPanel);
    const portal = document.createElement('div');
    const gridWrapper = document.createElement('div');
    portal.id = 'grafana-portal';
    portal.appendChild(gridWrapper);
    document.body.appendChild(portal);

    jest.spyOn(portal, 'getBoundingClientRect').mockReturnValue(getRect({ bottom: 680, height: 575, top: 105 }));
    jest.spyOn(gridWrapper, 'getBoundingClientRect').mockReturnValue(getRect({ bottom: 541, height: 372, top: 169 }));

    const props: Props = {
      editPanel: null,
      viewPanel,
      isEditable: false,
      isFnDashboard: true,
      portalContainerID: portal.id,
      dashboard,
    };
    const grid = new Component(props);
    Object.defineProperty(grid, 'gridWrapperElement', {
      value: gridWrapper,
    });

    expect(grid.getEmbeddedViewPanelHeight()).toBe(680 - 169 - GRID_CELL_VMARGIN);

    portal.remove();
  });

  it('Should allow filtering panels', async () => {
    const props: Props = {
      editPanel: null,
      viewPanel: null,
      isEditable: true,
      dashboard: getTestDashboard(),
    };
    act(() => {
      setup(props);
    });

    act(() => {
      appEvents.publish(
        new VariablesChanged({
          panelIds: [],
          refreshAll: false,
          variable: {
            type: 'textbox',
            id: '1',
            current: {
              value: 'My graph',
            },
          } as TextBoxVariableModel,
        })
      );
    });
    const table = screen.queryByText('My table');
    const table2 = screen.queryByText('My table 2');
    const gauge = screen.queryByText('My gauge');

    expect(await screen.findByText('My graph')).toBeInTheDocument();
    expect(table).toBeNull();
    expect(table2).toBeNull();
    expect(gauge).toBeNull();
  });

  it('Should rendered filtered panels on init when filter variable is present', async () => {
    const props: Props = {
      editPanel: null,
      viewPanel: null,
      isEditable: true,
      dashboard: getTestDashboard(undefined, undefined, () => [
        {
          id: '1',
          type: 'textbox',
          query: 'My tab',
        } as TextBoxVariableModel,
      ]),
    };

    act(() => {
      setup(props);
    });

    const graph = screen.queryByText('My graph');
    const gauge = screen.queryByText('My gauge');

    expect(await screen.findByText('My table')).toBeInTheDocument();
    expect(await screen.findByText('My table 2')).toBeInTheDocument();
    expect(graph).toBeNull();
    expect(gauge).toBeNull();
  });
});

import { act, cleanup, render } from '@testing-library/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';

import { FnGlobalState, INITIAL_FN_STATE } from 'app/core/reducers/fn-slice';
import { createMfe } from 'app/fn-app/create-mfe';
import { FNDashboard } from 'app/fn-app/fn-dashboard-page/fn-dashboard';
import { mfeLocationService } from 'app/fn-app/fn-dashboard-page/render-fn-dashboard';
import { FNDashboardProps } from 'app/fn-app/types';
import { mfeDispatch, mfeGetStoreState, removeGrafanaStoreAndDashboard } from 'app/store/configureMfeStore';

import { UnthemedDashboardPage, Props } from './DashboardPage';

jest.unmock('@grafana/runtime');
jest.unmock('@grafana/data');
jest.unmock('@grafana/ui');

jest.mock('app/store/configureStore', () => {
  const { configureStore } = jest.requireActual<typeof import('@reduxjs/toolkit')>('@reduxjs/toolkit');
  const { fnSliceReducer } =
    jest.requireActual<typeof import('app/core/reducers/fn-slice')>('app/core/reducers/fn-slice');
  return {
    configureStore: (initial: { fnGlobalState: FnGlobalState }) =>
      configureStore({
        reducer: {
          fnGlobalState: fnSliceReducer,
          dashboard: (state = { getModel: () => null }, action: { type: string; model?: unknown }) =>
            action.type === 'test/result' ? { getModel: () => action.model } : state,
          appNotifications: (state = { byId: {} }) => state,
          navIndex: (state = {}) => state,
        },
        preloadedState: initial,
        middleware: (defaults) => defaults({ serializableCheck: false }),
      }),
  };
});
jest.mock('app/fn-app/fn-app-provider', () => ({
  FnAppProvider: ({ children, store }: { children: React.ReactNode; store: unknown }) => {
    const { Provider } = jest.requireActual('react-redux');
    return <Provider store={store}>{children}</Provider>;
  },
}));
jest.mock('app/fn_app', () => ({ __esModule: true, default: { init: jest.fn() } }));
jest.mock('app/core/services/backend_srv', () => ({ backendSrv: { cancelAllInFlightRequests: jest.fn() } }));
jest.mock('app/fn_logger', () => ({ FnLoggerService: { info: jest.fn(), error: jest.fn() } }));
jest.mock('app/features/query/state/DashboardQueryRunner/UnifiedAlertStatesWorker', () => ({}));
jest.mock('app/features/live/dashboard/dashboardWatcher', () => ({ dashboardWatcher: {} }));
jest.mock('app/features/scopes', () => ({}));
jest.mock('app/features/variables/state/actions', () => ({
  cancelVariables: jest.fn(),
  templateVarsChangedInUrl: jest.fn(),
}));
jest.mock('../state/actions', () => ({ cleanUpDashboardAndVariables: jest.fn() }));
jest.mock('../state/initDashboard', () => ({ initDashboard: jest.fn() }));
jest.mock('../components/AddWidgetModal/AddWidgetModal', () => ({ AddWidgetModal: () => null }));
jest.mock('../components/DashNav', () => ({ DashNav: () => null }));
jest.mock('../components/DashNav/DashNavTimeControls', () => ({ DashNavTimeControls: () => null }));
jest.mock('../components/DashboardPrompt/DashboardPrompt', () => ({ DashboardPrompt: () => null }));
jest.mock('../components/DashboardSettings', () => ({ DashboardSettings: () => null }));
jest.mock('../components/Inspector/PanelInspector', () => ({ PanelInspector: () => null }));
jest.mock('../components/PanelEditor/PanelEditor', () => ({ PanelEditor: () => null }));
jest.mock('../components/SubMenu/SubMenu', () => ({ SubMenu: () => null }));
jest.mock('../dashgrid/DashboardGrid', () => ({ DashboardGrid: () => null }));
jest.mock('../services/TimeSrv', () => ({ getTimeSrv: jest.fn() }));
jest.mock('../utils/panel', () => ({ calculateNewPanelGridPos: jest.fn() }));
jest.mock('app/core/components/Page/Page', () => ({
  Page: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('MFE loading callback lifecycle', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('keeps real MFE stores and shared location responsive through open, result, close and reopen', async () => {
    jest.spyOn(UnthemedDashboardPage.prototype, 'initDashboard').mockImplementation(() => {});
    jest.spyOn(UnthemedDashboardPage.prototype, 'closeDashboard').mockImplementation(() => {});
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const portals = ['qualityMetrics', 'commentDrillDown'].map((uid) => {
      const node = document.createElement('div');
      node.id = `${uid}-integration`;
      document.body.append(node);
      return node;
    });
    const update = createMfe.updateFnApp();
    const metadata = { teams: [], eventListener: null };
    let callbacks: [(loading: boolean) => void, (loading: boolean) => void];
    function Host() {
      const [parent, setParent] = useState(true);
      const [child, setChild] = useState(true);
      callbacks = [setParent, setChild];
      return (
        <>
          <output>{`${parent}/${child}`}</output>
          <FNDashboard
            name="integration"
            isLoading={() => {}}
            setErrors={() => {}}
            metadata={metadata}
            pageTitle="Integration"
          />
        </>
      );
    }
    const view = render(<Host />);
    const props = (uid: string, index: number): FNDashboardProps => ({
      ...INITIAL_FN_STATE,
      uid,
      name: 'integration',
      mode: 'light' as FNDashboardProps['mode'],
      portalContainerID: portals[index].id,
      metadata,
      isLoading: callbacks[index],
      setErrors: () => {},
      queryParams:
        index === 0 ? { from: 'now-30d', to: 'now' } : { from: 'now-30d', to: 'now', 'var-severity': 'critical' },
    });
    const result = { meta: {}, annotations: { list: [] }, links: [] };
    try {
      await act(async () => {
        await update(props('qualityMetrics', 0), window);
      });
      act(() => {
        mfeGetStoreState().fnGlobalReducer.grafanaStores.qualityMetrics.dispatch({
          type: 'test/result',
          model: result,
        });
      });
      await act(async () => {
        await update(props('commentDrillDown', 1), window);
      });
      expect(view.getByText('false/true')).toBeInTheDocument();
      expect(mfeLocationService.getLocation().search).toContain('var-severity=critical');
      expect(mfeGetStoreState().fnGlobalReducer.renderingDashboardUID).toBe('commentDrillDown');
      act(() => {
        mfeGetStoreState().fnGlobalReducer.grafanaStores.commentDrillDown.dispatch({
          type: 'test/result',
          model: result,
        });
      });
      expect(view.getByText('false/false')).toBeInTheDocument();
      await act(async () => {
        mfeDispatch(removeGrafanaStoreAndDashboard('commentDrillDown'));
        await update({ renderingDashboardUid: 'qualityMetrics' } as unknown as FNDashboardProps, window);
      });
      expect(mfeGetStoreState().fnGlobalReducer.renderingDashboardUID).toBe('qualityMetrics');
      await act(async () => {
        await update(props('commentDrillDown', 1), window);
      });
      expect(view.getByText('false/true')).toBeInTheDocument();
      expect(errors.mock.calls.flat().join(' ')).not.toMatch(/Cannot update a component|Maximum update depth/);
    } finally {
      view.unmount();
      for (const uid of ['qualityMetrics', 'commentDrillDown']) {
        mfeDispatch(removeGrafanaStoreAndDashboard(uid));
      }
      portals.forEach((node) => node.remove());
    }
  });

  it('settles independent host loading state for two real dashboard pages and a completed drill-down', () => {
    // Fixtures supply query results; keep the real render and commit callbacks.
    jest.spyOn(UnthemedDashboardPage.prototype, 'initDashboard').mockImplementation(() => {});
    jest.spyOn(UnthemedDashboardPage.prototype, 'closeDashboard').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const parentPortal = document.createElement('div');
    const detailPortal = document.createElement('div');
    document.body.append(parentPortal, detailPortal);
    // Only rendering metadata is exercised; initialization and data fetching are stubbed.
    const dashboard = { meta: {}, annotations: { list: [] }, links: [] } as unknown as Props['dashboard'];
    const queryParams = {};
    let complete: () => void = () => {};
    function Host() {
      const [parentLoading, parentIsLoading] = useState(true);
      const [detailLoading, detailIsLoading] = useState(true);
      const [detailReady, setDetailReady] = useState(false);
      complete = () => setDetailReady(true);
      const common = { FNDashboard: true, queryParams, location: { search: '' }, match: { params: {} } } as Props;
      return (
        <>
          <output>{`${parentLoading}/${detailLoading}`}</output>
          {createPortal(
            <UnthemedDashboardPage {...common} dashboard={dashboard} isLoading={parentIsLoading} />,
            parentPortal
          )}
          {createPortal(
            <UnthemedDashboardPage
              {...common}
              dashboard={detailReady ? dashboard : null}
              isLoading={detailIsLoading}
            />,
            detailPortal
          )}
        </>
      );
    }
    const view = render(<Host />);
    expect(view.getByText('false/true')).toBeInTheDocument();
    act(complete);
    expect(view.getByText('false/false')).toBeInTheDocument();
    expect(error.mock.calls.flat().join(' ')).not.toMatch(/Cannot update a component|Maximum update depth/);
    view.unmount();
    parentPortal.remove();
    detailPortal.remove();
  });
  it.each([null, { meta: {}, annotations: { list: [] }, links: [] }])(
    'does not update the host during render (%s)',
    (dashboard) => {
      const isLoading = jest.fn();
      const page = new UnthemedDashboardPage({
        FNDashboard: true,
        queryParams: {},
        isLoading,
        dashboard,
      } as unknown as Props);

      page.render();

      expect(isLoading).not.toHaveBeenCalled();
    }
  );
});

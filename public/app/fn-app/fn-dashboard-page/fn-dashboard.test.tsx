import { act, cleanup, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { locationService } from '@grafana/runtime';
import { INITIAL_FN_STATE } from 'app/core/reducers/fn-slice';
import { DashNavTimeControls } from 'app/features/dashboard/components/DashNav/DashNavTimeControls';
import { getDashboardSrv } from 'app/features/dashboard/services/DashboardSrv';
import { getTimeSrv } from 'app/features/dashboard/services/TimeSrv';
import { DashboardModel } from 'app/features/dashboard/state/DashboardModel';
import { TimeModel } from 'app/features/dashboard/state/TimeModel';
import {
  mfeDispatch,
  mfeGetStoreState,
  mfeStore,
  removeGrafanaStoreAndDashboard,
  updatePartialMfeStates,
  updateRenderingDashboardUID,
} from 'app/store/configureMfeStore';

import { FNDashboard } from './fn-dashboard';

jest.unmock('@grafana/runtime');
jest.unmock('@grafana/data');

jest.mock('app/features/dashboard/services/DashboardSrv', () => {
  let dashboard: unknown;
  const service = {
    getCurrent: () => dashboard,
    setCurrent: (model: unknown) => {
      dashboard = model;
    },
  };
  return { getDashboardSrv: () => service };
});

jest.mock('app/store/configureStore', () => {
  const { configureStore } = jest.requireActual<typeof import('@reduxjs/toolkit')>('@reduxjs/toolkit');
  const { fnSliceReducer } = jest.requireActual('app/core/reducers/fn-slice');
  return {
    configureStore: () =>
      configureStore({
        reducer: {
          fnGlobalState: fnSliceReducer,
          dashboard: (state = { getModel: () => null }, action: { type: string; model?: unknown }) =>
            action.type === 'test/model' ? { getModel: () => action.model } : state,
        },
        // Keep mutation detection, but do not turn machine contention into a
        // lifecycle test failure through Redux's development timing warning.
        middleware: (defaults) =>
          defaults({ serializableCheck: false, immutableCheck: { warnAfter: Number.POSITIVE_INFINITY } }),
      }),
  };
});
jest.mock('../fn-app-provider', () => ({
  FnAppProvider: ({ children, store }: PropsWithChildren<{ store: unknown }>) => {
    const { Provider } = jest.requireActual('react-redux');
    return <Provider store={store}>{children}</Provider>;
  },
}));
jest.mock('./render-fn-dashboard', () => {
  const { useSelector } = jest.requireActual('react-redux');
  const { Component } = jest.requireActual<typeof import('react')>('react');
  const { getTimeSrv } = jest.requireActual('app/features/dashboard/services/TimeSrv');
  const { getDashboardSrv } = jest.requireMock('app/features/dashboard/services/DashboardSrv');
  // Keep DashboardPage's class mount/unmount timing and cleanup order while
  // omitting its unrelated data loading and panel rendering.
  class DashboardLifecycle extends Component<{ model: TimeModel & { destroy: jest.Mock } }> {
    componentDidMount() {
      getTimeSrv().init(this.props.model);
      getDashboardSrv().setCurrent(this.props.model);
    }
    componentWillUnmount() {
      this.props.model.destroy();
      getTimeSrv().stopAutoRefresh();
      getDashboardSrv().setCurrent(undefined);
    }
    render() {
      return null;
    }
  }
  return {
    RenderFNDashboard: ({ uid }: { uid: string }) => {
      const model = useSelector(
        (state: { dashboard: { getModel: () => (TimeModel & { destroy: jest.Mock }) | null } }) =>
          state.dashboard.getModel()
      );
      // Subscribe to the dashboard-local store like the real DashboardPage.
      // This makes React report any store update dispatched while its parent
      // DashboardPortal is still rendering another portal.
      useSelector((state: { fnGlobalState: { uid: string } }) => state.fnGlobalState);
      return <div data-testid={`dashboard-${uid}`}>{model && <DashboardLifecycle model={model} />}</div>;
    },
  };
});
jest.mock('app/fn_logger', () => ({ FnLoggerService: { info: jest.fn(), error: jest.fn() } }));

describe('FNDashboard', () => {
  const dashboardUIDs = ['quality-metrics', 'comment-drill-down'];

  beforeEach(() => {
    locationService.partial({ from: 'now-30d', to: 'now', 'var-severity': undefined });
    mountDashboard(dashboardUIDs[0]);
    mfeDispatch(updateRenderingDashboardUID(dashboardUIDs[0]));
  });

  afterEach(() => {
    cleanup();
    act(() => {
      for (const uid of dashboardUIDs) {
        mfeDispatch(removeGrafanaStoreAndDashboard(uid));
        document.getElementById(`${uid}-portal`)?.remove();
      }
      mfeDispatch(updateRenderingDashboardUID(''));
    });
    jest.restoreAllMocks();
  });

  it('renders two dashboard portals without repeatedly changing their global owner', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    render(
      <FNDashboard
        name="dashboard"
        isLoading={jest.fn()}
        pageTitle="Dashboard"
        setErrors={jest.fn()}
        metadata={{ teams: [], eventListener: null }}
        fnError={null}
      />
    );
    const dispatch = jest.spyOn(mfeStore, 'dispatch');

    act(() => mountDashboard(dashboardUIDs[1]));

    expect(screen.getByTestId('dashboard-quality-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-comment-drill-down')).toBeInTheDocument();
    expect(mfeGetStoreState().fnGlobalReducer.renderingDashboardUID).toBe('comment-drill-down');
    expect(dispatch.mock.calls.filter(([action]) => action.type.endsWith('/updateRenderingDashboardUID'))).toHaveLength(
      1
    );
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('Cannot update a component');
  });

  it('restores the preserved parent time owner after drawer removal without refreshing it', () => {
    const parent = makeModel();
    mfeGetStoreState().fnGlobalReducer.grafanaStores[dashboardUIDs[0]].dispatch({ type: 'test/model', model: parent });
    const props = {
      name: 'dashboard',
      isLoading: jest.fn(),
      pageTitle: 'Dashboard',
      setErrors: jest.fn(),
      metadata: { teams: [], eventListener: null },
      fnError: null,
    };
    const view = render(<FNDashboard {...props} />);
    const timeSrv = getTimeSrv();
    const controls = new DashNavTimeControls({
      dashboard: parent as unknown as DashboardModel,
      onChangeTimeZone: jest.fn(),
    });
    controls.onChangeTimePicker({ ...timeSrv.timeRange(), raw: { from: 'now-7d', to: 'now' } });
    expect(parent.timeRangeUpdated).toHaveBeenCalledTimes(1);
    const drawer = makeModel();
    act(() => {
      mountDashboard(dashboardUIDs[1]);
      mfeGetStoreState().fnGlobalReducer.grafanaStores[dashboardUIDs[1]].dispatch({
        type: 'test/model',
        model: drawer,
      });
    });
    expect(timeSrv.timeModel).toBe(drawer);
    locationService.partial({ 'var-severity': 'critical' });
    act(() => {
      document.getElementById(`${dashboardUIDs[1]}-portal`)!.remove();
      view.rerender(<FNDashboard {...props} />);
    });
    expect(drawer.destroy).toHaveBeenCalledTimes(1);
    expect(timeSrv.timeModel).toBe(parent);
    expect(timeSrv.timeRange().raw).toEqual({ from: 'now-7d', to: 'now' });
    expect(getDashboardSrv().getCurrent()).toBe(parent);
    expect(parent.timeRangeUpdated).toHaveBeenCalledTimes(1);
    controls.onChangeTimePicker({ ...timeSrv.timeRange(), raw: { from: 'now-2d', to: 'now' } });
    controls.onRefresh();
    expect(parent.timeRangeUpdated).toHaveBeenCalledTimes(3);
    expect(drawer.timeRangeUpdated).not.toHaveBeenCalled();
    const init = jest.spyOn(timeSrv, 'init');
    view.rerender(<FNDashboard {...props} />);
    expect(init).not.toHaveBeenCalled();
    expect(parent.destroy).not.toHaveBeenCalled();
  });

  it('applies late preload updates only to the matching dashboard store', () => {
    const props = {
      name: 'dashboard',
      uid: dashboardUIDs[0],
      isLoading: jest.fn(),
      pageTitle: 'Dashboard',
      setErrors: jest.fn(),
      metadata: { teams: [], eventListener: null },
      fnError: null,
      preloadPanels: false,
    };
    const view = render(<FNDashboard {...props} />);
    act(() => mountDashboard(dashboardUIDs[1]));
    const state = (uid: string) => mfeGetStoreState().fnGlobalReducer.grafanaStores[uid].getState().fnGlobalState;
    const parent = screen.getByTestId('dashboard-quality-metrics');
    expect(state(dashboardUIDs[0]).preloadPanels).toBe(false);
    view.rerender(<FNDashboard {...{ ...props, preloadPanels: true }} />);
    expect(state(dashboardUIDs[0]).preloadPanels).toBe(true);
    expect(state(dashboardUIDs[1]).preloadPanels).toBe(false);
    view.rerender(<FNDashboard {...props} />);
    expect(state(dashboardUIDs[0]).preloadPanels).toBe(false);
    expect(screen.getByTestId('dashboard-quality-metrics')).toBe(parent);
  });

  function makeModel(): TimeModel & { destroy: jest.Mock } {
    return {
      time: { from: 'now-30d', to: 'now' },
      getTimezone: () => 'browser',
      refresh: '',
      timepicker: {},
      timeRangeUpdated: jest.fn(),
      destroy: jest.fn(),
    };
  }

  function mountDashboard(uid: string) {
    const container = document.createElement('div');
    container.id = `${uid}-portal`;
    document.body.append(container);
    mfeDispatch(
      updatePartialMfeStates({
        ...INITIAL_FN_STATE,
        uid,
        portalContainerID: container.id,
      })
    );
  }
});

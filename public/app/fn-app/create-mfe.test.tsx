import { act } from '@testing-library/react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { GrafanaThemeType } from '@grafana/data';
import config from 'app/core/config';
import { INITIAL_FN_STATE, nextFnRefreshRevision } from 'app/core/reducers/fn-slice';
import {
  mfeDispatch,
  mfeGetStoreState,
  updatePartialMfeStates,
  updateRenderingDashboardUID,
} from 'app/store/configureMfeStore';

import { createMfe } from './create-mfe';
import { FNDashboardProps } from './types';

jest.mock('app/fn_app', () => ({ __esModule: true, default: { init: jest.fn() } }));
jest.mock('app/core/services/backend_srv', () => ({ backendSrv: { cancelAllInFlightRequests: jest.fn() } }));
jest.mock('app/fn_logger', () => ({ FnLoggerService: { info: jest.fn(), error: jest.fn() } }));
jest.mock('app/store/configureMfeStore', () => ({
  mfeDispatch: jest.fn(),
  mfeGetStoreState: jest.fn(() => ({
    fnGlobalReducer: { dashboards: {}, grafanaStores: {}, mode: 'light', renderingDashboardUID: '' },
  })),
  updatePartialMfeStates: jest.fn(),
  updateRenderingDashboardUID: jest.fn(),
}));

describe('MFE dashboard refresh updates', () => {
  const update = createMfe.updateFnApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes only the owning dashboard for a higher revision', async () => {
    const summary = dashboardFixture('summary');
    const details = dashboardFixture('details');
    mockMfeState({ summary: 4, details: 9 }, { summary, details }, 'details');

    await update({ ...INITIAL_FN_STATE, uid: 'summary', refreshRevision: 5 } as FNDashboardProps, window);

    expect(updatePartialMfeStates).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'summary', refreshRevision: 5 })
    );
    expect(summary.timeRangeUpdated).toHaveBeenCalledTimes(1);
    expect(details.timeRangeUpdated).not.toHaveBeenCalled();
    expect(updateRenderingDashboardUID).toHaveBeenNthCalledWith(1, 'summary');
    expect(updateRenderingDashboardUID).toHaveBeenNthCalledWith(2, 'details');
  });

  it('treats the first revision after omission as one refresh', async () => {
    const summary = dashboardFixture('summary');
    mockMfeState({}, { summary }, 'summary');

    await update({ ...INITIAL_FN_STATE, uid: 'summary', refreshRevision: 1 } as FNDashboardProps, window);

    expect(summary.timeRangeUpdated).toHaveBeenCalledTimes(1);
  });

  it('does not refresh for the same or a lower revision', async () => {
    const summary = dashboardFixture('summary');
    mockMfeState({ summary: 5 }, { summary }, 'summary');

    await update({ ...INITIAL_FN_STATE, uid: 'summary', refreshRevision: 5 } as FNDashboardProps, window);
    await update({ ...INITIAL_FN_STATE, uid: 'summary', refreshRevision: 4 } as FNDashboardProps, window);

    expect(summary.timeRangeUpdated).not.toHaveBeenCalled();
    expect(nextFnRefreshRevision(5, 4)).toBe(5);
  });

  it('rejects a refresh when the requested uid does not own the dashboard model', async () => {
    const details = dashboardFixture('details');
    mockMfeState({ summary: 1 }, { summary: details }, 'details');

    await expect(
      update({ ...INITIAL_FN_STATE, uid: 'summary', refreshRevision: 2 } as FNDashboardProps, window)
    ).rejects.toThrow('the owning model is not mounted');

    expect(details.timeRangeUpdated).not.toHaveBeenCalled();
  });

  it('restores the prior owner before awaiting the target variable refresh', async () => {
    let finishVariables!: () => void;
    const variablesUpdated = new Promise<void>((resolve) => {
      finishVariables = resolve;
    });
    const summary = dashboardFixture('summary');
    summary.timeRangeUpdated.mockReturnValue(variablesUpdated);
    mockMfeState({ summary: 1 }, { summary }, 'details');

    const refreshing = update({ ...INITIAL_FN_STATE, uid: 'summary', refreshRevision: 2 } as FNDashboardProps, window);
    await Promise.resolve();

    expect(updateRenderingDashboardUID).toHaveBeenNthCalledWith(1, 'summary');
    expect(updateRenderingDashboardUID).toHaveBeenNthCalledWith(2, 'details');
    let settled = false;
    void refreshing.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    finishVariables();
    await refreshing;
  });

  it('does not refresh either dashboard when a uid update omits the revision', async () => {
    const summary = dashboardFixture('summary');
    const details = dashboardFixture('details');
    mockMfeState({ summary: 3, details: 0 }, { summary, details }, 'summary');

    await update({ ...INITIAL_FN_STATE, uid: 'details', refreshRevision: undefined } as FNDashboardProps, window);

    expect(summary.timeRangeUpdated).not.toHaveBeenCalled();
    expect(details.timeRangeUpdated).not.toHaveBeenCalled();
  });

  function dashboardFixture(uid: string) {
    return {
      fiscalYearStartMonth: 0,
      getTimezone: jest.fn(() => 'utc'),
      time: { from: 'now-30d', to: 'now' },
      timeRangeUpdated: jest.fn(),
      uid,
    };
  }

  function mockMfeState(
    revisions: Record<string, number>,
    dashboards: Record<string, ReturnType<typeof dashboardFixture>>,
    renderingDashboardUID: string
  ) {
    jest.mocked(mfeGetStoreState).mockReturnValue({
      fnGlobalReducer: {
        dashboards: Object.fromEntries(
          Object.entries(revisions).map(([uid, refreshRevision]) => [uid, { refreshRevision }])
        ),
        grafanaStores: Object.fromEntries(
          Object.entries(dashboards).map(([uid, dashboard]) => [
            uid,
            { getState: () => ({ dashboard: { getModel: () => dashboard } }) },
          ])
        ),
        mode: 'light',
        renderingDashboardUID,
      },
    } as unknown as ReturnType<typeof mfeGetStoreState>);
  }
});

describe('MFE React root ownership', () => {
  it('unmounts external dashboard and controls portals before a replacement mount', async () => {
    const host = document.createElement('div');
    host.innerHTML = '<div id="grafanaRoot"></div>';
    const dashboard = document.createElement('div');
    const controls = document.createElement('div');
    document.body.append(host, dashboard, controls);
    const cleanup = jest.fn();
    const Component = () => {
      useEffect(() => cleanup, []);
      return (
        <>
          {createPortal(<div data-testid="dashboard" />, dashboard)}
          {createPortal(<button>Refresh</button>, controls)}
        </>
      );
    };
    const props: FNDashboardProps = {
      ...INITIAL_FN_STATE,
      name: 'test',
      container: host,
      mode: GrafanaThemeType.Light,
      refreshRevision: 42,
      isLoading: jest.fn(),
      setErrors: jest.fn(),
    };
    config.bootData.themePaths = { light: '/light.css', dark: '/dark.css' };
    const mount = createMfe.mountFnApp(Component);
    const unmount = createMfe.unMountFnApp();
    try {
      await act(async () => {
        await mount(props, window);
      });
      expect(updateRenderingDashboardUID).not.toHaveBeenCalled();
      expect(dashboard.children).toHaveLength(1);
      expect(controls.children).toHaveLength(1);
      const stylesheetCount = document.querySelectorAll('link[rel="stylesheet"]').length;
      const dispatchCount = jest.mocked(mfeDispatch).mock.calls.length;
      await expect(mount(props, window)).rejects.toThrow('Grafana root is already mounted');
      expect(document.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(stylesheetCount);
      expect(mfeDispatch).toHaveBeenCalledTimes(dispatchCount);
      expect(dashboard.children).toHaveLength(1);
      expect(controls.children).toHaveLength(1);
      await act(async () => {
        await unmount(props, window);
      });
      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(dashboard.children).toHaveLength(0);
      expect(controls.children).toHaveLength(0);
      await act(async () => {
        await mount(props, window);
      });
      expect(dashboard.children).toHaveLength(1);
      expect(controls.children).toHaveLength(1);
      await act(async () => {
        await unmount(props, window);
      });
      expect(cleanup).toHaveBeenCalledTimes(2);
    } finally {
      host.remove();
      dashboard.remove();
      controls.remove();
    }
  });
});

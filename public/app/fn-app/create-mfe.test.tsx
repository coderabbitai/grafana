import { act, waitFor } from '@testing-library/react';
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

  it('restores the parent dashboard owner as a string when the host closes a drill-down', async () => {
    await update({ renderingDashboardUid: 'qualityMetrics' } as unknown as FNDashboardProps, window);

    expect(updateRenderingDashboardUID).toHaveBeenCalledWith('qualityMetrics');
  });

  it('refreshes only the owning dashboard for a higher revision', async () => {
    const summary = dashboardFixture('summary');
    const details = dashboardFixture('details');
    mockMfeState({ summary: 4, details: 9 }, { summary, details }, 'details');

    await update({ ...INITIAL_FN_STATE, uid: 'summary', refreshRevision: 5 } as FNDashboardProps, window);

    await waitFor(() =>
      expect(updatePartialMfeStates).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'summary', refreshRevision: 5 })
      )
    );
    expect(summary.timeRangeUpdated).toHaveBeenCalledTimes(1);
    expect(details.timeRangeUpdated).not.toHaveBeenCalled();
    expect(updateRenderingDashboardUID).toHaveBeenNthCalledWith(1, 'summary');
    expect(updateRenderingDashboardUID).toHaveBeenNthCalledWith(2, 'details');
  });

  it('resolves the update lifecycle while variables refresh and allows the next dashboard update', async () => {
    const variablesUpdated = deferred();
    const listener = jest.fn();
    const summary = dashboardFixture('summary');
    const details = dashboardFixture('details');
    summary.timeRangeUpdated.mockReturnValue(variablesUpdated.promise);
    mockMfeState({ summary: 1, details: 0 }, { summary, details }, 'summary');

    await expect(update(refreshProps('summary', 2, listener), window)).resolves.toBe(true);
    await expect(
      update({ ...INITIAL_FN_STATE, uid: 'details', refreshRevision: undefined } as FNDashboardProps, window)
    ).resolves.toBe(true);

    expect(updatePartialMfeStates).toHaveBeenCalledWith(expect.objectContaining({ uid: 'details' }));
    expect(listener).not.toHaveBeenCalled();

    variablesUpdated.resolve();
    await waitFor(() =>
      expect(listener).toHaveBeenCalledWith({
        type: 'dashboardRefreshCompleted',
        data: { uid: 'summary', refreshRevision: 2, success: true },
      })
    );
  });

  it('acknowledges an asynchronous refresh failure without consuming its revision', async () => {
    const listener = jest.fn();
    const summary = dashboardFixture('summary');
    summary.timeRangeUpdated.mockRejectedValue(new Error('variable query failed'));
    mockMfeState({ summary: 1 }, { summary }, 'summary');

    await expect(update(refreshProps('summary', 2, listener), window)).resolves.toBe(true);

    await waitFor(() =>
      expect(listener).toHaveBeenCalledWith({
        type: 'dashboardRefreshCompleted',
        data: { uid: 'summary', refreshRevision: 2, success: false },
      })
    );
    expect(updatePartialMfeStates).not.toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'summary', refreshRevision: 2 })
    );
  });

  it('deduplicates an in-flight dashboard revision', async () => {
    const variablesUpdated = deferred();
    const listener = jest.fn();
    const summary = dashboardFixture('summary');
    summary.timeRangeUpdated.mockReturnValue(variablesUpdated.promise);
    mockMfeState({ summary: 1 }, { summary }, 'summary');

    await update(refreshProps('summary', 2, listener), window);
    await update(refreshProps('summary', 2, listener), window);

    expect(summary.timeRangeUpdated).toHaveBeenCalledTimes(1);
    variablesUpdated.resolve();
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
  });

  it('does not let a late older completion regress the stored revision', async () => {
    const revisionTwo = deferred();
    const revisionThree = deferred();
    const listener = jest.fn();
    const summary = dashboardFixture('summary');
    summary.timeRangeUpdated.mockReturnValueOnce(revisionTwo.promise).mockReturnValueOnce(revisionThree.promise);
    const state = mockMfeState({ summary: 1 }, { summary }, 'summary');

    await update(refreshProps('summary', 2, listener), window);
    await update(refreshProps('summary', 3, listener), window);
    revisionThree.resolve();
    await waitFor(() => expect(state.fnGlobalReducer.dashboards.summary?.refreshRevision).toBe(3));
    revisionTwo.resolve();
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(2));

    expect(state.fnGlobalReducer.dashboards.summary?.refreshRevision).toBe(3);
    expect(updatePartialMfeStates).not.toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'summary', refreshRevision: 2 })
    );
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

  it('acknowledges failure when the requested uid does not own the dashboard model', async () => {
    const listener = jest.fn();
    const details = dashboardFixture('details');
    mockMfeState({ summary: 1 }, { summary: details }, 'details');

    await expect(update(refreshProps('summary', 2, listener), window)).resolves.toBe(true);
    await waitFor(() =>
      expect(listener).toHaveBeenCalledWith({
        type: 'dashboardRefreshCompleted',
        data: { uid: 'summary', refreshRevision: 2, success: false },
      })
    );

    expect(details.timeRangeUpdated).not.toHaveBeenCalled();
    expect(updatePartialMfeStates).not.toHaveBeenCalledWith(expect.objectContaining({ refreshRevision: 2 }));
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5])(
    'rejects invalid refresh revision %s without consuming it',
    async (refreshRevision) => {
      await expect(
        update({ ...INITIAL_FN_STATE, uid: 'summary', refreshRevision } as FNDashboardProps, window)
      ).rejects.toThrow('refreshRevision must be a non-negative safe integer');

      expect(updatePartialMfeStates).not.toHaveBeenCalled();
    }
  );

  it('rejects a refresh revision without a dashboard uid', async () => {
    await expect(
      update({ ...INITIAL_FN_STATE, uid: '', refreshRevision: 1 } as FNDashboardProps, window)
    ).rejects.toThrow('A dashboard uid is required when requesting a refresh');

    expect(updatePartialMfeStates).not.toHaveBeenCalled();
  });

  it('keeps legacy refresh updates pending and restores their prior owner', async () => {
    const variablesUpdated = deferred();
    const listener = jest.fn();
    const summary = dashboardFixture('summary');
    summary.timeRangeUpdated.mockReturnValue(variablesUpdated.promise);
    mockMfeState({ summary: 1 }, { summary }, 'details');

    const { refreshCompletionMode: _, ...legacyRefreshProps } = refreshProps('summary', 2, listener);
    const refreshing = update(legacyRefreshProps, window);
    let settled = false;
    void refreshing.then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(updateRenderingDashboardUID).toHaveBeenNthCalledWith(1, 'summary');
    expect(updateRenderingDashboardUID).toHaveBeenNthCalledWith(2, 'details');
    expect(settled).toBe(false);

    variablesUpdated.resolve();
    await expect(refreshing).resolves.toBe(true);
    expect(updatePartialMfeStates).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'summary', refreshRevision: 2 })
    );
    expect(listener).not.toHaveBeenCalled();
  });

  it('drops refresh completions after the MFE unmounts', async () => {
    const variablesUpdated = deferred();
    const listener = jest.fn();
    const summary = dashboardFixture('summary');
    summary.timeRangeUpdated.mockReturnValue(variablesUpdated.promise);
    mockMfeState({ summary: 1 }, { summary }, 'summary');

    await update(refreshProps('summary', 2, listener), window);
    await createMfe.unMountFnApp()(
      { ...refreshProps('summary', 2, listener), container: document.createElement('div') },
      window
    );
    variablesUpdated.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
    expect(updatePartialMfeStates).not.toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'summary', refreshRevision: 2 })
    );
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

  function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  }

  function refreshProps(uid: string, refreshRevision: number, eventListener: jest.Mock): FNDashboardProps {
    return {
      ...INITIAL_FN_STATE,
      name: 'test',
      uid,
      refreshRevision,
      refreshCompletionMode: 'event' as const,
      metadata: { teams: [], eventListener },
      isLoading: jest.fn(),
      setErrors: jest.fn(),
      mode: GrafanaThemeType.Light,
    };
  }

  function mockMfeState(
    revisions: Record<string, number>,
    dashboards: Record<string, ReturnType<typeof dashboardFixture>>,
    renderingDashboardUID: string
  ) {
    const state = {
      fnGlobalReducer: {
        dashboards: Object.fromEntries(
          Object.entries(revisions).map(([uid, refreshRevision]) => [
            uid,
            { ...INITIAL_FN_STATE, uid, refreshRevision },
          ])
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
    } as unknown as ReturnType<typeof mfeGetStoreState>;
    jest.mocked(mfeGetStoreState).mockReturnValue(state);
    jest.mocked(updatePartialMfeStates).mockImplementation((payload) => {
      const dashboard = state.fnGlobalReducer.dashboards[payload.uid];
      if (dashboard && payload.refreshRevision !== undefined) {
        dashboard.refreshRevision = nextFnRefreshRevision(dashboard.refreshRevision, payload.refreshRevision);
      }
      return payload as never;
    });
    return state;
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

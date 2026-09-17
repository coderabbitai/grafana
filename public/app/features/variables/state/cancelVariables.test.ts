import { lastValueFrom, Subject } from 'rxjs';

import { BackendSrv } from 'app/core/services/backend_srv';
import { StoreState } from 'app/types';

import { setVariableQueryRunner, VariableQueryRunner } from '../query/VariableQueryRunner';
import { queryBuilder } from '../shared/testing/builders';
import { toKeyedVariableIdentifier } from '../utils';

import { cancelVariables } from './actions';
import { getPreloadedState } from './helpers';

// Exercise the real cancellation thunk and HTTP transport without initializing
// unrelated dashboard scenes or the application-wide Redux store.
jest.mock('app/store/store', () => ({ dispatch: jest.fn(), getState: jest.fn() }));
jest.mock('app/features/dashboard/services/TimeSrv', () => ({ getTimeSrv: jest.fn() }));
jest.mock('app/features/dashboard/state/DashboardMigrator', () => ({
  DashboardMigrator: jest.fn().mockImplementation(() => ({ updateSchema: jest.fn() })),
}));
jest.mock('@grafana/scenes', () => {
  const actual = jest.requireActual('@grafana/scenes');
  class SceneBase {}
  return {
    ...actual,
    SceneDataLayerBase: actual.SceneDataLayerBase ?? SceneBase,
    SceneDataLayerSetBase: actual.SceneDataLayerSetBase ?? SceneBase,
    SceneObjectBase: actual.SceneObjectBase ?? SceneBase,
  };
});

it('does not abort an active parent HTTP query when child MFE variables are cleaned up', async () => {
  const response = new Subject<Response>();
  const backend = new BackendSrv({
    fromFetch: jest.fn().mockReturnValue(response),
    appEvents: { emit: jest.fn(), publish: jest.fn() } as never,
    contextSrv: { user: { isSignedIn: true, orgId: 1 } } as never,
    logout: jest.fn(),
  });
  const globalCancel = jest.spyOn(backend, 'cancelAllInFlightRequests');
  const runner = new VariableQueryRunner();
  const cancelRequest = jest.spyOn(runner, 'cancelRequest');
  setVariableQueryRunner(runner);
  const child = queryBuilder().withId('repo').withRootStateKey('child').build();
  const state = {
    ...getPreloadedState('child', { variables: { repo: child } }),
    fnGlobalState: { FNDashboard: true },
  } as StoreState;
  const pending = lastValueFrom(backend.fetch({ url: '/api/ds/query', requestId: 'parent-panel' })).then(
    (result) => result.data,
    (error) => error
  );

  cancelVariables('child', { getBackendSrv: () => backend })(jest.fn(), () => state, undefined);
  response.next({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    text: async () => JSON.stringify({ rows: [78.4] }),
  } as Response);
  response.complete();

  await expect(pending).resolves.toEqual({ rows: [78.4] });
  expect(globalCancel).not.toHaveBeenCalled();
  expect(cancelRequest).toHaveBeenCalledWith(toKeyedVariableIdentifier(child));
  runner.destroy();
});

it('preserves global cancellation for a native dashboard', () => {
  const backend = new BackendSrv();
  const globalCancel = jest.spyOn(backend, 'cancelAllInFlightRequests');
  const state = getPreloadedState('native', {}) as StoreState;
  cancelVariables('native', { getBackendSrv: () => backend })(jest.fn(), () => state, undefined);
  expect(globalCancel).toHaveBeenCalledTimes(1);
});

import { act, cleanup, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { INITIAL_FN_STATE } from 'app/core/reducers/fn-slice';
import {
  mfeDispatch,
  mfeGetStoreState,
  mfeStore,
  removeGrafanaStoreAndDashboard,
  updatePartialMfeStates,
  updateRenderingDashboardUID,
} from 'app/store/configureMfeStore';

import { FNDashboard } from './fn-dashboard';

jest.mock('app/store/configureStore', () => {
  const { configureStore } = jest.requireActual('@reduxjs/toolkit');
  const { fnSliceReducer } = jest.requireActual('app/core/reducers/fn-slice');
  return {
    configureStore: () => configureStore({ reducer: { fnGlobalState: fnSliceReducer } }),
  };
});
jest.mock('../fn-app-provider', () => ({
  FnAppProvider: ({ children }: PropsWithChildren) => children,
}));
jest.mock('./render-fn-dashboard', () => ({
  RenderFNDashboard: ({ uid }: { uid: string }) => <div data-testid={`dashboard-${uid}`} />,
}));
jest.mock('app/fn_logger', () => ({ FnLoggerService: { info: jest.fn(), error: jest.fn() } }));

describe('FNDashboard', () => {
  const dashboardUIDs = ['quality-metrics', 'comment-drill-down'];

  beforeEach(() => {
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
  });

  it('renders two dashboard portals without repeatedly changing their global owner', () => {
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
  });

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

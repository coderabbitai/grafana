import {
  configureStore as reduxConfigureStore,
  EnhancedStore,
  MiddlewareArray,
  PreloadedState,
} from '@reduxjs/toolkit';
import { AnyAction, CombinedState } from 'redux';
import { ThunkMiddleware } from 'redux-thunk';

import { publicDashboardApi } from 'app/features/dashboard/api/publicDashboardApi';
import { StoreState } from 'app/types/store';

import { buildInitialState } from '../core/reducers/navModel';
import { addReducer, createRootReducer } from '../core/reducers/root';
import { alertingApi } from '../features/alerting/unified/api/alertingApi';

import { setStore } from './store';

export type ConfiguredStore = EnhancedStore<
  CombinedState<StoreState>,
  AnyAction,
  MiddlewareArray<[ThunkMiddleware<CombinedState<StoreState>, AnyAction>]>
>;

export function addRootReducer(reducers: any) {
  // this is ok now because we add reducers before configureStore is called
  // in the future if we want to add reducers during runtime
  // we'll have to solve this in a more dynamic way
  addReducer(reducers);
}

export function configureStore<I extends Partial<PreloadedState<StoreState>>>(initialState?: I | Promise<I>) {
  const store = reduxConfigureStore({
    reducer: createRootReducer(),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: true, serializableCheck: false, immutableCheck: false }).concat(
        alertingApi.middleware,
        publicDashboardApi.middleware
      ),
    devTools: process.env.NODE_ENV !== 'production',
    preloadedState: {
      navIndex: buildInitialState(),
      ...initialState,
    },
  });

  setStore(store);
  return store;
}

export type RootState = ReturnType<ReturnType<typeof configureStore>['getState']>;
export type AppDispatch = ReturnType<typeof configureStore>['dispatch'];

/*
function getActionsToIgnoreSerializableCheckOn() {
  return [
    'dashboard/setPanelAngularComponent',
    'dashboard/panelModelAndPluginReady',
    'dashboard/dashboardInitCompleted',
    'plugins/panelPluginLoaded',
    'explore/initializeExplore',
    'explore/changeRange',
    'explore/updateDatasourceInstance',
    'explore/queryStoreSubscription',
    'explore/queryStreamUpdated',
  ];
}

function getPathsToIgnoreMutationAndSerializableCheckOn() {
  return [
    'plugins.panels',
    'dashboard.panels',
    'dashboard.getModel',
    'payload.plugin',
    'panelEditorNew.getPanel',
    'panelEditorNew.getSourcePanel',
    'panelEditorNew.getData',
    'explore.left.queryResponse',
    'explore.right.queryResponse',
    'explore.left.datasourceInstance',
    'explore.right.datasourceInstance',
    'explore.left.range',
    'explore.left.eventBridge',
    'explore.right.eventBridge',
    'explore.right.range',
    'explore.left.querySubscription',
    'explore.right.querySubscription',
  ];
}
*/

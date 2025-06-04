import { Store } from 'redux';

import { initialKeyedVariablesState } from 'app/features/variables/state/keyedVariablesReducer';
import { StoreState } from 'app/types';

import { mfeStore } from './configureMfeStore';

export let store: Store<StoreState>;

export function setStore(newStore: Store<StoreState>) {
  store = newStore;
}

export function getState(): StoreState {
  if (!store || !store.getState) {
    return { templating: { ...initialKeyedVariablesState, lastKey: 'key' } } as StoreState; // used by tests
  }

  const mfeState = findMfeStore();
  if (mfeState) {
    return mfeState.getState();
  }

  return store.getState();
}

export function dispatch(action: any) {
  if (!store || !store.getState) {
    return;
  }

  const mfeState = findMfeStore();
  if (mfeState) {
    return mfeState.dispatch(action);
  }

  return store.dispatch(action);
}

function findMfeStore() {
  const s = mfeStore.getState();
  if (!s.fnGlobalReducer.FNDashboard) {
    return null;
  }

  if (!s.fnGlobalReducer.renderingDashboardUID) {
    return null;
  }

  return s.fnGlobalReducer.grafanaStores[s.fnGlobalReducer.renderingDashboardUID];
}

import {
  createSlice,
  SliceCaseReducers,
  SliceSelectors,
  configureStore as reduxConfigStore,
  Store,
  PayloadAction,
} from '@reduxjs/toolkit';
import { WritableDraft } from 'immer';

import { GrafanaThemeType } from '@grafana/data';
import { FnState, INITIAL_FN_STATE, UpdateFNGlobalStateAction } from 'app/core/reducers/fn-slice';
import { FnLoggerService } from 'app/fn_logger';
import { StoreState } from 'app/types';

import { configureStore } from './configureStore';

const INITIAL_MODE = GrafanaThemeType.Light;
const MFE_REDUCER_KEY = 'mfeGlobalState';

interface MfeState {
  dashboards: Record<string, FnState>;
  FNDashboard: boolean;
  mode: GrafanaThemeType.Light | GrafanaThemeType.Dark;
}

function setGrafanaStore(state: WritableDraft<MfeGlobalState>, uid: string) {
  const grafanaStore = state.grafanaStores[uid];
  if (!grafanaStore) {
    state.grafanaStores = {
      ...state.grafanaStores,
      [uid]: configureStore(),
    };
  }
}

const reducers: SliceCaseReducers<MfeGlobalState> = {
  updatePartialMfeStates: (state, action: UpdateFNGlobalStateAction) => {
    const { uid, ...partialState } = action.payload;
    setGrafanaStore(state, uid);
    const fnState = state.dashboards[uid];
    state.FNDashboard = true;
    // Expose the FNDashboard flag on `window` so that non-React code in
    // `packages/grafana-runtime` (e.g. DataSourceWithBackend) can detect when
    // Grafana is running as a CodeRabbit microfrontend without importing the
    // app store (which would create a circular dependency).
    if (typeof window !== 'undefined') {
      window.__FNDashboard__ = true;
    }

    if (!fnState) {
      state.dashboards = {
        ...state.dashboards,
        [uid]: {
          ...INITIAL_FN_STATE,
          ...partialState,
          hiddenVariables: partialState.hiddenVariables
            ? [...partialState.hiddenVariables]
            : [...INITIAL_FN_STATE.hiddenVariables],
          uid,
        },
      };

      return;
    }

    state.dashboards[uid] = {
      ...fnState,
      ...partialState,
      hiddenVariables: partialState.hiddenVariables ? [...partialState.hiddenVariables] : [...fnState.hiddenVariables],
      uid,
    };
  },

  removeGrafanaStoreAndDashboard: (state, action: PayloadAction<string>) => {
    delete state.grafanaStores[action.payload];
    delete state.dashboards[action.payload];
  },

  updateRenderingDashboardUID: (state, action: PayloadAction<string>) => {
    FnLoggerService.info('Updating drill down dashboard state', {
      state,
      renderingDashboardUid: action.payload,
    });

    state.renderingDashboardUID = action.payload;
  },

  updateMfeMode: (state, action: PayloadAction<GrafanaThemeType.Light | GrafanaThemeType.Dark>) => {
    FnLoggerService.info('Updating MFE mode', {
      state,
      mode: action.payload,
    });

    state.mode = action.payload;
  },
};

export interface MfeGlobalState extends MfeState {
  grafanaStores: Record<string, Store<StoreState>>;
  renderingDashboardUID: string;
}

const fnSlice = createSlice<MfeGlobalState, SliceCaseReducers<MfeGlobalState>, string, SliceSelectors<MfeGlobalState>>({
  name: MFE_REDUCER_KEY,
  initialState: {
    dashboards: {},
    FNDashboard: false,
    mode: INITIAL_MODE,
    grafanaStores: {},
    renderingDashboardUID: '',
  },
  reducers,
});

export const { updatePartialMfeStates, updateMfeMode, removeGrafanaStoreAndDashboard, updateRenderingDashboardUID } =
  fnSlice.actions;
export const fnSliceReducer = fnSlice.reducer;

export type MfeStore = {
  fnGlobalReducer: MfeGlobalState;
};

export const mfeStore = reduxConfigStore<MfeStore>({
  reducer: {
    fnGlobalReducer: fnSliceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
      thunk: true,
    }),
});

export const mfeDispatch = mfeStore.dispatch;
export const mfeGetStoreState = () => mfeStore.getState();

import { createSlice, PayloadAction, SliceCaseReducers } from '@reduxjs/toolkit';

import { GrafanaThemeType } from '@grafana/data';

import { AnyObject } from '../../fn-app/types';

export interface FnGlobalState {
  FNDashboard: boolean;
  uid: string;
  slug: string;
  mode: GrafanaThemeType.Light | GrafanaThemeType.Dark;
  controlsContainer: string | null;
  pageTitle: string;
  queryParams: AnyObject;
  hiddenVariables: readonly string[];
}

export type UpdateFNGlobalStateAction = PayloadAction<Partial<FnGlobalState>>;

export type SetFnStateAction = PayloadAction<Omit<FnGlobalState, 'hiddenVariables'>>;

export type FnPropMappedFromState = Extract<keyof FnGlobalState, 'FNDashboard' | 'hiddenVariables' | 'mode'>;
export type FnStateProp = keyof FnGlobalState;

export type FnPropsMappedFromState = Pick<FnGlobalState, FnPropMappedFromState>;

export const fnStateProps: FnStateProp[] = [
  'FNDashboard',
  'controlsContainer',
  'hiddenVariables',
  'mode',
  'pageTitle',
  'queryParams',
  'slug',
  'uid',
];

export const fnPropsMappedFromState: readonly FnPropMappedFromState[] = [
  'FNDashboard',
  'hiddenVariables',
  'mode',
] as const;

const INITIAL_MODE = GrafanaThemeType.Light;

export const FN_STATE_KEY = 'fnGlobalState';

export const INITIAL_FN_STATE: FnGlobalState = {
  // NOTE: initial value is false
  FNDashboard: false,
  uid: '',
  slug: '',
  mode: INITIAL_MODE,
  controlsContainer: null,
  pageTitle: '',
  queryParams: {},
  hiddenVariables: [],
} as const;

const reducers: SliceCaseReducers<FnGlobalState> = {
  updateFnState: (state, action: SetFnStateAction) => {
    return { ...state, ...action.payload };
  },
  updatePartialFnStates: (state, action: UpdateFNGlobalStateAction) => {
    return {
      ...state,
      ...action.payload,
    };
  },
};

const fnSlice = createSlice<FnGlobalState, SliceCaseReducers<FnGlobalState>, string>({
  name: FN_STATE_KEY,
  initialState: INITIAL_FN_STATE,
  reducers,
});

export const { updatePartialFnStates, updateFnState } = fnSlice.actions;
export const fnSliceReducer = fnSlice.reducer;

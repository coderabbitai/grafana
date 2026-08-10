import { createSlice, PayloadAction, SliceCaseReducers, SliceSelectors } from '@reduxjs/toolkit';

import { GrafanaThemeType } from '@grafana/data';

import { AnyObject } from '../../fn-app/types';

export interface FnPanelOptionsUpdate {
  options: Record<string, unknown>;
  panelId: number;
  revision: number;
}

export interface FnState {
  uid: string;
  slug: string;
  version: number;
  controlsContainer: string | null;
  dashboardAccessMode: 'standard' | 'custom';
  pageTitle: string;
  queryParams: AnyObject;
  hiddenVariables: string[];
  /**
   * When true, each panel header renders an edit affordance that reports the
   * clicked panel back to the host through `metadata.eventListener`. The host
   * owns the editing UI, so Grafana only surfaces the trigger.
   */
  enablePanelEdit: boolean;
  enablePanelLayoutEdit: boolean;
  metadata: {
    teams: string[];
    eventListener: (<T>(event: { type: string; data: T }) => void) | null;
  };
  panelOptionsUpdate?: FnPanelOptionsUpdate;
  portalContainerID: string;
}

export type UpdateFNGlobalStateAction = PayloadAction<Partial<Omit<FnGlobalState, 'uid'>> & { uid: string }>;

export type SetFnStateAction = PayloadAction<Omit<FnGlobalState, 'hiddenVariables'>>;

export type FnPropMappedFromState = Extract<
  keyof FnGlobalState,
  | 'FNDashboard'
  | 'hiddenVariables'
  | 'mode'
  | 'uid'
  | 'queryParams'
  | 'slug'
  | 'version'
  | 'controlsContainer'
  | 'dashboardAccessMode'
  | 'enablePanelEdit'
  | 'enablePanelLayoutEdit'
  | 'panelOptionsUpdate'
  | 'portalContainerID'
>;
export type FnStateProp = keyof FnState;

export type FnPropsMappedFromState = Pick<FnGlobalState, FnPropMappedFromState>;

export const fnStateProps: FnStateProp[] = [
  'controlsContainer',
  'dashboardAccessMode',
  'enablePanelEdit',
  'enablePanelLayoutEdit',
  'hiddenVariables',
  'pageTitle',
  'panelOptionsUpdate',
  'portalContainerID',
  'queryParams',
  'slug',
  'uid',
  'version',
];

const INITIAL_MODE = GrafanaThemeType.Light;

export const FN_STATE_KEY = 'fnGlobalState';

export const INITIAL_FN_STATE: FnState = {
  // NOTE: initial value is false
  uid: '',
  slug: '',
  version: 1,
  controlsContainer: null,
  dashboardAccessMode: 'standard',
  pageTitle: '',
  queryParams: {},
  hiddenVariables: [],
  enablePanelEdit: false,
  enablePanelLayoutEdit: false,
  metadata: {
    teams: [],
    eventListener: null,
  },
  panelOptionsUpdate: undefined,
  portalContainerID: 'grafana-portal',
} as const;

export interface FnGlobalState extends FnState {
  FNDashboard: boolean;
  mode: GrafanaThemeType.Light | GrafanaThemeType.Dark;
}

const reducers: SliceCaseReducers<FnGlobalState> = {
  updatePartialFnStates: (state, action: UpdateFNGlobalStateAction) => {
    return {
      ...state,
      ...action.payload,
      FNDashboard: true,
    };
  },
};

const fnSlice = createSlice<FnGlobalState, SliceCaseReducers<FnGlobalState>, string, SliceSelectors<FnGlobalState>>({
  name: FN_STATE_KEY,
  initialState: {
    ...INITIAL_FN_STATE,
    FNDashboard: false,
    mode: INITIAL_MODE,
  },
  reducers,
});

export const { updatePartialFnStates, updateFnTimeRange } = fnSlice.actions;
export const fnSliceReducer = fnSlice.reducer;

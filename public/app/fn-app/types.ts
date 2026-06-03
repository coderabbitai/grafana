import { ReactNode } from 'react';

import { FnGlobalState, FnState } from 'app/core/reducers/fn-slice';

export type FailedToMountGrafanaErrorName = 'FailedToMountGrafana';

export interface GrafanaMicroFrontendState {
  errors: Map<string | number, string | Error>;
}

export type GrafanaMicroFrontendActions = {
  setErrors: (errors: GrafanaMicroFrontendState['errors']) => void;
};

/* eslint-disable-next-line  */
export type AnyObject<K extends string | number | symbol = string, V = any> = {
  [key in K]: V;
};

export type MfeContainer = Document | DocumentFragment | HTMLElement;

export interface FNDashboardProps extends FnState {
  name: string;
  fnError?: ReactNode;
  isLoading: (isLoading: boolean) => void;
  setErrors: (errors?: { [K: number | string]: string }) => void;
  container?: MfeContainer | null;
  mode: FnGlobalState['mode'];
}

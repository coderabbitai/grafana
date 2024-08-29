import { config } from '@grafana/runtime';

import { FNDashboard, createMfe } from './fn-app';

config.featureToggles = {
  ...config.featureToggles,
  publicDashboards: true,
};
interface FnData {
  assets: {
    light: string;
    dark: string;
  };
}

declare global {
  interface Window {
    fnData: FnData;
  }
}

// config.isPublicDashboardView = false;
config.bootData.assets = window.fnData.assets;

export const { bootstrap, mount, unmount, update, afterMount, afterUnmount, beforeLoad, beforeMount, beforeUnmount } =
  createMfe.create(FNDashboard);

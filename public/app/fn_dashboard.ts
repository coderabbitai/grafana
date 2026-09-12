import { config } from '@grafana/runtime';

import { FNDashboard, createMfe } from './fn-app';

// Ensure a valid Grafana version is exposed in microfrontend mode so
// plugins that validate grafanaDependency (e.g. Business Table) see
// a proper semver instead of the default "1.0".
const MICROFRONTEND_GRAFANA_VERSION = '11.3.0-pre';

config.featureToggles = {
  ...config.featureToggles,
  publicDashboards: true,
};
interface FnData {
  themePaths: {
    light: string;
    dark: string;
  };
}

declare global {
  interface Window {
    fnData: FnData;
  }
}

config.bootData.themePaths = window.fnData.themePaths;

config.buildInfo = {
  ...config.buildInfo,
  version: MICROFRONTEND_GRAFANA_VERSION,
  versionString: MICROFRONTEND_GRAFANA_VERSION,
};

export const { bootstrap, mount, unmount, update, afterMount, afterUnmount, beforeLoad, beforeMount, beforeUnmount } =
  createMfe.create(FNDashboard);

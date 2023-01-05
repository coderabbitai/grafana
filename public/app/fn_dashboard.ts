import { config } from '@grafana/runtime';

import { FNDashboard, createMfe } from './fn-app';

config.featureToggles = {
  ...config.featureToggles,
  publicDashboards: true,
};

config.isPublicDashboardView = false;
// eslint-disable-next-line
config.bootData.themePaths = (window as any).fnData?.themePaths;

export const { bootstrap, mount, unmount, update, afterMount, afterUnmount, beforeLoad, beforeMount, beforeUnmount } =
  createMfe.create(FNDashboard);

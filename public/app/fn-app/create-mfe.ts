declare let __webpack_public_path__: string;

// This is a path to the public folder without '/build'
window.__grafana_public_path__ =
  __webpack_public_path__.substring(0, __webpack_public_path__.lastIndexOf('build/')) || __webpack_public_path__;

import { isNull, merge, noop, pick } from 'lodash';
import React, { ComponentType } from 'react';
import { createRoot, Root } from 'react-dom/client';

import { createTheme, GrafanaThemeType, rangeUtil } from '@grafana/data';
import { createColors } from '@grafana/data/src/themes/createColors';
import { GrafanaTheme2 } from '@grafana/data/src/themes/types';
import { ThemeChangedEvent } from '@grafana/runtime';
import { GrafanaBootConfig } from '@grafana/runtime/src/config';
import { getTheme } from '@grafana/ui';
import appEvents from 'app/core/app_events';
import config from 'app/core/config';
import { FnState, INITIAL_FN_STATE, FnPropMappedFromState, fnStateProps } from 'app/core/reducers/fn-slice';
import { backendSrv } from 'app/core/services/backend_srv';
import fn_app from 'app/fn_app';
import { FnLoggerService } from 'app/fn_logger';
import {
  mfeDispatch,
  updateRenderingDashboardUID,
  updatePartialMfeStates,
  mfeGetStoreState,
  updateMfeMode,
} from 'app/store/configureMfeStore';

import { FNDashboardProps, FailedToMountGrafanaErrorName } from './types';

/**
 * NOTE:
 * Qiankun expects Promise. Otherwise warnings are logged and life cycle hooks do not work
 */
/* eslint-disable-next-line  */
export declare type LifeCycleFn = (app: any, global: typeof window) => Promise<any>;

/**
 * NOTE: single-spa and qiankun lifeCycles
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export declare type FrameworkLifeCycles = {
  beforeLoad: LifeCycleFn | LifeCycleFn[];
  beforeMount: LifeCycleFn | LifeCycleFn[];
  afterMount: LifeCycleFn | LifeCycleFn[];
  beforeUnmount: LifeCycleFn | LifeCycleFn[];
  afterUnmount: LifeCycleFn | LifeCycleFn[];
  bootstrap: LifeCycleFn | LifeCycleFn[];
  mount: LifeCycleFn | LifeCycleFn[];
  unmount: LifeCycleFn | LifeCycleFn[];
  update: LifeCycleFn | LifeCycleFn[];
};

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

class createMfe {
  private static readonly containerSelector = '#grafanaRoot';
  private static readonly roots = new WeakMap<Element, Root>();
  private static logger = FnLoggerService;

  mode: FNDashboardProps['mode'];
  static Component: ComponentType<Omit<FNDashboardProps, FnPropMappedFromState>>;
  constructor(readonly props: FNDashboardProps) {
    this.mode = props.mode;
  }

  static getLifeCycles(component: ComponentType<Omit<FNDashboardProps, FnPropMappedFromState>>) {
    const lifeCycles: FrameworkLifeCycles = {
      bootstrap: this.boot(),
      mount: this.mountFnApp(component),
      unmount: this.unMountFnApp(),
      update: this.updateFnApp(),
      afterMount: () => Promise.resolve(),
      beforeMount: () => Promise.resolve(),
      afterUnmount: () => Promise.resolve(),
      beforeUnmount: () => Promise.resolve(),
      beforeLoad: () => Promise.resolve(),
    };

    return lifeCycles;
  }

  static create(component: ComponentType<Omit<FNDashboardProps, FnPropMappedFromState>>) {
    return createMfe.getLifeCycles(component);
  }

  static boot() {
    return () => fn_app.init();
  }

  private static toggleTheme = (mode: FNDashboardProps['mode']): GrafanaThemeType.Light | GrafanaThemeType.Dark =>
    mode === 'dark' ? GrafanaThemeType.Light : GrafanaThemeType.Dark;

  private static get styleSheetLink() {
    const stylesheetLink = document.createElement('link');
    stylesheetLink.rel = 'stylesheet';

    return stylesheetLink;
  }

  private static createGrafanaTheme2(mode: FNDashboardProps['mode']) {
    config.theme2 = createTheme({
      colors: {
        mode,
      },
    });

    config.theme2.colors = createColors({ mode });

    config.theme2.v1 = getTheme(mode);

    config.theme2.v1.colors = config.theme.colors;

    return config.theme2;
  }

  private static getPartialBootConfigWithTheme(theme2: GrafanaTheme2) {
    const partial: DeepPartial<GrafanaBootConfig> = {
      theme: theme2.v1,
      bootData: { user: { lightTheme: theme2.isLight } },
    };

    return partial;
  }

  private static mergeBootConfigs(bootConfig: GrafanaBootConfig, partialBootConfig: DeepPartial<GrafanaBootConfig>) {
    return merge({}, bootConfig, partialBootConfig);
  }

  private static publishTheme(theme: GrafanaTheme2) {
    appEvents.publish(new ThemeChangedEvent(theme));
  }

  // NOTE: based on grafana function: 'toggleTheme'
  private static removeThemeLinks(modeToBeTurnedOff: GrafanaThemeType.Light | GrafanaThemeType.Dark, timeout?: number) {
    Array.from(document.getElementsByTagName('link')).forEach(createMfe.removeThemeLink(modeToBeTurnedOff, timeout));
  }

  private static removeThemeLink(modeToBeTurnedOff: FNDashboardProps['mode'], timeout?: number) {
    return (link: HTMLLinkElement) => {
      if (!link.href?.includes(`build/grafana.${modeToBeTurnedOff}`)) {
        return;
      }

      if (isNull(timeout)) {
        link.remove();

        return;
      }

      // Remove existing link after a 500ms to allow new css to load to avoid flickering
      // If we add new css at the same time we remove current one the page will be rendered without css
      // As the new css file is loading
      setTimeout(link.remove, timeout);
    };
  }

  /**
   * NOTE:
   * If isRuntimeOnly then the stylesheets of the turned off theme are not removed
   */
  private static loadFnTheme = (mode: FNDashboardProps['mode'] = GrafanaThemeType.Light, isRuntimeOnly = false) => {
    createMfe.logger.info('Trying to load theme.', { mode });

    const grafanaTheme2 = createMfe.createGrafanaTheme2(mode);

    const partialBootConfigWithTheme = createMfe.getPartialBootConfigWithTheme(grafanaTheme2);

    const bootConfigWithTheme = createMfe.mergeBootConfigs(config, partialBootConfigWithTheme);

    createMfe.publishTheme(bootConfigWithTheme.theme2);

    if (isRuntimeOnly) {
      createMfe.logger.info('Successfully loaded theme', { mode });

      return;
    }

    createMfe.removeThemeLinks(createMfe.toggleTheme(mode));

    const newCssLink = createMfe.styleSheetLink;
    newCssLink.href = config.bootData.themePaths[mode];
    document.body.appendChild(newCssLink);

    createMfe.logger.info('Successfully loaded theme.', { mode });
  };

  private static getContainer(props: FNDashboardProps) {
    const parentElement = props.container || document;

    return parentElement.querySelector(createMfe.containerSelector);
  }

  static mountFnApp(Component: ComponentType<Omit<FNDashboardProps, FnPropMappedFromState>>) {
    const lifeCycleFn: FrameworkLifeCycles['mount'] = (props: FNDashboardProps) => {
      return new Promise((res, rej) => {
        try {
          const container = createMfe.getContainer(props);
          if (container && createMfe.roots.has(container)) {
            throw new Error('Grafana root is already mounted');
          }
          createMfe.loadFnTheme(props.mode);
          createMfe.Component = Component;

          const initialState: FnState = {
            ...INITIAL_FN_STATE,
            ...pick(props, ...fnStateProps),
          };

          createMfe.logger.info('[FN Grafana] Dispatching initial state.', { initialState });
          if (props.mode && mfeGetStoreState().fnGlobalReducer.mode !== props.mode) {
            mfeDispatch(updateMfeMode(props.mode));
          }
          mfeDispatch(updatePartialMfeStates(initialState));

          createMfe.renderMfeComponent(props, () => {
            createMfe.logger.info('Mounted grafana.', { props });

            return res(true);
          });
        } catch (err) {
          const message = `[FN Grafana]: Failed to mount grafana. ${err}`;

          FnLoggerService.info(null, message);

          const fnError = new Error(message);

          const name: FailedToMountGrafanaErrorName = 'FailedToMountGrafana';
          fnError.name = name;

          return rej(fnError);
        }
      });
    };

    return lifeCycleFn;
  }

  static unMountFnApp() {
    const lifeCycleFn: FrameworkLifeCycles['unmount'] = (props: FNDashboardProps) => {
      const container = createMfe.getContainer(props);
      const root = container && createMfe.roots.get(container);

      if (container && root) {
        createMfe.logger.info('Trying to unmount grafana...');

        // Portals belong to the original React root, including those outside
        // this container. A newly created root cannot clean them up.
        root.unmount();
        createMfe.roots.delete(container);

        createMfe.logger.info('Successfully unmounted grafana.');
      } else {
        createMfe.logger.error('Failed to unmount grafana. Mounted root does not exist.');
      }

      backendSrv.cancelAllInFlightRequests();

      return Promise.resolve(!!root);
    };

    return lifeCycleFn;
  }

  static updateFnApp() {
    const lifeCycleFn: FrameworkLifeCycles['update'] = async ({
      mode,
      ...other
    }: FNDashboardProps & {
      readonly renderingDashboardUid?: string;
    }) => {
      const requestedRefreshRevision = other.refreshRevision;
      if (requestedRefreshRevision !== undefined) {
        if (!Number.isSafeInteger(requestedRefreshRevision) || requestedRefreshRevision < 0) {
          throw new Error('refreshRevision must be a non-negative safe integer');
        }
        if (!other.uid) {
          throw new Error('A dashboard uid is required when requesting a refresh');
        }
      }

      if (mode && mfeGetStoreState().fnGlobalReducer.mode !== mode) {
        mfeDispatch(updateMfeMode(mode));

        createMfe.loadFnTheme(mode);
      }

      if (other.uid) {
        const previousRefreshRevision = mfeGetStoreState().fnGlobalReducer.dashboards[other.uid]?.refreshRevision ?? 0;
        const shouldRefresh = (requestedRefreshRevision ?? 0) > previousRefreshRevision;
        createMfe.logger.info('Trying to render dashboard using update: ', { updatedProps: other });

        if (shouldRefresh) {
          const { refreshRevision: _, ...updatedProps } = other;
          mfeDispatch(updatePartialMfeStates(updatedProps));
        } else {
          mfeDispatch(updatePartialMfeStates(other));
        }

        if (shouldRefresh) {
          await createMfe.refreshDashboard(other.uid);
          mfeDispatch(updatePartialMfeStates({ uid: other.uid, refreshRevision: requestedRefreshRevision }));
        }
      }

      if (other.renderingDashboardUid) {
        createMfe.logger.info('Trying to update drill down dashboard.', {
          renderingDashboardUid: other.renderingDashboardUid,
        });

        mfeDispatch(
          updateRenderingDashboardUID({
            renderingDashboardUid: other.renderingDashboardUid,
          })
        );
      }

      return true;
    };

    return lifeCycleFn;
  }

  private static async refreshDashboard(uid: string) {
    const mfeState = mfeGetStoreState().fnGlobalReducer;
    const dashboard = mfeState.grafanaStores[uid]?.getState().dashboard.getModel();
    if (!dashboard || dashboard.uid !== uid) {
      throw new Error(`Cannot refresh dashboard ${uid}: the owning model is not mounted`);
    }

    const previousRenderingDashboardUid = mfeState.renderingDashboardUID;
    let variablesUpdated: Promise<void> | undefined;
    try {
      // DashboardModel's existing refresh pipeline dispatches through the
      // currently rendering MFE store. Select only this update's dashboard
      // while the synchronous thunk is bound to its store. Redux supplies that
      // store's dispatch/getState to the thunk before its first await, so the
      // global owner can be restored immediately without an async race.
      mfeDispatch(updateRenderingDashboardUID(uid));
      variablesUpdated = dashboard.timeRangeUpdated(
        rangeUtil.convertRawToRange(dashboard.time, dashboard.getTimezone(), dashboard.fiscalYearStartMonth)
      );
    } finally {
      mfeDispatch(updateRenderingDashboardUID(previousRenderingDashboardUid));
    }
    await variablesUpdated;
  }

  static renderMfeComponent(props: FNDashboardProps, onSuccess = noop) {
    const container = createMfe.getContainer(props);
    if (!container) {
      createMfe.logger.error('Failed to render mfe component. Container does not exist.', { props });

      return;
    }

    const root = createRoot(container);
    createMfe.roots.set(container, root);
    root.render(React.createElement(createMfe.Component, props));
    createMfe.logger.info('Created mfe component.', { props, container });
    onSuccess();
  }
}

export { createMfe };

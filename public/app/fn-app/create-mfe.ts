declare let __webpack_public_path__: string;

// This is a path to the public folder without '/build'
window.__grafana_public_path__ =
  __webpack_public_path__.substring(0, __webpack_public_path__.lastIndexOf('build/')) || __webpack_public_path__;

import { isNull, merge, noop, omit, pick } from 'lodash';
import React, { ComponentType } from 'react';
import ReactDOM from 'react-dom';

import { createTheme, GrafanaThemeType } from '@grafana/data';
import { createFnColors } from '@grafana/data/src/themes/fnCreateColors';
import { GrafanaTheme2 } from '@grafana/data/src/themes/types';
import { ThemeChangedEvent } from '@grafana/runtime';
import { GrafanaBootConfig } from '@grafana/runtime/src/config';
import { getTheme } from '@grafana/ui';
import appEvents from 'app/core/app_events';
import config from 'app/core/config';
import {
  FnGlobalState,
  updatePartialFnStates,
  updateFnState,
  INITIAL_FN_STATE,
  FnPropMappedFromState,
  fnStateProps,
} from 'app/core/reducers/fn-slice';
import { backendSrv } from 'app/core/services/backend_srv';
import fn_app from 'app/fn_app';
import { FnLoggerService } from 'app/fn_logger';
import { dispatch } from 'app/store/store';

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

  private static readonly logPrefix = '[FN Grafana]';

  mode: FNDashboardProps['mode'];
  static Component: ComponentType<Omit<FNDashboardProps, FnPropMappedFromState>>;
  constructor(readonly props: FNDashboardProps) {
    this.mode = props.mode;
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  private static logger = (...args: any[]) => console.log(createMfe.logPrefix, ...args);

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

    config.theme2.colors = createFnColors({ mode });

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
    createMfe.logger('Trying to load theme.', { mode });

    const grafanaTheme2 = createMfe.createGrafanaTheme2(mode);

    const partialBootConfigWithTheme = createMfe.getPartialBootConfigWithTheme(grafanaTheme2);

    const bootConfigWithTheme = createMfe.mergeBootConfigs(config, partialBootConfigWithTheme);

    createMfe.publishTheme(bootConfigWithTheme.theme2);

    if (isRuntimeOnly) {
      createMfe.logger('Successfully loaded theme', { mode });

      return;
    }

    createMfe.removeThemeLinks(createMfe.toggleTheme(mode));

    const newCssLink = createMfe.styleSheetLink;
    newCssLink.href = config.bootData.themePaths[mode];
    document.body.appendChild(newCssLink);

    createMfe.logger('Successfully loaded theme.', { mode });
  };

  private static getContainer(props: FNDashboardProps) {
    const parentElement = props.container || document;

    return parentElement.querySelector(createMfe.containerSelector);
  }

  static mountFnApp(Component: ComponentType<Omit<FNDashboardProps, FnPropMappedFromState>>) {
    const lifeCycleFn: FrameworkLifeCycles['mount'] = (props: FNDashboardProps) => {
      createMfe.logger('Trying to mount grafana...');

      return new Promise((res, rej) => {
        try {
          createMfe.loadFnTheme(props.mode);
          createMfe.Component = Component;

          const initialState: FnGlobalState = {
            ...INITIAL_FN_STATE,
            FNDashboard: true,
            ...pick(props, ...fnStateProps),
          };

          FnLoggerService.log(null, '[FN Grafana] Dispatching initial state.', { initialState });

          dispatch(updateFnState(initialState));

          createMfe.renderMfeComponent(props, () => {
            createMfe.logger('Mounted grafana.', { props });

            return res(true);
          });
        } catch (err) {
          const message = `[FN Grafana]: Failed to mount grafana. ${err}`;

          FnLoggerService.log(null, message);

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

      if (container) {
        createMfe.logger('Trying to unmount grafana...');

        ReactDOM.unmountComponentAtNode(container);

        createMfe.logger('Successfully unmounted grafana.');
      } else {
        createMfe.logger('Failed to unmount grafana. Container does not exist.');
      }

      backendSrv.cancelAllInFlightRequests();

      return Promise.resolve(!!container);
    };

    return lifeCycleFn;
  }

  static updateFnApp() {
    const lifeCycleFn: FrameworkLifeCycles['update'] = ({ mode, hiddenVariables }: FNDashboardProps) => {
      if (mode) {
        createMfe.logger('Trying to update grafana with theme.', { mode });
        /**
         * NOTE
         * We do not use the "mode" state right now,
         * but I believe that as long as we store the "mode, we should update it
         */
        dispatch(
          updatePartialFnStates({
            mode,
          })
        );
        /**
         * NOTE:
         * Here happens the theme change.
         *
         * TODO:
         * We could probably made the theme change smoother
         * if we use state to update the theme
         */
        createMfe.loadFnTheme(mode);
      }

      if (hiddenVariables) {
        createMfe.logger('Trying to update grafana with hidden variables.', { hiddenVariables });

        dispatch(
          updatePartialFnStates({
            hiddenVariables,
          })
        );
      }

      // NOTE: The false/true value does not change anything
      return Promise.resolve(true);
    };

    return lifeCycleFn;
  }

  static renderMfeComponent(props: FNDashboardProps, onSuccess = noop) {
    const container = createMfe.getContainer(props);

    ReactDOM.render(
      React.createElement(createMfe.Component, omit(props, 'hiddenVariables', 'FNDashboard')),
      container,
      () => {
        createMfe.logger('Created mfe component.', { props, container });
        onSuccess();
      }
    );
  }
}

export { createMfe };

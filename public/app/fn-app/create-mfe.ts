declare let __webpack_public_path__: string;

// This is a path to the public folder without '/build'
window.__grafana_public_path__ =
  __webpack_public_path__.substring(0, __webpack_public_path__.lastIndexOf('build/')) || __webpack_public_path__;

import React from 'react';
import ReactDOM from 'react-dom';

import { createTheme } from '@grafana/data';
import { ThemeChangedEvent } from '@grafana/runtime';
import appEvents from 'app/core/app_events';
import config from 'app/core/config';
import fn_app from 'app/fn_app';

class createMfe {
  constructor(public theme: string) {
    this.theme = theme;
  }
  static create(component: React.Component) {
    return {
      bootstrap: this.boot(),
      mount: this.mountFnApp(component),
      unmount: this.unMountFnApp(),
      update: this.updateFnApp(),
    };
  }

  static boot() {
    // eslint-disable-next-line
    return async function bootstrap() {
      await fn_app.init();
    };
  }

  loadFnTheme() {
    const theme = this.theme;
    config.theme2 = createTheme({
      colors: {
        mode: theme,
      },
    });
    config.theme = config.theme2.v1;
    config.bootData.user.lightTheme = theme === 'light' ? true : false;
    appEvents.publish(new ThemeChangedEvent(config.theme2));
    const other = theme === 'dark' ? 'light' : 'dark';
    const newCssLink = document.createElement('link');
    newCssLink.rel = 'stylesheet';
    newCssLink.href = config.bootData.themePaths[theme];
    document.body.appendChild(newCssLink);
    const bodyLinks = document.getElementsByTagName('link');
    for (let i = 0; i < bodyLinks.length; i++) {
      const link = bodyLinks[i];
      if (link.href && link.href.indexOf(`build/grafana.${other}`) > 0) {
        link.remove();
      }
    }
  }

  static mountFnApp(component: React.Component) {
    // eslint-disable-next-line
    return async function mount(props: any) {
      console.log('mount grafana app');
      const mfe = new createMfe(props.theme);
      mfe.loadFnTheme();
      ReactDOM.render(
        React.createElement(component, { ...props }),
        props.container ? props.container.querySelector('#grafanaRoot') : document.getElementById('grafanaRoot')
      );
      props.isLoading(false);
    };
  }

  static unMountFnApp() {
    // eslint-disable-next-line
    return async function unmount(props: any) {
      console.log('unmount grafana app');
      const container = props.container
        ? props.container.querySelector('#grafanaRoot')
        : document.getElementById('grafanaRoot');
      if (container) {
        ReactDOM.unmountComponentAtNode(container);
      }
    };
  }

  static updateFnApp() {
    // eslint-disable-next-line
    return async function update(props: any) {
      console.log('update grafana app');
    };
  }
}

export { createMfe };

declare let __webpack_public_path__: string;

// This is a path to the public folder without '/build'
window.__grafana_public_path__ =
  __webpack_public_path__.substring(0, __webpack_public_path__.lastIndexOf('build/')) || __webpack_public_path__;

import React from 'react';
import ReactDOM from 'react-dom';

import fn_app from 'app/fn_app';

class createMfe {
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
      console.log('grafana app bootstraped');
    };
  }

  static mountFnApp(component: React.Component) {
    // eslint-disable-next-line
    return async function mount(props: any) {
      ReactDOM.render(
        React.createElement(component, { ...props }),
        props.container ? props.container.querySelector('#reactRoot') : document.getElementById('reactRoot')
      );
      console.log('mounting grafana app', props);
    };
  }

  static unMountFnApp() {
    // eslint-disable-next-line
    return async function unmount(props: any) {
      const container = props.container
        ? props.container.querySelector('#reactRoot')
        : document.getElementById('reactRoot');
      if (container) {
        ReactDOM.unmountComponentAtNode(container);
      }
      console.log('unmounting grafana app', props);
    };
  }

  static updateFnApp() {
    // eslint-disable-next-line
    return async function update(props: any) {
      console.log('update props', props);
    };
  }
}

export { createMfe };

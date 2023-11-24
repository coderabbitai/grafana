import React, { useState, useEffect, FC, PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { config, navigationLogger } from '@grafana/runtime';
import { ErrorBoundaryAlert, GlobalStyles } from '@grafana/ui';
import { loadAndInitAngularIfEnabled } from 'app/angular/loadAndInitAngularIfEnabled';
import { ThemeProvider } from 'app/core/utils/ConfigProvider';
import { store } from 'app/store/store';

import { GrafanaContext } from '../core/context/GrafanaContext';
import app from '../fn_app';

import { FNDashboardProps } from './types';

type FnAppProviderProps = Pick<FNDashboardProps, 'fnError'>;

export const FnAppProvider: FC<PropsWithChildren<FnAppProviderProps>> = (props) => {
  const { children, fnError = null } = props;

  const [ready, setReady] = useState(false);
  navigationLogger('AppWrapper', false, 'rendering');
  useEffect(() => {
    loadAndInitAngularIfEnabled()
      .then(() => {
        setReady(true);
        // $('.preloader').remove();
      })
      .catch((err) => console.error(err));
    return () => {};
  }, []);

  if (!ready) {
    /**
     * TODO: I think loader would be better
     */
    return <>{fnError}</>;
  }

  if (!store) {
    /**
     * TODO: I think loader would be better
     */
    return <>{fnError}</>;
  }

  return (
    <Provider store={store}>
      <BrowserRouter>
        <ErrorBoundaryAlert style="page">
          <GrafanaContext.Provider value={app.context}>
            <ThemeProvider value={config.theme2}>
              <>
                <GlobalStyles />
                {children}
              </>
            </ThemeProvider>
          </GrafanaContext.Provider>
        </ErrorBoundaryAlert>
      </BrowserRouter>
    </Provider>
  );
};
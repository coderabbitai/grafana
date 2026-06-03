import createCache from '@emotion/cache';
import { cache as emotionCssCache } from '@emotion/css';
import { CacheProvider } from '@emotion/react';
import { useState, useEffect, FC, PropsWithChildren, useMemo } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Store } from 'redux';

import { config, navigationLogger } from '@grafana/runtime';
import { ErrorBoundaryAlert, GlobalStyles } from '@grafana/ui';
import { loadAndInitAngularIfEnabled } from 'app/angular/loadAndInitAngularIfEnabled';
import { ThemeProvider } from 'app/core/utils/ConfigProvider';
import { FnLoader } from 'app/features/dashboard/components/DashboardLoading/FnLoader';
import { FnLoggerService } from 'app/fn_logger';
import { store } from 'app/store/store';
import { StoreState } from 'app/types';

import { GrafanaContext } from '../core/context/GrafanaContext';
import app from '../fn_app';

import { FNDashboardProps } from './types';

type FnAppProviderProps = Pick<FNDashboardProps, 'fnError'> & {
  container?: FNDashboardProps['container'];
  store: Store<StoreState>;
};

export const FnAppProvider: FC<PropsWithChildren<FnAppProviderProps>> = (props) => {
  const { children } = props;
  const emotionCache = useMemo(
    () => {
      const container =
        props.container instanceof Document ? props.container.head : props.container || document.head;

      emotionCssCache.sheet.container = container;
      emotionCssCache.sheet.tags.forEach((tag) => {
        if (tag.parentNode !== container) {
          container.appendChild(tag);
        }
      });

      return createCache({
        key: 'grafana-mf',
        container,
      });
    },
    [props.container]
  );
  const themeHref = config.bootData.themePaths[config.theme2.colors.mode];

  const [ready, setReady] = useState(false);
  navigationLogger('AppWrapper', false, 'rendering');
  useEffect(() => {
    loadAndInitAngularIfEnabled()
      .then(() => {
        setReady(true);
        $('.preloader').remove();
      })
      .catch(FnLoggerService.error);
  }, []);

  if (!store || !ready) {
    return <FnLoader />;
  }

  return (
    <CacheProvider value={emotionCache}>
      <link rel="stylesheet" href={themeHref} />
      <Provider store={props.store}>
        <BrowserRouter>
          <ErrorBoundaryAlert style="page">
            <GrafanaContext.Provider value={app.context}>
              <ThemeProvider value={config.theme2}>
                <div data-grafana-mf-root>
                  <GlobalStyles prefix="[data-grafana-mf-root]" />
                  {children}
                </div>
              </ThemeProvider>
            </GrafanaContext.Provider>
          </ErrorBoundaryAlert>
        </BrowserRouter>
      </Provider>
    </CacheProvider>
  );
};

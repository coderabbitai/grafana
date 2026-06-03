import { FC, useEffect, useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports
import { Provider, shallowEqual, useSelector } from 'react-redux';

import { FnPropMappedFromState, FnState, updatePartialFnStates } from 'app/core/reducers/fn-slice';
import { FnLoggerService } from 'app/fn_logger';
import {
  MfeGlobalState,
  MfeStore,
  mfeStore,
  removeGrafanaStoreAndDashboard,
  updateRenderingDashboardUID,
} from 'app/store/configureMfeStore';

import { FnAppProvider } from '../fn-app-provider';
import { FNDashboardProps } from '../types';
import { RenderPortal } from '../utils';

import { RenderFNDashboard } from './render-fn-dashboard';

type FNDashboardComponentProps = Omit<FNDashboardProps, FnPropMappedFromState>;

export const FNDashboard: FC<FNDashboardComponentProps> = (props) => {
  return (
    <Provider store={mfeStore}>
      <DashboardPortal {...props} />
    </Provider>
  );
};

export const DashboardPortal: FC<FNDashboardComponentProps> = (p) => {
  const globalFnProps = useSelector(({ fnGlobalReducer }: MfeStore) => fnGlobalReducer, shallowEqual);
  const dashboards = useMemo(() => {
    return Object.entries(globalFnProps.dashboards)
      .filter(([uid, props]) => uid.length)
      .map(([uid, props]) => [uid, props] satisfies [string, FnState]);
  }, [globalFnProps.dashboards]);

  useEffect(() => {
    const timer = isDashboardValidPoller(globalFnProps, dashboards);
    if (!globalFnProps.renderingDashboardUID.length && dashboards.length > 0) {
      clearInterval(timer);
    }
    return () => {
      clearInterval(timer);
    };
  }, [globalFnProps, dashboards]);

  return useMemo(() => {
    return dashboards.map(([uid, props]) => {
      if (!uid.length) {
        return null;
      }

      const store = globalFnProps.grafanaStores[uid];
      if (!store) {
        return null;
      }

      if (!document.getElementById(props.portalContainerID)) {
        FnLoggerService.info("removing dashboard from MfeStore because portalContainerID doesn't exist", {
          portalID: props.portalContainerID,
          uid,
        });
        mfeStore.dispatch(removeGrafanaStoreAndDashboard(uid));
        return null;
      }

      mfeStore.dispatch(updateRenderingDashboardUID(uid));
      store.dispatch(updatePartialFnStates(props));

      return (
        <RenderPortal ID={props.portalContainerID} key={uid}>
          {(container) => (
            <FnAppProvider container={container} fnError={p.fnError} store={store}>
              <div className="page-dashboard">
                <RenderFNDashboard
                  {...{
                    ...props,
                    ...p,
                    uid,
                    mode: globalFnProps.mode,
                  }}
                />
              </div>
            </FnAppProvider>
          )}
        </RenderPortal>
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboards, p, globalFnProps.renderingDashboardUID]);
};

/**
 * Checks if the dashboard is valid every 500ms.
 */
const POLLING_INTERVAL = 500;
function isDashboardValidPoller(globalFnProps: MfeGlobalState, dashboards: Array<[string, FnState]>) {
  return setInterval(() => {
    dashboards.forEach(([uid, props]) => {
      if (!document.getElementById(props.portalContainerID)) {
        FnLoggerService.info("[Polling]:: removing dashboard from MfeStore because portalContainerID doesn't exist", {
          portalID: props.portalContainerID,
          uid,
        });
        mfeStore.dispatch(removeGrafanaStoreAndDashboard(uid));
      }
    });

    if (
      globalFnProps.renderingDashboardUID &&
      !dashboards.some(([uid]) => uid === globalFnProps.renderingDashboardUID)
    ) {
      mfeStore.dispatch(updateRenderingDashboardUID(''));
    }
  }, POLLING_INTERVAL);
}

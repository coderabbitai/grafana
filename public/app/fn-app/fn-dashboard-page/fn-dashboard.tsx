import { FC, useEffect, useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports
import { Provider, shallowEqual, useSelector } from 'react-redux';

import { FnPropMappedFromState, FnState, fnStateProps, updatePartialFnStates } from 'app/core/reducers/fn-slice';
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
type RuntimeFNDashboardComponentProps = FNDashboardComponentProps & Partial<FnState>;

function mergeRuntimeFnProps(props: FnState, runtimeProps: RuntimeFNDashboardComponentProps): FnState {
  if (runtimeProps.uid !== props.uid) {
    return props;
  }

  const runtimeRecord = runtimeProps as Record<string, unknown>;
  const merged = { ...props } as Record<string, unknown>;
  for (const key of fnStateProps) {
    if (key in runtimeRecord) {
      merged[key] = runtimeRecord[key];
    }
  }

  return merged as unknown as FnState;
}

export const FNDashboard: FC<FNDashboardComponentProps> = (props) => {
  return (
    <Provider store={mfeStore}>
      <DashboardPortal {...props} />
    </Provider>
  );
};

export const DashboardPortal: FC<FNDashboardComponentProps> = (p) => {
  const runtimeProps = p as RuntimeFNDashboardComponentProps;
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

      const propsWithRuntimeUpdates = mergeRuntimeFnProps(props, runtimeProps);

      mfeStore.dispatch(updateRenderingDashboardUID(uid));
      store.dispatch(updatePartialFnStates(propsWithRuntimeUpdates));

      return (
        <RenderPortal ID={props.portalContainerID} key={uid}>
          <FnAppProvider fnError={p.fnError} store={store}>
            <div className="page-dashboard">
              <RenderFNDashboard
                {...{
                  ...p,
                  ...propsWithRuntimeUpdates,
                  uid,
                  mode: globalFnProps.mode,
                }}
              />
            </div>
          </FnAppProvider>
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

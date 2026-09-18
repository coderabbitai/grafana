import { merge, isFunction } from 'lodash';
import { useEffect, FC, useMemo, useState } from 'react';

import { urlUtil } from '@grafana/data';
import { locationService as locationSrv, HistoryWrapper } from '@grafana/runtime';
import DashboardPage, { DashboardPageProps } from 'app/features/dashboard/containers/DashboardPage';
import { findTemplateVarChanges } from 'app/features/variables/utils';
import { mfeGetStoreState } from 'app/store/configureMfeStore';
import { DashboardRoutes, StoreState, useSelector } from 'app/types';

import { FNDashboardProps } from '../types';

export const mfeLocationService = locationSrv as HistoryWrapper;

const DEFAULT_DASHBOARD_PAGE_PROPS: Pick<DashboardPageProps, 'history' | 'route'> & {
  match: Pick<DashboardPageProps['match'], 'isExact' | 'path' | 'url'>;
} = {
  match: {
    isExact: true,
    path: '/d/:uid/:slug?',
    url: '',
  },
  history: mfeLocationService.getHistory(),
  route: {
    routeName: DashboardRoutes.Normal,
    path: '/d/:uid/:slug?',
    pageClass: 'page-dashboard',
    component: DashboardPage,
  },
};

export const RenderFNDashboard: FC<FNDashboardProps> = (props) => {
  const { queryParams, controlsContainer, setErrors, hiddenVariables, isLoading } = props;
  const [historyUpdate, setHistoryUpdate] = useState<{
    source: typeof queryParams;
    queryParams: typeof queryParams;
  }>();
  const effectiveQueryParams = historyUpdate?.source === queryParams ? historyUpdate.queryParams : queryParams;

  useEffect(() => {
    mfeLocationService.fnPathnameChange(window.location.pathname, queryParams);
  }, [queryParams]);

  useEffect(() => {
    let previousSearch = mfeLocationService.getSearchObject();
    return mfeLocationService.getHistory().listen(() => {
      const search = mfeLocationService.getSearchObject();
      const changes = findTemplateVarChanges(search, previousSearch);
      previousSearch = search;
      if (mfeGetStoreState().fnGlobalReducer.renderingDashboardUID !== props.uid || !changes) {
        return;
      }
      setHistoryUpdate((previous) => {
        const next = { ...(previous?.source === queryParams ? previous.queryParams : queryParams) };
        // Apply only this navigation's variable delta. The shared URL also
        // contains other portals' state; host routing/scope props stay intact.
        for (const [key, change] of Object.entries(changes)) {
          if (change.removed) {
            delete next[key];
          } else {
            next[key] = change.value;
          }
        }
        return { source: queryParams, queryParams: next };
      });
    });
  }, [props.uid, queryParams]);

  const firstError = useSelector((state: StoreState) => {
    const { appNotifications } = state;

    return Object.values(appNotifications.byId).find(({ severity }) => severity === 'error');
  });

  /**
   * NOTE:
   * Grafana renders notifications in StoredNotifications component.
   * We do not use this component in FN.
   * But we would like to propagate grafana's errors to FN.
   */
  useEffect(() => {
    if (!isFunction(setErrors)) {
      return;
    }

    setErrors(firstError ? { [firstError.timestamp]: firstError.text } : {});
  }, [firstError, setErrors]);

  const dashboardPageProps: DashboardPageProps = useMemo(
    () =>
      merge({}, DEFAULT_DASHBOARD_PAGE_PROPS, {
        ...DEFAULT_DASHBOARD_PAGE_PROPS,
        match: {
          params: {
            ...effectiveQueryParams,
            uid: props.uid,
            slug: props.slug || '',
          },
        },
        // fnPathnameChange mutates the shared history location in place.
        // Keep each portal's previous search immutable for componentDidUpdate.
        location: { ...mfeLocationService.getLocation(), search: urlUtil.toUrlParams(effectiveQueryParams) },
        queryParams: effectiveQueryParams,
        hiddenVariables,
        controlsContainer,
        isLoading,
      }),
    [controlsContainer, hiddenVariables, isLoading, props, effectiveQueryParams]
  );

  return <DashboardPage {...dashboardPageProps} />;
};

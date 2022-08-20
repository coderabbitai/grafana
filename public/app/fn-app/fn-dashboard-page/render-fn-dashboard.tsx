import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { locationService } from '@grafana/runtime';
import { setIntialMountState } from 'app/core/reducers/fn-slice';
import DashboardPage from 'app/features/dashboard/containers/DashboardPage';
import { DashboardRoutes } from 'app/types';

import { FNDashboardProps } from '../types';

export const RenderFNDashboard: React.Component<FNDashboardProps> = (data) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(
      setIntialMountState({
        FNDashboard: true,
        uid: data.uid,
        slug: data.slug,
        theme: data.theme,
        controlsContainer: data.controlsContainer,
        pageTitle: data?.pageTitle || '',
        fnPathname: window.location.pathname,
      })
    );
    locationService.fnPathnameChange(window.location.pathname);
    return () => {};
  }, [data, dispatch]);

  const props = {
    match: {
      params: {
        ...data,
      },
      isExact: true,
      path: '/d/:uid/:slug?',
      url: '',
    },
    // eslint-disable-next-line
    history: {} as any,
    // eslint-disable-next-line
    location: {} as any,
    queryParams: {},
    route: {
      routeName: DashboardRoutes.Normal,
      path: '/d/:uid/:slug?',
      pageClass: 'page-dashboard',
      component: DashboardPage,
    },
  };

  return <DashboardPage isFNDashboard controlsContainer={data.controlsContainer} {...props} />;
};

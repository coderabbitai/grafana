import { CSSObject } from '@emotion/react';

import { GrafanaTheme2 } from '@grafana/data';

import { skeletonAnimation } from '../../utils/skeleton';

export const getSkeletonStyles = (theme: GrafanaTheme2): CSSObject => {
  return {
    '.react-loading-skeleton': skeletonAnimation,
  };
};

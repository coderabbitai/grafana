import { CSSObject } from '@emotion/react';

import { GrafanaTheme2 } from '@grafana/data';

export function getExtraStyles(theme: GrafanaTheme2): CSSObject {
  return {
    // fix white background on intercom in dark mode
    'iframe.intercom-borderless-frame': {
      colorScheme: theme.colors.mode,
    },
  };
}

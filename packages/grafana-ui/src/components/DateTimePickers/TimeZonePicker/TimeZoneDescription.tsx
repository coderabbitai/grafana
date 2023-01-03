import { css } from '@emotion/css';
import React, { PropsWithChildren, useMemo } from 'react';

import { GrafanaTheme, TimeZoneInfo } from '@grafana/data';

import { useTheme, stylesFactory, useTheme2 } from '../../../themes';

interface Props {
  info?: TimeZoneInfo;
}

export const TimeZoneDescription: React.FC<PropsWithChildren<Props>> = ({ info }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const description = useDescription(info);
  const { isDark } = useTheme2();

  if (!info) {
    return null;
  }

  return (
    <div className={styles.description} style={{ color: isDark ? '#F27A40' : '#BF470D' }}>
      {description}
    </div>
  );
};

const useDescription = (info?: TimeZoneInfo): string => {
  return useMemo(() => {
    const parts: string[] = [];

    if (!info) {
      return '';
    }

    if (info.countries.length > 0) {
      const country = info.countries[0];
      parts.push(country.name);
    }

    if (info.abbreviation) {
      parts.push(info.abbreviation);
    }

    return parts.join(', ');
  }, [info]);
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    description: css`
      font-weight: normal;
      font-size: ${theme.typography.size.sm};
      color: ${theme.colors.textWeak};
      white-space: normal;
      text-overflow: ellipsis;
    `,
  };
});

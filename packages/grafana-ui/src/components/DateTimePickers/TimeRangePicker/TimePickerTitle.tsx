import { css } from '@emotion/css';
import { memo, PropsWithChildren } from 'react';

import { GrafanaTheme2 } from '@grafana/data';

import { useStyles2 } from '../../../themes';

const getStyles = (theme: GrafanaTheme2) => {
  return {
    // Section labels read as small-caps eyebrows (Carrot UI convention) so the
    // quick-range values below them stay the dominant text in the popover.
    text: css({
      fontSize: theme.typography.size.xs,
      fontWeight: theme.typography.fontWeightMedium,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: theme.colors.text.secondary,
      margin: 0,
      display: 'flex',
    }),
  };
};

export const TimePickerTitle = memo<PropsWithChildren<{}>>(({ children }) => {
  const styles = useStyles2(getStyles);

  return <h3 className={styles.text}>{children}</h3>;
});

TimePickerTitle.displayName = 'TimePickerTitle';

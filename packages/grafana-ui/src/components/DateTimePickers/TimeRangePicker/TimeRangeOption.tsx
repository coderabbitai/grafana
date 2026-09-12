import { css, cx } from '@emotion/css';
import { memo } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { GrafanaTheme2, TimeOption } from '@grafana/data';

import { useStyles2 } from '../../../themes/ThemeContext';
import { getFocusStyles } from '../../../themes/mixins';

const getStyles = (theme: GrafanaTheme2) => {
  return {
    // Carrot UI list rows: inset pills with a rounded hover/selected surface
    // instead of full-bleed bars butting against the popover edges.
    container: css({
      display: 'flex',
      alignItems: 'center',
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      padding: theme.spacing(0, 1),
    }),
    // Selected uses the neutral secondary surface rather than the brand orange:
    // an orange fill fights the panel accents and hurts label contrast.
    selected: css({
      '& label, & label:hover': {
        background: theme.colors.secondary.main,
        color: theme.colors.text.primary,
        fontWeight: theme.typography.fontWeightMedium,
      },
    }),
    radio: css({
      opacity: 0,
      width: '0 !important',

      '&:focus-visible + label': getFocusStyles(theme),
    }),
    label: css({
      cursor: 'pointer',
      flex: 1,
      padding: theme.spacing(0.75, 1.25),
      borderRadius: theme.shape.radius.default,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: '20px',
      color: theme.colors.text.secondary,
      transition: theme.transitions.create(['background-color', 'color'], {
        duration: theme.transitions.duration.shortest,
      }),

      '&:hover': {
        background: theme.colors.action.hover,
        color: theme.colors.text.primary,
        cursor: 'pointer',
      },
    }),
  };
};

interface Props {
  value: TimeOption;
  selected?: boolean;
  onSelect: (option: TimeOption) => void;
  /**
   *  Input identifier. This should be the same for all options in a group.
   */
  name: string;
}

export const TimeRangeOption = memo<Props>(({ value, onSelect, selected = false, name }) => {
  const styles = useStyles2(getStyles);
  // In case there are more of the same timerange in the list
  const id = uuidv4();

  return (
    <li className={cx(styles.container, selected && styles.selected)}>
      <input
        className={styles.radio}
        checked={selected}
        name={name}
        type="checkbox"
        data-role="item"
        tabIndex={-1}
        id={id}
        onChange={() => onSelect(value)}
      />
      <label className={styles.label} htmlFor={id}>
        {value.display}
      </label>
    </li>
  );
});

TimeRangeOption.displayName = 'TimeRangeOption';

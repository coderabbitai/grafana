import { css, cx } from '@emotion/css';
import { MouseEvent, useCallback } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Icon, useStyles2 } from '@grafana/ui';
import { LoadingIndicator } from '@grafana/ui/src/components/PanelChrome/LoadingIndicator';
import { t } from 'app/core/internationalization';

import { getStyles as getTagBadgeStyles } from '../../../../core/components/TagFilter/TagBadge';
import { ALL_VARIABLE_TEXT } from '../../constants';

interface Props {
  onClick: () => void;
  text: string;
  loading: boolean;
  onCancel: () => void;
  disabled?: boolean;
  /**
   *  htmlFor, needed for the label
   */
  id: string;
  /**
   * Optional title rendered as the leading label inside the pill. When
   * provided the pill renders in the carrot-ui Filter style: title + chip.
   */
  label?: string;
}

export const VariableLink = ({
  loading,
  disabled,
  onClick: propsOnClick,
  text,
  onCancel,
  id,
  label,
}: Props) => {
  const isAll = text === ALL_VARIABLE_TEXT;
  const hasValue = !isAll && text.trim().length > 0;
  const styles = useStyles2(getStyles);
  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      propsOnClick();
    },
    [propsOnClick]
  );

  const pillClass = cx(styles.pill, hasValue ? styles.pillActive : styles.pillEmpty);

  if (loading) {
    return (
      <div
        className={pillClass}
        data-testid={selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownValueLinkTexts(`${text}`)}
        title={text}
        id={id}
      >
        {!hasValue && (
          <span aria-hidden className={styles.plusBadge}>
            <Icon name="plus" size="xs" className={styles.plusIcon} />
          </span>
        )}
        {label && <span className={styles.label}>{label}</span>}
        {hasValue && (
          <>
            <span className={styles.divider} aria-hidden />
            <span className={styles.chip}>{text}</span>
          </>
        )}
        <LoadingIndicator loading onCancel={onCancel} />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={pillClass}
      data-testid={selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownValueLinkTexts(`${text}`)}
      aria-expanded={false}
      aria-controls={`options-${id}`}
      id={id}
      title={label ? `${label}: ${text}` : text}
      disabled={disabled}
      type="button"
    >
      {!hasValue && (
        <span aria-hidden className={styles.plusBadge}>
          <Icon name="plus" size="xs" className={styles.plusIcon} />
        </span>
      )}
      {label && <span className={styles.label}>{label}</span>}
      {hasValue ? (
        <>
          <span className={styles.divider} aria-hidden />
          <span className={styles.chip}>{text}</span>
        </>
      ) : !label ? (
        <VariableLinkText text={text} />
      ) : null}
      <Icon aria-hidden name="angle-down" size="sm" className={styles.caret} />
    </button>
  );
};

interface VariableLinkTextProps {
  text: string;
}

const VariableLinkText = ({ text }: VariableLinkTextProps) => {
  const styles = useStyles2(getStyles);
  return (
    <span className={styles.textAndTags}>
      {text === ALL_VARIABLE_TEXT ? t('variable.picker.link-all', 'All') : text}
    </span>
  );
};

// Carrot-ui Filter inspired pill styling. The trigger is a dashed pill when
// no specific value is selected (i.e. the "All" sentinel), and a solid pill
// with a chip when a value is active.
const getStyles = (theme: GrafanaTheme2) => {
  const tagBadgeStyles = getTagBadgeStyles(theme);
  const focusBorderColor = theme.colors.border.strong;

  return {
    pill: css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing(0.75),
      height: theme.spacing(4),
      maxWidth: 500,
      borderRadius: theme.shape.radius.default,
      border: `1px solid ${theme.colors.border.medium}`,
      background: 'transparent',
      color: theme.colors.text.primary,
      font: 'inherit',
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: theme.typography.bodySmall.lineHeight,
      padding: theme.spacing(0, 1.5),
      cursor: 'pointer',
      userSelect: 'none',
      outline: 'none',
      [theme.transitions.handleMotion('no-preference')]: {
        transition: theme.transitions.create(['background', 'border-color', 'box-shadow', 'color'], {
          duration: theme.transitions.duration.short,
        }),
      },

      '&:hover': {
        backgroundColor: theme.colors.action.hover,
      },

      '&:focus, &:focus-visible, &:focus-within': {
        outline: 'none',
        borderColor: focusBorderColor,
        boxShadow: `0 0 0 1px ${focusBorderColor}`,
      },

      [`.${tagBadgeStyles.badge}`]: {
        margin: '0 5px',
      },

      '&:disabled': {
        cursor: 'not-allowed',
        backgroundColor: theme.colors.action.disabledBackground,
        color: theme.colors.action.disabledText,
        borderColor: theme.colors.border.weak,
      },
    }),
    // Empty state — dashed border, no chip
    pillEmpty: css({
      borderStyle: 'dashed',
      borderColor: theme.colors.border.medium,
      padding: theme.spacing(0, 1.5),
    }),
    // Active state — solid border + chip
    pillActive: css({
      borderStyle: 'solid',
      borderColor: theme.colors.border.medium,
      padding: theme.spacing(0.5, 1.25),
      gap: theme.spacing(0.5),
    }),
    label: css({
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeightRegular,
      whiteSpace: 'nowrap',
    }),
    divider: css({
      display: 'inline-block',
      width: 1,
      height: theme.spacing(2),
      backgroundColor: theme.colors.border.medium,
      margin: theme.spacing(0, 0.25),
      flexShrink: 0,
    }),
    chip: css({
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: theme.shape.radius.default,
      backgroundColor: theme.colors.background.secondary,
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      padding: theme.spacing(0.25, 0.75),
      maxWidth: 240,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    caret: css({
      color: theme.colors.text.secondary,
      marginLeft: theme.spacing(0.25),
      flexShrink: 0,
    }),
    plusBadge: css({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 16,
      height: 16,
      borderRadius: theme.shape.radius.circle,
      backgroundColor: theme.colors.background.secondary,
      color: theme.colors.text.secondary,
      marginRight: theme.spacing(0.25),
      flexShrink: 0,
    }),
    plusIcon: css({
      color: theme.colors.text.secondary,
    }),
    textAndTags: css({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      marginRight: theme.spacing(0.25),
      userSelect: 'none',
    }),
  };
};

import { cx, css } from '@emotion/css';
import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';

import { GrafanaTheme2, IconName, isIconName } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';

import { styleMixins, useStyles2 } from '../../themes';
import { getFocusStyles, getMouseFocusStyles } from '../../themes/mixins';
import { IconSize } from '../../types/icon';
import { Icon } from '../Icon/Icon';
import { Tooltip } from '../Tooltip';

type CommonProps = {
  /** Icon name */
  icon?: IconName | React.ReactNode;
  /** Icon size */
  iconSize?: IconSize;
  /** Tooltip */
  tooltip?: string;
  /** For image icons */
  imgSrc?: string;
  /** Alt text for imgSrc */
  imgAlt?: string;
  /** if true or false will show angle-down/up */
  isOpen?: boolean;
  /** Controls flex-grow: 1 */
  fullWidth?: boolean;
  /** reduces padding to xs */
  narrow?: boolean;
  /** variant */
  variant?: ToolbarButtonVariant;
  /** Hide any children and only show icon */
  iconOnly?: boolean;
  /** Show highlight dot */
  isHighlighted?: boolean;
};

export type ToolbarButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { isHidden?: boolean; fnText?: ReactNode };

export type ToolbarButtonVariant = 'default' | 'primary' | 'destructive' | 'active' | 'canvas';

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (
    {
      tooltip,
      icon,
      iconSize,
      className,
      children,
      imgSrc,
      imgAlt,
      fullWidth,
      isOpen,
      narrow,
      variant = 'default',
      iconOnly,
      'aria-label': ariaLabel,
      isHighlighted,
      isHidden,
      fnText = '',
      ...rest
    },
    ref
  ) => {
    const styles = useStyles2(getStyles);

    const buttonStyles = cx(
      {
        [styles.button]: true,
        [styles.buttonFullWidth]: fullWidth,
        [styles.narrow]: narrow,
      },
      styles[variant],
      className
    );

    const contentStyles = cx({
      [styles.content]: true,
      [styles.contentWithIcon]: !!icon,
      [styles.contentWithRightIcon]: isOpen !== undefined,
    });

    const body = (
      <button
        ref={ref}
        className={buttonStyles}
        aria-label={getButtonAriaLabel(ariaLabel, tooltip)}
        aria-expanded={isOpen}
        {...rest}
        style={{
          display: isHidden ? 'none' : '',
        }}
      >
        {renderIcon(icon, iconSize)}
        {imgSrc && <img className={styles.img} src={imgSrc} alt={imgAlt ?? ''} />}
        {children && !iconOnly && <div className={contentStyles}>{children}</div>}
        {isOpen === false && <Icon name="angle-down" />}
        {isOpen === true && <Icon name="angle-up" />}
        {isHighlighted && <div className={styles.highlight} />}
        {fnText !== '' && fnText}
      </button>
    );

    return tooltip ? (
      <Tooltip content={tooltip} placement="bottom-start">
        {body}
      </Tooltip>
    ) : (
      body
    );
  }
);

ToolbarButton.displayName = 'ToolbarButton';

function getButtonAriaLabel(ariaLabel: string | undefined, tooltip: string | undefined) {
  return ariaLabel ? ariaLabel : tooltip ? selectors.components.PageToolbar.item(tooltip) : undefined;
}

function renderIcon(icon: IconName | React.ReactNode, iconSize?: IconSize) {
  if (!icon) {
    return null;
  }

  if (isIconName(icon)) {
    return <Icon name={icon} size={`${iconSize ? iconSize : 'lg'}`} />;
  }

  return icon;
}

const getStyles = (theme: GrafanaTheme2) => {
  // Carrot-UI "outline" surface — used by canvas + active variants. Bordered button
  // on a subtle base-2 fill with a soft shadow, hovering into action.hover.
  const canvasVariant = css({
    color: theme.colors.text.primary,
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    boxShadow: theme.shadows.z1,

    '&:hover': {
      color: theme.colors.text.primary,
      background: theme.colors.action.hover,
      border: `1px solid ${theme.colors.border.medium}`,
    },

    '&:active:not(:disabled)': {
      background: theme.colors.action.hover,
      boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)',
    },
  });

  return {
    button: css({
      label: 'toolbar-button',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: theme.spacing(theme.components.height.md),
      // Carrot-UI uses tighter horizontal padding (8px for md, 6px for narrow).
      padding: theme.spacing(0, 1),
      borderRadius: theme.shape.radius.default,
      lineHeight: `${theme.components.height.md * theme.spacing.gridSize - 2}px`,
      fontWeight: theme.typography.fontWeightMedium,
      whiteSpace: 'nowrap',
      userSelect: 'none',
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        transition: theme.transitions.create(
          ['background-color', 'border-color', 'color', 'box-shadow', 'transform'],
          { duration: theme.transitions.duration.short }
        ),
      },

      '&:focus, &:focus-visible': {
        ...getFocusStyles(theme),
        zIndex: 1,
      },

      '&:focus:not(:focus-visible)': getMouseFocusStyles(theme),

      '&[disabled], &:disabled': {
        cursor: 'not-allowed',
        opacity: theme.colors.action.disabledOpacity,
        background: theme.colors.action.disabledBackground,
        boxShadow: 'none',

        '&:hover': {
          color: theme.colors.text.disabled,
          background: theme.colors.action.disabledBackground,
          boxShadow: 'none',
        },
      },
    }),
    // Default toolbar surface — Carrot-UI "outline" treatment: subtle base-2 fill,
    // 1px weak border, soft shadow; hover lifts to action.hover + medium border.
    default: css({
      color: theme.colors.text.secondary,
      background: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.weak}`,
      boxShadow: theme.shadows.z1,

      '&:hover': {
        color: theme.colors.text.primary,
        background: theme.colors.action.hover,
        border: `1px solid ${theme.colors.border.medium}`,
      },

      '&:active:not(:disabled)': {
        background: theme.colors.action.hover,
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)',
      },
    }),
    canvas: canvasVariant,
    active: cx(
      canvasVariant,
      css({
        // Brand accent underline — kept as a Grafana-specific signature on top of
        // the carrot-ui outline surface to indicate the active toolbar item.
        '&::before': {
          display: 'block',
          content: '" "',
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          bottom: 0,
          borderRadius: theme.shape.radius.default,
          backgroundImage: theme.colors.gradients.brandHorizontal,
        },
      })
    ),
    // Carrot-UI styled toolbar accent — keeps the outline surface but uses the
    // primary accent colour for text + a brand-gradient bottom underline so it
    // reads as a CTA without overwhelming the toolbar with a solid orange fill.
    primary: css({
      color: theme.colors.primary.text,
      background: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.weak}`,
      boxShadow: theme.shadows.z1,

      '&:hover': {
        color: theme.colors.primary.text,
        background: theme.colors.action.hover,
        border: `1px solid ${theme.colors.primary.borderTransparent}`,
      },

      '&:active:not(:disabled)': {
        background: theme.colors.action.hover,
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)',
      },

      // Brand accent underline to signal a primary/CTA toolbar control.
      '&::before': {
        display: 'block',
        content: '" "',
        position: 'absolute',
        left: 0,
        right: 0,
        height: '2px',
        bottom: 0,
        borderRadius: theme.shape.radius.default,
        backgroundImage: theme.colors.gradients.brandHorizontal,
      },
    }),
    // Destructive toolbar accent — outline surface tinted with error colour for
    // text and a matching bottom stripe; avoids a heavy solid red fill that
    // doesn't fit the carrot-ui toolbar visual language.
    destructive: css({
      color: theme.colors.error.text,
      background: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.weak}`,
      boxShadow: theme.shadows.z1,

      '&:hover': {
        color: theme.colors.error.text,
        background: theme.colors.action.hover,
        border: `1px solid ${theme.colors.error.borderTransparent}`,
      },

      '&:active:not(:disabled)': {
        background: theme.colors.action.hover,
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)',
      },

      '&::before': {
        display: 'block',
        content: '" "',
        position: 'absolute',
        left: 0,
        right: 0,
        height: '2px',
        bottom: 0,
        borderRadius: theme.shape.radius.default,
        background: theme.colors.error.main,
      },
    }),
    narrow: css({
      padding: theme.spacing(0, 0.75),
    }),
    img: css({
      width: '16px',
      height: '16px',
      marginRight: theme.spacing(1),
    }),
    buttonFullWidth: css({
      flexGrow: 1,
    }),
    content: css({
      flexGrow: 1,
    }),
    contentWithIcon: css({
      display: 'none',
      paddingLeft: theme.spacing(1),

      [`@media ${styleMixins.mediaUp(theme.v1.breakpoints.md)}`]: {
        display: 'block',
      },
    }),
    contentWithRightIcon: css({
      paddingRight: theme.spacing(0.5),
    }),
    highlight: css({
      backgroundColor: theme.colors.success.main,
      borderRadius: theme.shape.radius.circle,
      width: '6px',
      height: '6px',
      position: 'absolute',
      top: '-3px',
      right: '-3px',
      zIndex: 1,
    }),
  };
};

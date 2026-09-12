import { css, cx } from '@emotion/css';
import { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import * as React from 'react';

import { GrafanaTheme2, ThemeRichColor } from '@grafana/data';

import { useTheme2 } from '../../themes';
import { getFocusStyles, getMouseFocusStyles } from '../../themes/mixins';
import { ComponentSize, IconSize, IconType } from '../../types';
import { IconName } from '../../types/icon';
import { getPropertiesForButtonSize } from '../Forms/commonStyles';
import { Icon } from '../Icon/Icon';
import { PopoverContent, Tooltip, TooltipPlacement } from '../Tooltip';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'success';
export const allButtonVariants: ButtonVariant[] = ['primary', 'secondary', 'destructive'];
export type ButtonFill = 'solid' | 'outline' | 'text' | 'ghost';
export const allButtonFills: ButtonFill[] = ['solid', 'outline', 'text'];

type CommonProps = {
  size?: ComponentSize;
  variant?: ButtonVariant;
  fill?: ButtonFill;
  icon?: IconName | React.ReactElement;
  className?: string;
  children?: React.ReactNode;
  fullWidth?: boolean;
  type?: string;
  /** Tooltip content to display on hover */
  tooltip?: PopoverContent;
  /** Position of the tooltip */
  tooltipPlacement?: TooltipPlacement;
};

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fill = 'solid',
      icon,
      fullWidth,
      children,
      className,
      type = 'button',
      tooltip,
      disabled,
      tooltipPlacement,
      onClick,
      ...otherProps
    },
    ref
  ) => {
    const theme = useTheme2();
    const styles = getButtonStyles({
      theme,
      size,
      variant,
      fill,
      fullWidth,
      iconOnly: !children,
    });

    const buttonStyles = cx(
      styles.button,
      {
        [styles.disabled]: disabled,
      },
      className
    );

    const hasTooltip = Boolean(tooltip);

    // In order to standardise Button please always consider using IconButton when you need a button with an icon only
    // When using tooltip, ref is forwarded to Tooltip component instead for https://github.com/grafana/grafana/issues/65632
    const button = (
      <button
        className={buttonStyles}
        type={type}
        onClick={disabled ? undefined : onClick}
        {...otherProps}
        // In order for the tooltip to be accessible when disabled,
        // we need to set aria-disabled instead of the native disabled attribute
        aria-disabled={hasTooltip && disabled}
        disabled={!hasTooltip && disabled}
        ref={tooltip ? undefined : ref}
      >
        <IconRenderer icon={icon} size={size} className={styles.icon} />
        {children && <span className={styles.content}>{children}</span>}
      </button>
    );

    if (tooltip) {
      return (
        <Tooltip ref={ref} content={tooltip} placement={tooltipPlacement}>
          {button}
        </Tooltip>
      );
    }

    return button;
  }
);

Button.displayName = 'Button';

export type ButtonLinkProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> &
  AnchorHTMLAttributes<HTMLAnchorElement>;

export const LinkButton = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fill = 'solid',
      icon,
      fullWidth,
      children,
      className,
      onBlur,
      onFocus,
      disabled,
      tooltip,
      tooltipPlacement,
      ...otherProps
    },
    ref
  ) => {
    const theme = useTheme2();
    const styles = getButtonStyles({
      theme,
      fullWidth,
      size,
      variant,
      fill,
      iconOnly: !children,
    });

    const linkButtonStyles = cx(
      styles.button,
      {
        [css(styles.disabled, {
          pointerEvents: 'none',
        })]: disabled,
      },
      className
    );

    // When using tooltip, ref is forwarded to Tooltip component instead for https://github.com/grafana/grafana/issues/65632
    const button = (
      <a
        className={linkButtonStyles}
        {...otherProps}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        ref={tooltip ? undefined : ref}
      >
        <IconRenderer icon={icon} size={size} className={styles.icon} />
        {children && <span className={styles.content}>{children}</span>}
      </a>
    );

    if (tooltip) {
      return (
        <Tooltip ref={ref} content={tooltip} placement={tooltipPlacement}>
          {button}
        </Tooltip>
      );
    }

    return button;
  }
);

LinkButton.displayName = 'LinkButton';

interface IconRendererProps {
  icon?: IconName | React.ReactElement<{ className?: string; size?: IconSize }>;
  size?: IconSize;
  className?: string;
  iconType?: IconType;
}
export const IconRenderer = ({ icon, size, className, iconType }: IconRendererProps) => {
  if (!icon) {
    return null;
  }
  if (React.isValidElement(icon)) {
    return React.cloneElement(icon, {
      className,
      size,
    });
  }
  return <Icon name={icon} size={size} className={className} type={iconType} />;
};

export interface StyleProps {
  size: ComponentSize;
  variant: ButtonVariant;
  fill?: ButtonFill;
  iconOnly?: boolean;
  theme: GrafanaTheme2;
  fullWidth?: boolean;
  narrow?: boolean;
}

export const getButtonStyles = (props: StyleProps) => {
  const { theme, variant, fill = 'solid', size, iconOnly, fullWidth } = props;
  const { height, padding, fontSize } = getPropertiesForButtonSize(size, theme);
  const variantStyles = getPropertiesForVariant(theme, variant, fill);
  const disabledStyles = getPropertiesForDisabled(theme, variant, fill);
  const focusStyle = getFocusStyles(theme);

  // Carrot-UI uses tighter horizontal padding than Grafana's default. Convert the
  // gridSize-based padding into px and shave off ~25% to match the reference design
  // (sm: 6px, md: 8px, lg: 12px) while still respecting theme.spacing.gridSize for
  // forks that customise it. Subtract the 1px border so the visual padding matches.
  const horizontalPadding = Math.max(theme.spacing.gridSize * padding * 0.75 - 1, 0);

  return {
    button: css({
      label: 'button',
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      fontFamily: theme.typography.fontFamily,
      padding: `0 ${horizontalPadding}px`,
      height: theme.spacing(height),
      // Deduct border from line-height for perfect vertical centering on windows and linux
      lineHeight: `${theme.spacing.gridSize * height - 2}px`,
      verticalAlign: 'middle',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      borderRadius: theme.shape.radius.default,
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        transition: theme.transitions.create(
          ['background-color', 'border-color', 'color', 'box-shadow', 'transform'],
          { duration: theme.transitions.duration.short }
        ),
      },
      '&:focus': focusStyle,
      '&:focus-visible': focusStyle,
      '&:focus:not(:focus-visible)': getMouseFocusStyles(theme),
      ...(fullWidth && {
        flexGrow: 1,
        justifyContent: 'center',
      }),
      ...variantStyles,
      ':disabled': disabledStyles,
      '&[disabled]': disabledStyles,
    }),
    disabled: css(disabledStyles, {
      '&:hover': css(disabledStyles),
    }),
    img: css({
      width: '16px',
      height: '16px',
      margin: theme.spacing(0, 1, 0, 0.5),
    }),
    icon: iconOnly
      ? css({
          // Important not to set margin bottom here as it would override internal icon bottom margin
          marginRight: theme.spacing(-padding / 2),
          marginLeft: theme.spacing(-padding / 2),
        })
      : css({
          marginRight: theme.spacing(padding / 2),
        }),
    content: css({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      height: '100%',
    }),
  };
};

function getButtonVariantStyles(theme: GrafanaTheme2, color: ThemeRichColor, fill: ButtonFill) {
  let outlineBorderColor = color.border;
  let borderColor = 'transparent';
  let hoverBorderColor = 'transparent';

  // Secondary button has some special rules as we lack a theme color token to
  // specify border color for normal button vs border color for outline button.
  if (color.name === 'secondary') {
    borderColor = color.border;
    hoverBorderColor = theme.colors.emphasize(color.border, 0.25);
    outlineBorderColor = theme.colors.border.strong;
  }

  if (fill === 'outline') {
    // Carrot-UI "outline" variant: bordered button on a subtle background fill.
    return {
      background: theme.colors.background.secondary,
      color: color.text,
      border: `1px solid ${outlineBorderColor}`,
      boxShadow: theme.shadows.z1,

      '&:hover': {
        background: theme.colors.action.hover,
        borderColor: theme.colors.emphasize(outlineBorderColor, 0.25),
        color: color.text,
      },

      // Carrot-UI "press" effect: the inner fill insets by 1px on active.
      '&:active:not(:disabled)': {
        background: theme.colors.action.hover,
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)',
      },
    };
  }

  if (fill === 'text') {
    // Carrot-UI "transparent" variant: no background at rest, subtle hover fill.
    return {
      background: 'transparent',
      color: color.text,
      border: '1px solid transparent',

      '&:focus': {
        outline: 'none',
        textDecoration: 'none',
      },

      '&:hover': {
        background: theme.colors.action.hover,
        textDecoration: 'none',
        color: color.text,
      },

      '&:active:not(:disabled)': {
        background: theme.colors.action.hover,
      },
    };
  }

  if (fill === 'ghost') {
    return {
      background: theme.colors.action.hover,
      color: color.text,
      border: `1px solid ${borderColor}`,
      '&:hover': {
        background: theme.colors.action.selected,
        color: color.text,
      },
    };
  }

  // Solid fill — Carrot-UI "primary" / "danger" style: filled with a subtle 1px
  // tonal border, soft shadow, and a colour-shift on hover.
  return {
    background: color.main,
    color: color.contrastText,
    border: `1px solid ${color.border ?? borderColor}`,
    boxShadow: theme.shadows.z1,

    '&:hover': {
      background: color.shade,
      color: color.contrastText,
      borderColor: hoverBorderColor !== 'transparent' ? hoverBorderColor : color.border,
    },

    '&:active:not(:disabled)': {
      background: color.shade,
      boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.12)',
    },
  };
}

function getPropertiesForDisabled(theme: GrafanaTheme2, variant: ButtonVariant, fill: ButtonFill) {
  const disabledStyles = {
    cursor: 'not-allowed',
    boxShadow: 'none',
    color: theme.colors.text.disabled,
    transition: 'none',
    opacity: theme.colors.action.disabledOpacity,
  };

  if (fill === 'text') {
    return {
      ...disabledStyles,
      background: 'transparent',
      border: `1px solid transparent`,
    };
  }

  if (fill === 'outline') {
    return {
      ...disabledStyles,
      background: 'transparent',
      border: `1px solid ${theme.colors.border.weak}`,
    };
  }

  return {
    ...disabledStyles,
    background: theme.colors.action.disabledBackground,
    border: `1px solid transparent`,
  };
}

export function getPropertiesForVariant(theme: GrafanaTheme2, variant: ButtonVariant, fill: ButtonFill) {
  switch (variant) {
    case 'secondary':
      // The seconday button has some special handling as it's outline border is it's default color border
      return getButtonVariantStyles(theme, theme.colors.secondary, fill);

    case 'destructive':
      return getButtonVariantStyles(theme, theme.colors.error, fill);

    case 'success':
      return getButtonVariantStyles(theme, theme.colors.success, fill);

    case 'primary':
    default:
      return getButtonVariantStyles(theme, theme.colors.primary, fill);
  }
}

export const clearButtonStyles = (theme: GrafanaTheme2) => {
  return css({
    background: 'transparent',
    color: theme.colors.text.primary,
    border: 'none',
    padding: 0,
  });
};

export const clearLinkButtonStyles = (theme: GrafanaTheme2) => {
  return css({
    background: 'transparent',
    border: 'none',
    padding: 0,
    fontFamily: 'inherit',
    color: 'inherit',
    height: '100%',
    '&:hover': {
      background: 'transparent',
      color: 'inherit',
    },
  });
};

import { css } from '@emotion/css';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';
import { FocusScope } from '@react-aria/focus';
import { memo, HTMLAttributes, useState } from 'react';

import { GrafanaTheme2, SelectableValue } from '@grafana/data';

import { useStyles2 } from '../../themes/ThemeContext';
import { Menu } from '../Menu/Menu';
import { MenuItem } from '../Menu/MenuItem';
import { ToolbarButton, ToolbarButtonVariant } from '../ToolbarButton';
import { PopoverContent } from '../Tooltip';

export interface Props<T> extends HTMLAttributes<HTMLButtonElement> {
  className?: string;
  options: Array<SelectableValue<T>>;
  value?: SelectableValue<T>;
  onChange: (item: SelectableValue<T>) => void;
  /** @deprecated use tooltip instead, tooltipContent is not being processed in ToolbarButton*/
  tooltipContent?: PopoverContent;
  narrow?: boolean;
  variant?: ToolbarButtonVariant;
  tooltip?: string;
}

/**
 * @internal
 * A temporary component until we have a proper dropdown component
 */
const ButtonSelectComponent = <T,>(props: Props<T>) => {
  const { className, options, value, onChange, narrow, variant, ...restProps } = props;
  const styles = useStyles2(getStyles);
  const [isOpen, setIsOpen] = useState(false);

  // the order of middleware is important!
  const middleware = [
    // Small vertical gap so the popover clears the trigger button rather than
    // butting up against it (offset(0) previously produced a visually overlapping
    // edge when combined with the negative marginLeft alignment tweak below).
    offset(4),
    flip({
      fallbackAxisSideDirection: 'end',
      // see https://floating-ui.com/docs/flip#combining-with-shift
      crossAxis: false,
      boundary: document.body,
    }),
    shift(),
  ];

  const { context, refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: 'bottom-end',
    // `fixed` positions the floating element relative to the viewport rather
    // than the nearest positioned ancestor. Grafana renders its dashboard
    // controls into whichever DOM node the host app supplies via
    // `controlsContainer` — when that container is deep inside another
    // React tree (e.g. the CodeRabbit dashboard NavHeader slot), the
    // `absolute` strategy anchors on the wrong offset parent and the
    // popover ends up over the trigger. `fixed` sidesteps that entirely
    // because floating-ui's computed coordinates are already viewport-based.
    strategy: 'fixed',
    // Rationale: keep strategy `fixed` so the popover coordinates are
    // computed against the viewport. This is safer when ButtonSelect is
    // rendered into arbitrary containers (like a portalled dashboard
    // controls slot) whose ancestor `transform`/`filter` styles would
    // otherwise become the containing block for `position: absolute`.
    onOpenChange: setIsOpen,
    middleware,
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, click]);

  const onChangeInternal = (item: SelectableValue<T>) => {
    onChange(item);
    setIsOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={refs.setReference}>
      <ToolbarButton
        className={className}
        isOpen={isOpen}
        narrow={narrow}
        variant={variant}
        {...getReferenceProps()}
        {...restProps}
      >
        {value?.label || (value?.value != null ? String(value?.value) : null)}
      </ToolbarButton>
      {isOpen && (
        <FloatingPortal>
          <div className={styles.menuWrapper} ref={refs.setFloating} {...getFloatingProps()} style={floatingStyles}>
            <FocusScope contain autoFocus restoreFocus>
              {/*
                tabIndex=-1 is needed here to support highlighting text within the menu when using FocusScope
                see https://github.com/adobe/react-spectrum/issues/1604#issuecomment-781574668
              */}
              <Menu tabIndex={-1} onClose={() => setIsOpen(false)}>
                {options.map((item) => (
                  <MenuItem
                    key={`${item.value}`}
                    label={item.label ?? String(item.value)}
                    onClick={() => onChangeInternal(item)}
                    active={item.value === value?.value}
                    ariaChecked={item.value === value?.value}
                    ariaLabel={item.ariaLabel || item.label}
                    disabled={item.isDisabled}
                    component={item.component}
                    role="menuitemradio"
                  />
                ))}
              </Menu>
            </FocusScope>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};

ButtonSelectComponent.displayName = 'ButtonSelect';

// needed to properly forward the generic type through React.memo
// see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/37087#issuecomment-656596623
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const ButtonSelect = memo(ButtonSelectComponent) as typeof ButtonSelectComponent;

const getStyles = (theme: GrafanaTheme2) => {
  return {
    wrapper: css({
      position: 'relative',
      display: 'inline-flex',
    }),
    menuWrapper: css({
      zIndex: theme.zIndex.dropdown,
      fontSize: '14px',
      lineHeight: '20px',
    }),
  };
};

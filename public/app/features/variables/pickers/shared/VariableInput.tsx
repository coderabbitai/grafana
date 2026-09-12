import { css, cx } from '@emotion/css';
import { PureComponent } from 'react';
import * as React from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Icon, stylesFactory, withTheme2, Themeable2 } from '@grafana/ui';
import { t } from 'app/core/internationalization';

import { NavigationKey } from '../types';

export interface Props extends Omit<React.HTMLProps<HTMLInputElement>, 'onChange' | 'value'> {
  onChange: (value: string) => void;
  onNavigate: (key: NavigationKey, clearOthers: boolean) => void;
  value: string | null;
}

type ThemedProps = Props & Themeable2;

class UnconnectedVariableInput extends PureComponent<ThemedProps> {
  onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (NavigationKey[event.keyCode] && event.keyCode !== NavigationKey.select) {
      const clearOthers = event.ctrlKey || event.metaKey || event.shiftKey;
      this.props.onNavigate(event.keyCode, clearOthers);
      event.preventDefault();
    }
  };

  onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.props.onChange(event.target.value);
  };

  render() {
    const { value, id, onNavigate, theme, ...restProps } = this.props;
    const styles = getStyles(theme);

    return (
      <div className={styles.wrapper}>
        <Icon name="search" size="sm" className={styles.lens} aria-hidden />
        <input
          {...restProps}
          ref={(instance) => {
            if (instance) {
              instance.focus();
            }
          }}
          id={id}
          type="text"
          className={cx('gf-form-input', styles.input)}
          value={value ?? ''}
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
          placeholder={restProps.placeholder ?? t('variable.dropdown.placeholder', 'Search only')}
        />
      </div>
    );
  }
}

// Override the global `.gf-form-input:focus` orange border so that the variable
// picker keeps a neutral gray border when selected/focused, matching the rest
// of the theme changes (see VariableLink.tsx). Same style regardless of FN mode.
const getStyles = stylesFactory((theme: GrafanaTheme2) => {
  const focusBorderColor = theme.colors.border.strong;

  return {
    wrapper: css({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
    }),
    lens: css({
      position: 'absolute',
      left: theme.spacing(1),
      top: '50%',
      transform: 'translateY(-50%)',
      color: theme.colors.text.secondary,
      pointerEvents: 'none',
      zIndex: 1,
    }),
    input: css({
      width: '100%',
      paddingLeft: `${theme.spacing(4)} !important`,
      '&:focus, &:focus-visible': {
        borderColor: focusBorderColor,
        boxShadow: 'none',
        outline: 'none',
      },
    }),
  };
});

export const VariableInput = withTheme2(UnconnectedVariableInput);

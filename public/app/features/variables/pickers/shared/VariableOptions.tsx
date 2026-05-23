import { css, cx } from '@emotion/css';
import { PureComponent } from 'react';
import * as React from 'react';

import { GrafanaTheme2, VariableOption } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Tooltip, Themeable2, withTheme2, clearButtonStyles, stylesFactory } from '@grafana/ui';
import { Trans, t } from 'app/core/internationalization';

import { ALL_VARIABLE_VALUE } from '../../constants';

export interface Props extends React.HTMLProps<HTMLUListElement>, Themeable2 {
  multi: boolean;
  values: VariableOption[];
  selectedValues: VariableOption[];
  highlightIndex: number;
  onToggle: (option: VariableOption, clearOthers: boolean) => void;
  onToggleAll: () => void;
  /**
   * Used for aria-controls
   */
  id: string;
}

class VariableOptions extends PureComponent<Props> {
  onToggle = (option: VariableOption) => (event: React.MouseEvent<HTMLButtonElement>) => {
    const clearOthers = event.shiftKey || event.ctrlKey || event.metaKey;
    this.handleEvent(event);
    this.props.onToggle(option, clearOthers);
  };

  onToggleAll = (event: React.MouseEvent<HTMLButtonElement>) => {
    this.handleEvent(event);
    this.props.onToggleAll();
  };

  handleEvent(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  render() {
    // Don't want to pass faulty rest props to the div
    const { multi, values, highlightIndex, selectedValues, onToggle, onToggleAll, theme, ...restProps } = this.props;
    const styles = getStyles(theme);

    return (
      <div className={styles.variableValueDropdown}>
        <div className={styles.variableOptionsWrapper}>
          <ul
            className={styles.variableOptionsColumn}
            aria-label={selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownDropDown}
            {...restProps}
          >
            {this.renderMultiToggle()}
            {values.map((option, index) => this.renderOption(option, index))}
          </ul>
        </div>
      </div>
    );
  }

  renderOption(option: VariableOption, index: number) {
    const { highlightIndex, multi, theme } = this.props;
    const styles = getStyles(theme);

    const isAllOption = option.value === ALL_VARIABLE_VALUE;

    return (
      <li key={`${option.value}`}>
        <button
          data-testid={selectors.components.Variables.variableOption}
          role="checkbox"
          type="button"
          aria-checked={option.selected}
          className={cx(
            clearButtonStyles(theme),
            styles.variableOption,
            {
              [styles.highlighted]: index === highlightIndex,
              [styles.variableAllOption]: isAllOption,
            },
            styles.noStyledButton
          )}
          onClick={this.onToggle(option)}
        >
          <span
            className={cx(styles.variableOptionIcon, {
              [styles.variableOptionIconSelected]: option.selected,
              [styles.hideVariableOptionIcon]: !multi,
            })}
          ></span>
          <span data-testid={selectors.pages.Dashboard.SubMenu.submenuItemValueDropDownOptionTexts(`${option.text}`)}>
            {isAllOption ? t('variable.picker.option-all', 'All') : option.text}
          </span>
        </button>
      </li>
    );
  }

  renderMultiToggle() {
    const { multi, selectedValues, theme, values } = this.props;
    const styles = getStyles(theme);
    const isAllOptionConfigured = values.some((option) => option.value === ALL_VARIABLE_VALUE);

    if (!multi) {
      return null;
    }

    const tooltipContent = () => <Trans i18nKey="variable.picker.option-tooltip">Clear selections</Trans>;
    return (
      <Tooltip content={tooltipContent} placement={'top'}>
        <button
          className={cx(
            clearButtonStyles(theme),
            styles.variableOption,
            styles.variableOptionColumnHeader,
            styles.noStyledButton,
            { [styles.noPaddingBotton]: isAllOptionConfigured }
          )}
          role="checkbox"
          aria-checked={selectedValues.length > 1 ? 'mixed' : 'false'}
          onClick={this.onToggleAll}
          aria-label="Toggle all values"
          data-placement="top"
        >
          <span
            className={cx(styles.variableOptionIcon, {
              [styles.variableOptionIconManySelected]: selectedValues.length > 1,
            })}
          ></span>
          <Trans i18nKey="variable.picker.option-selected-values">Selected</Trans> ({selectedValues.length})
        </button>
      </Tooltip>
    );
  }
}

const getStyles = stylesFactory((theme: GrafanaTheme2) => {
  return {
    hideVariableOptionIcon: css({
      display: 'none',
    }),
    highlighted: css({
      backgroundColor: theme.colors.action.hover,
    }),
    noStyledButton: css({
      width: '100%',
      textAlign: 'left',
    }),
    variableOption: css({
      alignItems: 'center',
      borderRadius: theme.shape.radius.default,
      color: theme.colors.text.primary,
      display: 'flex',
      minHeight: theme.spacing(3.5),
      gap: theme.spacing(1),
      padding: theme.spacing(0.5, 1),
      position: 'relative',
      whiteSpace: 'nowrap',
      minWidth: '115px',
      [theme.transitions.handleMotion('no-preference')]: {
        transition: theme.transitions.create(['background', 'color'], {
          duration: theme.transitions.duration.short,
        }),
      },
      ['&:hover']: {
        backgroundColor: theme.colors.action.hover,
      },
    }),
    variableOptionColumnHeader: css({
      paddingTop: '5px',
      paddingBottom: '5px',
      marginBottom: '5px',
    }),
    variableOptionIcon: css({
      display: 'inline-block',
      width: '14px',
      height: '14px',
      position: 'relative',
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.borderRadius(0.75),
      backgroundColor: 'transparent',
      flexShrink: 0,
    }),
    variableOptionIconManySelected: css({
      '&::after': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: '2px',
        right: '2px',
        height: '2px',
        transform: 'translateY(-50%)',
        backgroundColor: theme.colors.text.primary,
      },
    }),
    variableOptionIconSelected: css({
      backgroundColor: theme.colors.primary.main,
      borderColor: theme.colors.primary.main,

      '&::after': {
        content: '""',
        position: 'absolute',
        left: '3px',
        top: '0px',
        width: '5px',
        height: '9px',
        border: `solid ${theme.colors.getContrastText(theme.colors.primary.main)}`,
        borderWidth: '0 2px 2px 0',
        transform: 'rotate(45deg)',
      },
    }),
    variableValueDropdown: css({
      backgroundColor: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      boxShadow: theme.shadows.z2,
      position: 'absolute',
      top: `calc(${theme.spacing(theme.components.height.md)} + ${theme.spacing(0.5)})`,
      maxHeight: '400px',
      minHeight: '150px',
      minWidth: '150px',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: theme.spacing(0.5),
      zIndex: theme.zIndex.typeahead,
    }),
    variableOptionsColumn: css({
      maxHeight: '350px',
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.25),
      lineHeight: theme.typography.body.lineHeight,
      listStyleType: 'none',
    }),
    variableOptionsWrapper: css({
      display: 'block',
      width: '100%',
    }),
    variableAllOption: css({
      borderBottom: `1px solid ${theme.colors.border.weak}`,
      paddingBottom: theme.spacing(1),
    }),

    noPaddingBotton: css({
      paddingBottom: 0,
    }),
  };
});

export default withTheme2(VariableOptions);

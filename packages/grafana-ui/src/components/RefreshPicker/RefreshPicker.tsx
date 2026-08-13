import { css, cx, keyframes } from '@emotion/css';
import { formatDuration } from 'date-fns';
import { PureComponent } from 'react';

import { ArrowPathIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/16/solid';

import { GrafanaTheme2, SelectableValue, parseDuration } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';

import { stylesFactory, withTheme2 } from '../../themes';
import { Themeable2 } from '../../types/theme';
import { t } from '../../utils/i18n';
import { ButtonSelect } from '../Dropdown/ButtonSelect';
import { ToolbarButtonVariant, ToolbarButton } from '../ToolbarButton';

// Default intervals used in the refresh picker component
export const defaultIntervals = ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'];

export interface Props {
  intervals?: string[];
  onRefresh?: () => void;
  onIntervalChanged: (interval: string) => void;
  value?: string;
  tooltip?: string;
  isLoading?: boolean;
  isLive?: boolean;
  text?: string;
  noIntervalPicker?: boolean;
  showAutoInterval?: boolean;
  width?: string;
  primary?: boolean;
  isOnCanvas?: boolean;
  isFnDashboard?: boolean;
}

const refreshPickerOffOption = {
  label: 'Off',
  value: '',
  ariaLabel: 'Turn off auto refresh',
};
const refreshPickerLiveOption = {
  label: 'Live',
  value: 'LIVE',
  ariaLabel: 'Turn on live streaming',
};
const refreshPickerAutoOption = {
  label: 'Auto',
  value: 'auto',
  ariaLabel: 'Select refresh from the query range',
};

class UnThemedRefreshPicker extends PureComponent<Props & Themeable2> {
  static offOption = refreshPickerOffOption;
  static liveOption = refreshPickerLiveOption;
  static autoOption = refreshPickerAutoOption;

  static isLive = (refreshInterval?: string): boolean => refreshInterval === refreshPickerLiveOption.value;

  constructor(props: Props & Themeable2) {
    super(props);
  }

  onChangeSelect = (item: SelectableValue<string>) => {
    const { onIntervalChanged } = this.props;
    if (onIntervalChanged && item.value != null) {
      onIntervalChanged(item.value);
    }
  };

  getVariant(): ToolbarButtonVariant {
    if (this.props.isLive) {
      return 'primary';
    }

    if (this.props.primary) {
      return 'primary';
    }

    return this.props.isOnCanvas ? 'canvas' : 'default';
  }

  render() {
    const {
      onRefresh,
      intervals,
      tooltip,
      value,
      text,
      isLoading,
      noIntervalPicker,
      width,
      showAutoInterval,
      isFnDashboard,
      theme,
    } = this.props;

    const styles = getStyles(theme);
    const currentValue = value || '';
    const variant = this.getVariant();
    const options = intervalsToOptions({ intervals, showAutoInterval });
    const option = options.find(({ value }) => value === currentValue);
    const translatedOffOption = translateOption(RefreshPicker.offOption.value);
    let selectedValue = option || translatedOffOption;

    if (selectedValue.label === translatedOffOption.label) {
      selectedValue = { value: '' };
    }

    const durationAriaLabel = selectedValue.ariaLabel;
    const ariaLabelDurationSelectedMessage = t(
      'refresh-picker.aria-label.duration-selected',
      'Choose refresh time interval with current interval {{durationAriaLabel}} selected',
      { durationAriaLabel }
    );
    const ariaLabelChooseIntervalMessage = t(
      'refresh-picker.aria-label.choose-interval',
      'Auto refresh turned off. Choose refresh time interval'
    );
    const ariaLabel = selectedValue.value === '' ? ariaLabelChooseIntervalMessage : ariaLabelDurationSelectedMessage;

    const tooltipIntervalSelected = t('refresh-picker.tooltip.interval-selected', 'Set auto refresh interval');
    const tooltipAutoRefreshOff = t('refresh-picker.tooltip.turned-off', 'Auto refresh off');
    const tooltipAutoRefresh = selectedValue.value === '' ? tooltipAutoRefreshOff : tooltipIntervalSelected;
    const refreshIcon = isFnDashboard ? (
      <ArrowPathIcon className={cx(styles.fnButtonIcon, isLoading && styles.fnLoadingIcon)} aria-hidden="true" />
    ) : isLoading ? (
      'spinner'
    ) : (
      'sync'
    );
    const intervalTrailing = isFnDashboard
      ? (isOpen: boolean) => (
          <span className={styles.fnTrailing}>
            {selectedValue.value ? <span className={styles.fnSelectedDot} aria-hidden="true" /> : null}
            {isOpen ? (
              <ChevronUpIcon className={styles.fnButtonIcon} aria-hidden="true" />
            ) : (
              <ChevronDownIcon className={styles.fnButtonIcon} aria-hidden="true" />
            )}
          </span>
        )
      : undefined;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="refresh-picker">
        <ToolbarButton
          aria-label={text}
          tooltip={tooltip}
          onClick={onRefresh}
          variant={variant}
          icon={refreshIcon}
          style={width ? { width } : undefined}
          className={isFnDashboard ? styles.fnToolbarButton : undefined}
          data-testid={selectors.components.RefreshPicker.runButtonV2}
        >
          {text}
        </ToolbarButton>
        {!noIntervalPicker && (
          <ButtonSelect
            value={selectedValue}
            options={options}
            onChange={this.onChangeSelect}
            variant={variant}
            className={isFnDashboard ? styles.fnToolbarButton : undefined}
            data-testid={selectors.components.RefreshPicker.intervalButtonV2}
            aria-label={ariaLabel}
            tooltip={tooltipAutoRefresh}
            trailingContent={intervalTrailing}
            hideDefaultOpenIcon={isFnDashboard}
          />
        )}
      </div>
    );
  }
}

type RefreshPickerStatics = {
  offOption: typeof UnThemedRefreshPicker.offOption;
  liveOption: typeof UnThemedRefreshPicker.liveOption;
  autoOption: typeof UnThemedRefreshPicker.autoOption;
  isLive: typeof UnThemedRefreshPicker.isLive;
};

export const RefreshPicker = withTheme2<Props & Themeable2, RefreshPickerStatics>(UnThemedRefreshPicker);

export function translateOption(option: string) {
  switch (option) {
    case refreshPickerLiveOption.value:
      return {
        label: t('refresh-picker.live-option.label', 'Live'),
        value: option,
        ariaLabel: t('refresh-picker.live-option.aria-label', 'Turn on live streaming'),
      };
    case refreshPickerOffOption.value:
      return {
        label: t('refresh-picker.off-option.label', 'Off'),
        value: option,
        ariaLabel: t('refresh-picker.off-option.aria-label', 'Turn off auto refresh'),
      };
    case refreshPickerAutoOption.value:
      return {
        label: t('refresh-picker.auto-option.label', refreshPickerAutoOption.label),
        value: option,
        ariaLabel: t('refresh-picker.auto-option.aria-label', refreshPickerAutoOption.ariaLabel),
      };
  }
  return {
    label: option,
    value: option,
  };
}

export function intervalsToOptions({
  intervals = defaultIntervals,
  showAutoInterval = false,
}: { intervals?: string[]; showAutoInterval?: boolean } = {}): Array<SelectableValue<string>> {
  const options: Array<SelectableValue<string>> = intervals.map((interval) => {
    const duration = parseDuration(interval);
    const ariaLabel = formatDuration(duration);

    return {
      label: interval,
      value: interval,
      ariaLabel: ariaLabel,
    };
  });

  if (showAutoInterval) {
    options.unshift(translateOption(refreshPickerAutoOption.value));
  }
  options.unshift(translateOption(refreshPickerOffOption.value));
  return options;
}

const rotate = keyframes({
  from: {
    transform: 'rotate(0deg)',
  },
  to: {
    transform: 'rotate(360deg)',
  },
});

const getStyles = stylesFactory((theme: GrafanaTheme2) => {
  return {
    fnToolbarButton: css({
      color: theme.colors.text.primary,
      background: theme.colors.background.primary,
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      boxShadow: theme.shadows.z1,

      '&::before': {
        display: 'none',
      },

      '&:hover': {
        color: theme.colors.text.primary,
        background: theme.colors.action.hover,
        borderColor: theme.colors.border.medium,
      },

      '&:active:not(:disabled)': {
        background: theme.colors.action.hover,
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)',
      },
    }),
    fnButtonIcon: css({
      width: 16,
      height: 16,
      flexShrink: 0,
      color: 'currentColor',
    }),
    fnLoadingIcon: css({
      animation: `${rotate} 1s linear infinite`,
    }),
    fnTrailing: css({
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      marginLeft: theme.spacing(0.5),
      color: theme.colors.text.secondary,
    }),
    fnSelectedDot: css({
      width: 4,
      height: 4,
      borderRadius: theme.shape.radius.circle,
      background: theme.colors.text.secondary,
    }),
  };
});

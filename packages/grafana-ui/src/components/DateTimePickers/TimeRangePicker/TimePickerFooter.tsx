import { css, cx } from '@emotion/css';
import { isString } from 'lodash';
import { useCallback, useId, useState } from 'react';
import * as React from 'react';

import { getTimeZoneInfo, GrafanaTheme2, TimeZone } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';

import { stylesFactory, useStyles2, useTheme2 } from '../../../themes';
import { t, Trans } from '../../../utils/i18n';
import { Button } from '../../Button';
import { Field } from '../../Forms/Field';
import { Select } from '../../Select/Select';
import { Tab, TabContent, TabsBar } from '../../Tabs';
import { TimeZonePicker } from '../TimeZonePicker';
import { TimeZoneDescription } from '../TimeZonePicker/TimeZoneDescription';
import { TimeZoneOffset } from '../TimeZonePicker/TimeZoneOffset';
import { TimeZoneTitle } from '../TimeZonePicker/TimeZoneTitle';
import { monthOptions } from '../options';

interface Props {
  timeZone?: TimeZone;
  fiscalYearStartMonth?: number;
  timestamp?: number;
  onChangeTimeZone: (timeZone: TimeZone) => void;
  onChangeFiscalYearStartMonth?: (month: number) => void;
}

export const TimePickerFooter = (props: Props) => {
  const {
    timeZone,
    fiscalYearStartMonth,
    timestamp = Date.now(),
    onChangeTimeZone,
    onChangeFiscalYearStartMonth,
  } = props;
  const [isEditing, setEditing] = useState(false);
  const [editMode, setEditMode] = useState('tz');
  const theme = useTheme2();

  const timeSettingsId = useId();
  const timeZoneSettingsId = useId();
  const fiscalYearSettingsId = useId();

  const onToggleChangeTimeSettings = useCallback(
    (event?: React.MouseEvent) => {
      if (event) {
        event.stopPropagation();
      }
      setEditing(!isEditing);
    },
    [isEditing, setEditing]
  );

  const style = useStyles2(getStyle);

  if (!isString(timeZone)) {
    return null;
  }

  const info = getTimeZoneInfo(timeZone, timestamp);

  if (!info) {
    return null;
  }

  const fnColor = theme.colors.text.secondary;

  return (
    <div>
      <section
        aria-label={t('time-picker.footer.time-zone-selection', 'Time zone selection')}
        className={style.container}
      >
        <div className={style.timeZoneContainer}>
          <div className={style.timeZone}>
            <TimeZoneTitle title={info.name} />
            <div className={style.spacer} />
            <TimeZoneDescription info={info} />
          </div>
          <TimeZoneOffset timeZone={timeZone} timestamp={timestamp} />
        </div>
        <div className={style.spacer} />
        <Button
          onClick={onToggleChangeTimeSettings}
          size="md"
          style={{
            backgroundColor: '#ffffff00',
            color: fnColor,
            border: `1px solid ${fnColor}`,
          }}
        >
          <Trans i18nKey="time-picker.footer.change-settings-button">Change time settings</Trans>
        </Button>
      </section>
      {isEditing ? (
        <div className={style.editContainer} id={timeSettingsId}>
          <div className={style.tabsOverride}>
            <TabsBar>
              <Tab
                label={t('time-picker.footer.time-zone-option', 'Time zone')}
                active={editMode === 'tz'}
                onChangeTab={() => {
                  setEditMode('tz');
                }}
                aria-controls={timeZoneSettingsId}
              />
              <Tab
                label={t('time-picker.footer.fiscal-year-option', 'Fiscal year')}
                active={editMode === 'fy'}
                onChangeTab={() => {
                  setEditMode('fy');
                }}
                aria-controls={fiscalYearSettingsId}
              />
            </TabsBar>
          </div>
          <TabContent>
            {editMode === 'tz' ? (
              <section
                role="tabpanel"
                data-testid={selectors.components.TimeZonePicker.containerV2}
                id={timeZoneSettingsId}
                className={cx(style.timeZoneContainer, style.timeSettingContainer)}
              >
                <TimeZonePicker
                  includeInternal={true}
                  onChange={(timeZone) => {
                    onToggleChangeTimeSettings();

                    if (isString(timeZone)) {
                      onChangeTimeZone(timeZone);
                    }
                  }}
                  onBlur={onToggleChangeTimeSettings}
                  menuShouldPortal={false}
                />
              </section>
            ) : (
              <section
                role="tabpanel"
                data-testid={selectors.components.TimeZonePicker.containerV2}
                id={fiscalYearSettingsId}
                className={cx(style.timeZoneContainer, style.timeSettingContainer)}
              >
                <Field
                  className={style.fiscalYearField}
                  label={t('time-picker.footer.fiscal-year-start', 'Fiscal year start month')}
                >
                  <Select
                    value={fiscalYearStartMonth}
                    menuShouldPortal={false}
                    options={monthOptions}
                    onChange={(value) => {
                      if (onChangeFiscalYearStartMonth) {
                        onChangeFiscalYearStartMonth(value.value ?? 0);
                      }
                    }}
                  />
                </Field>
              </section>
            )}
          </TabContent>
        </div>
      ) : null}
    </div>
  );
};

const getStyle = stylesFactory((theme: GrafanaTheme2) => {
  return {
    // Footer reads as a distinct utility bar: recessed surface, hairline top rule.
    // `:last-child` keeps the rounding on whichever block actually ends the popover
    // (this bar when collapsed, the edit panel when the settings are expanded).
    container: css({
      borderTop: `1px solid ${theme.colors.border.weak}`,
      background: theme.colors.background.secondary,
      padding: theme.spacing(1.5),
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: '20px',
      '&:last-child': {
        borderBottomLeftRadius: theme.shape.borderRadius(3),
        borderBottomRightRadius: theme.shape.borderRadius(3),
      },
      '& button': {
        borderRadius: theme.shape.radius.default,
      },
    }),
    editContainer: css({
      borderTop: `1px solid ${theme.colors.border.weak}`,
      background: theme.colors.background.secondary,
      padding: theme.spacing(1.5),
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: '20px',
      // Round the trailing corners to match the popover instead of relying on the
      // parent clipping, which would crop the inline select menus.
      borderBottomLeftRadius: theme.shape.borderRadius(3),
      borderBottomRightRadius: theme.shape.borderRadius(3),
    }),
    spacer: css({
      marginLeft: '7px',
    }),
    timeSettingContainer: css({
      paddingTop: theme.spacing(1),
    }),
    fiscalYearField: css({
      marginBottom: 0,
    }),
    timeZoneContainer: css({
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexGrow: 1,
    }),
    timeZone: css({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'baseline',
      flexGrow: 1,
    }),
    // Override the shared Tab component's active underline (which uses the
    // orange brand gradient) with a neutral gray for the time-zone /
    // fiscal-year tabs inside the time-range picker only.
    tabsOverride: css({
      '[role="tab"][aria-selected="true"]': {
        // The shared Tab sets `overflow: hidden` on the active state, which clips
        // its own rounded underline into a boxed outline around the tab. Reset it
        // so only the underline shows.
        overflow: 'visible',
        border: 'none',
        boxShadow: 'none',
      },

      '[role="tab"][aria-selected="true"]::before': {
        backgroundImage: 'none',
        backgroundColor: theme.colors.text.primary,
        // A slim square-cut rule reads as an underline; the inherited 4px/6px-radius
        // bar looked like a stray border sitting under the label.
        height: '2px',
        borderRadius: 0,
      },
    }),
  };
});

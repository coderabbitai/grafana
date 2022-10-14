import React from 'react';
import { useSelector } from 'react-redux';

import { TimeRange, isDateTime, toUtc } from '@grafana/data';
import { TimeRangePickerProps, TimeRangePicker } from '@grafana/ui';
import { FnGlobalState } from 'app/core/reducers/fn-slice';
import { StoreState } from 'app/types';

import { LocalStorageValueProvider } from '../LocalStorageValueProvider';

const LOCAL_STORAGE_KEY = 'grafana.dashboard.timepicker.history';

interface Props extends Omit<TimeRangePickerProps, 'history' | 'theme'> {}

export const TimePickerWithHistory = (props: Props) => {
  return (
    <LocalStorageValueProvider<TimeRange[]> storageKey={LOCAL_STORAGE_KEY} defaultValue={[]}>
      {(values, onSaveToStore) => {
        return (
          <TimeRangePicker
            {...props}
            history={convertIfJson(values)}
            onChange={(value) => {
              onAppendToHistory(value, values, onSaveToStore);
              props.onChange(value);
            }}
            fnText={
              FNDashboard ? (
                <span style={{ color: theme.palette.secondary.light, fontWeight: 700, fontSize: 14, marginLeft: 8 }}>
                  UTC
                </span>
              ) : (
                ''
              )
            }
          />
        );
      }}
    </LocalStorageValueProvider>
  );
};

function convertIfJson(history: TimeRange[]): TimeRange[] {
  return history.map((time) => {
    if (isDateTime(time.from)) {
      return time;
    }

    return {
      from: toUtc(time.from),
      to: toUtc(time.to),
      raw: time.raw,
    };
  });
}

function onAppendToHistory(toAppend: TimeRange, values: TimeRange[], onSaveToStore: (values: TimeRange[]) => void) {
  if (!isAbsolute(toAppend)) {
    return;
  }
  const toStore = limit([toAppend, ...values]);
  onSaveToStore(toStore);
}

function isAbsolute(value: TimeRange): boolean {
  return isDateTime(value.raw.from) || isDateTime(value.raw.to);
}

function limit(value: TimeRange[]): TimeRange[] {
  return value.slice(0, 4);
}

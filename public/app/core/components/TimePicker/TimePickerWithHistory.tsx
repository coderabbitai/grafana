import { isEqual, uniqBy } from 'lodash';
import React, { CSSProperties, FC, useEffect, useRef } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';

import { TimeRange, isDateTime, rangeUtil } from '@grafana/data';
import { TimeRangePickerProps, TimeRangePicker, useTheme2 } from '@grafana/ui';
import { FnGlobalState, updatePartialFnStates } from 'app/core/reducers/fn-slice';
import { StoreState } from 'app/types';

import { LocalStorageValueProvider } from '../LocalStorageValueProvider';

const LOCAL_STORAGE_KEY = 'grafana.dashboard.timepicker.history';

interface Props extends Omit<TimeRangePickerProps, 'history' | 'theme'> {}

// Simplified object to store in local storage
interface TimePickerHistoryItem {
  from: string;
  to: string;
}

// We should only be storing TimePickerHistoryItem, but in the past we also stored TimeRange
type LSTimePickerHistoryItem = TimePickerHistoryItem | TimeRange;

const FnText: React.FC = () => {
  const { FNDashboard } = useSelector<StoreState, FnGlobalState>(({ fnGlobalState }) => fnGlobalState);
  const theme = useTheme2();

  const FN_TEXT_STYLE: CSSProperties = { fontWeight: 700, fontSize: 14, marginLeft: 8 };

  return <>{FNDashboard ? <span style={{ ...FN_TEXT_STYLE, color: theme.colors.warning.main }}>UTC</span> : ''}</>;
};

export const TimePickerWithHistory: FC<Props> = (props) => (
  <LocalStorageValueProvider<LSTimePickerHistoryItem[]> storageKey={LOCAL_STORAGE_KEY} defaultValue={[]}>
    {(rawValues, onSaveToStore) => {
      return <Picker rawValues={rawValues} onSaveToStore={onSaveToStore} pickerProps={props} />;
    }}
  </LocalStorageValueProvider>
);

export interface PickerProps {
  rawValues: LSTimePickerHistoryItem[];
  onSaveToStore: (value: LSTimePickerHistoryItem[]) => void;
  pickerProps: Props;
}

export const Picker: FC<PickerProps> = ({ rawValues, onSaveToStore, pickerProps }) => {
  const { fnGlobalTimeRange } = useSelector<StoreState, FnGlobalState>(({ fnGlobalState }) => fnGlobalState);
  const dispatch = useDispatch();

  const values = migrateHistory(rawValues);
  const history = deserializeHistory(values);

  const didMountRef = useRef(false);
  useEffect(() => {
    /* The condition below skips the first run of useeffect that happens when this component gets mounted */
    if (didMountRef.current) {
      /* If the current timerange value has changed, update fnGlobalTimeRange */
      if (!isEqual(fnGlobalTimeRange?.raw, pickerProps.value.raw)) {
        dispatch(
          updatePartialFnStates({
            fnGlobalTimeRange: pickerProps.value,
          })
        );
      }
    } else if (fnGlobalTimeRange && !isEqual(fnGlobalTimeRange.raw, pickerProps.value.raw)) {
      /* If fnGlobalTimeRange exists in the initial render, set the time as that */
      pickerProps.onChange(fnGlobalTimeRange);
    }

    didMountRef.current = true;
  }, [dispatch, fnGlobalTimeRange, pickerProps]);

  return (
    <TimeRangePicker
      {...pickerProps}
      history={history}
      onChange={(value) => {
        onAppendToHistory(value, values, onSaveToStore);
        pickerProps.onChange(value);
      }}
      fnText={<FnText />}
    />
  );
};

function deserializeHistory(values: TimePickerHistoryItem[]): TimeRange[] {
  // The history is saved in UTC and with the default date format, so we need to pass those values to the convertRawToRange
  return values.map((item) => rangeUtil.convertRawToRange(item, 'utc', undefined, 'YYYY-MM-DD HH:mm:ss'));
}

function migrateHistory(values: LSTimePickerHistoryItem[]): TimePickerHistoryItem[] {
  return values.map((item) => {
    const fromValue = typeof item.from === 'string' ? item.from : item.from.toISOString();
    const toValue = typeof item.to === 'string' ? item.to : item.to.toISOString();

    return {
      from: fromValue,
      to: toValue,
    };
  });
}

function onAppendToHistory(
  newTimeRange: TimeRange,
  values: TimePickerHistoryItem[],
  onSaveToStore: (values: TimePickerHistoryItem[]) => void
) {
  if (!isAbsolute(newTimeRange)) {
    return;
  }

  // Convert DateTime objects to strings
  const toAppend = {
    from: typeof newTimeRange.raw.from === 'string' ? newTimeRange.raw.from : newTimeRange.raw.from.toISOString(),
    to: typeof newTimeRange.raw.to === 'string' ? newTimeRange.raw.to : newTimeRange.raw.to.toISOString(),
  };

  const toStore = limit([toAppend, ...values]);
  onSaveToStore(toStore);
}

function isAbsolute(value: TimeRange): boolean {
  return isDateTime(value.raw.from) || isDateTime(value.raw.to);
}

function limit(value: TimePickerHistoryItem[]): TimePickerHistoryItem[] {
  return uniqBy(value, (v) => v.from + v.to).slice(0, 4);
}

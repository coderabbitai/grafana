import { InlineField, InlineFieldRow, TimeRangeInput } from '@grafana/ui';
import React from 'react';

import { TEST_IDS } from 'app/plugins/panel/volkovlabs-table-panel/constants';
import { ColumnFilterType, ColumnFilterValue } from 'app/plugins/panel/volkovlabs-table-panel/types';

/**
 * Properties
 */
type Value = ColumnFilterValue & { type: ColumnFilterType.TIMESTAMP };

interface Props {
  /**
   * Value
   *
   * @type {Value}
   */
  value: Value;

  /**
   * Change
   */
  onChange: (value: Value) => void;
}

/**
 * Filter Time
 */
export const FilterTime: React.FC<Props> = ({ value: filterValue, onChange }) => {
  return (
    <InlineFieldRow>
      <InlineField label="Time">
        <TimeRangeInput
          value={filterValue.value}
          onChange={(value) => {
            onChange({
              ...filterValue,
              value,
            });
          }}
          clearable={true}
          {...TEST_IDS.filterTime.root.apply()}
        />
      </InlineField>
    </InlineFieldRow>
  );
};

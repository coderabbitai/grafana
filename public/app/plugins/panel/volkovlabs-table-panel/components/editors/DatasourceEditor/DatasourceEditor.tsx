import { Select } from '@grafana/ui';
import React, { useMemo } from 'react';

import { TEST_IDS } from 'app/plugins/panel/volkovlabs-table-panel/constants';
import { useDatasources } from 'app/plugins/panel/volkovlabs-table-panel/hooks';
import { EditorProps } from 'app/plugins/panel/volkovlabs-table-panel/types';

/**
 * Properties
 */
type Props = EditorProps<string>;

/**
 * Data Source Editor
 */
export const DatasourceEditor: React.FC<Props> = ({ value, onChange }) => {
  /**
   * Data Sources
   */
  const datasources = useDatasources();

  /**
   * Options
   */
  const datasourceOptions = useMemo(() => {
    return datasources.map((datasource) => ({
      label: datasource.name,
      value: datasource.uid,
    }));
  }, [datasources]);

  /**
   * Return
   */
  return (
    <Select
      onChange={(item) => {
        onChange(item.value!);
      }}
      options={datasourceOptions}
      value={value}
      {...TEST_IDS.datasourceEditor.fieldSelect.apply()}
    />
  );
};

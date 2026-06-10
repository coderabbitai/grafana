import { StandardEditorProps } from '@grafana/data';
import React from 'react';

import { RequestEditor } from 'app/plugins/panel/volkovlabs-table-panel/components';
import { TEST_IDS } from 'app/plugins/panel/volkovlabs-table-panel/constants';
import { ExternalExportConfig, PanelOptions } from 'app/plugins/panel/volkovlabs-table-panel/types';

/**
 * Properties
 */
type Props = StandardEditorProps<ExternalExportConfig, null, PanelOptions>;

/**
 * Test ids
 */
export const editorTestIds = TEST_IDS.externalExportEditor;

/**
 * External export Editor
 */
export const ExternalExportEditor: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div {...editorTestIds.root.apply()}>
      {value?.enabled && (
        <RequestEditor
          value={
            value?.request ?? {
              datasource: '',
              payload: {},
            }
          }
          onChange={(request) => {
            onChange({
              ...value,
              request: request,
            });
          }}
          queryEditorDescription="Table data placed in variable `${payload}`"
        />
      )}
    </div>
  );
};

import { Collapse } from 'app/plugins/panel/volkovlabs-table-panel/components/VolkovComponents';
import React, { useState } from 'react';

import { FieldsGroup, PermissionEditor, RequestEditor } from 'app/plugins/panel/volkovlabs-table-panel/components';
import { TEST_IDS } from 'app/plugins/panel/volkovlabs-table-panel/constants';
import { nestedObjectsEditorContext } from 'app/plugins/panel/volkovlabs-table-panel/hooks';
import { EditorProps, NestedObjectOperationConfig } from 'app/plugins/panel/volkovlabs-table-panel/types';

/**
 * Properties
 */
type Props = EditorProps<NestedObjectOperationConfig>;

/**
 * Test Ids
 */
const testIds = TEST_IDS.nestedObjectOperationEditor;

/**
 * Nested Object Operation Editor
 */
export const NestedObjectOperationEditor: React.FC<Props> = ({ value, onChange }) => {
  /**
   * Context
   */
  const { data } = nestedObjectsEditorContext.useContext();

  /**
   * Expanded State
   */
  const [expandedState, setExpandedState] = useState({
    request: false,
  });

  return (
    <>
      <FieldsGroup label="Permission">
        <PermissionEditor
          data={data}
          value={value.permission}
          onChange={(permission) => {
            onChange({
              ...value,
              permission,
            });
          }}
        />
      </FieldsGroup>
      <Collapse
        isOpen={expandedState.request}
        onToggle={(isOpen) => {
          setExpandedState({
            ...expandedState,
            request: isOpen,
          });
        }}
        title="Request"
        headerTestId={testIds.requestSectionHeader.selector()}
        contentTestId={testIds.requestSectionContent.selector()}
      >
        <RequestEditor
          value={value.request}
          onChange={(request) => {
            onChange({
              ...value,
              request,
            });
          }}
          queryEditorDescription="Use `${payload.row}` and `${payload.item}` variables to get access to the current item or row."
        />
      </Collapse>
    </>
  );
};

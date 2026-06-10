import { NestedObjectType } from 'app/plugins/panel/volkovlabs-table-panel/types';
import {
  createNestedObjectEditorRegistryItem,
  createNestedObjectEditorsRegistry,
  NestedObjectCardMapper,
} from 'app/plugins/panel/volkovlabs-table-panel/utils';

import { NestedObjectCardsControl, NestedObjectCardsEditor } from './components';

/**
 * Nested Object Editors Registry
 */
export const nestedObjectEditorsRegistry = createNestedObjectEditorsRegistry([
  createNestedObjectEditorRegistryItem({
    id: NestedObjectType.CARDS,
    editor: NestedObjectCardsEditor,
    control: NestedObjectCardsControl,
    getControlOptions: (params) => ({
      ...params,
      type: params.config.type,
      isLoading: params.isLoading,
      mapper: new NestedObjectCardMapper(params.config),
    }),
  }),
]);

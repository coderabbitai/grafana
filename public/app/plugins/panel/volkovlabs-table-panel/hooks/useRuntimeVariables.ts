import { EventBus, TypedVariableModel } from '@grafana/data';
import { useDashboardVariables } from 'app/plugins/panel/volkovlabs-table-panel/components/VolkovComponents';

import { getVariablesMap } from 'app/plugins/panel/volkovlabs-table-panel/utils';

/**
 * Runtime Variables
 * @param eventBus
 * @param variableName
 */
export const useRuntimeVariables = (eventBus: EventBus, variableName: string) => {
  const { variable, getVariable } = useDashboardVariables<TypedVariableModel, Record<string, TypedVariableModel>>({
    eventBus,
    variableName,
    toState: getVariablesMap,
    getOne: (variablesMap, variableName) => variablesMap[variableName],
    initial: {},
  });

  return {
    variable: variable,
    getVariable: getVariable,
  };
};

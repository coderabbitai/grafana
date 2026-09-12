import React, { ReactNode, useCallback, useMemo, useRef } from 'react';

import { DataFrame, Field, LoadingState, SelectableValue, TypedVariableModel } from '@grafana/data';
import { getAppEvents, getDataSourceSrv, getTemplateSrv } from '@grafana/runtime';
import {
  Alert,
  CodeEditor,
  Collapse as GrafanaCollapse,
  Input,
  Slider as GrafanaSlider,
  useStyles2,
} from '@grafana/ui';
import { css } from '@emotion/css';
import { isEqual } from 'lodash';
import { lastValueFrom } from 'rxjs';

interface AlertWithDetailsProps {
  details?: string;
  variant: 'success' | 'warning' | 'error' | 'info';
  title: string;
  onRemove?: (event: React.MouseEvent) => void;
  children?: ReactNode;
}

export const AlertWithDetails = ({ children, details, variant, title, onRemove }: AlertWithDetailsProps) => (
  <Alert severity={variant} title={title} onRemove={onRemove}>
    {children}
    {details && <pre>{details}</pre>}
  </Alert>
);

export const AutosizeCodeEditor = ({
  minHeight = 80,
  maxHeight = 600,
  height,
  ...props
}: React.ComponentProps<typeof CodeEditor> & { minHeight?: number; maxHeight?: number }) => {
  const editorHeight =
    height ?? Math.min(Math.max(String(props.value ?? '').split('\n').length * 18 + 24, minHeight), maxHeight);
  return <CodeEditor {...props} height={editorHeight} />;
};

interface CollapseProps {
  title?: React.ReactElement | string;
  actions?: React.ReactElement;
  children?: React.ReactElement | string;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  headerTestId?: string;
  contentTestId?: string;
  fill?: 'outline' | 'solid';
  isInlineContent?: boolean;
  isExpandDisabled?: boolean;
}

export const Collapse = ({
  title,
  actions,
  children,
  isOpen = false,
  onToggle,
  headerTestId,
  contentTestId,
  isExpandDisabled,
}: CollapseProps) => {
  const styles = useStyles2(getCollapseStyles);
  return (
    <GrafanaCollapse
      label={title ?? ''}
      isOpen={isOpen}
      onToggle={() => !isExpandDisabled && onToggle?.(!isOpen)}
      className={styles.collapse}
    >
      {actions && <div className={styles.actions}>{actions}</div>}
      <div data-testid={contentTestId}>
        <span data-testid={headerTestId} />
        {children}
      </div>
    </GrafanaCollapse>
  );
};

const getCollapseStyles = () => ({
  collapse: css({ marginBottom: 8 }),
  actions: css({ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }),
});

export const NumberInput = ({
  value,
  onChange,
  min,
  max,
  step,
  ...props
}: { value?: number; onChange?: (value: number) => void; min?: number; max?: number; step?: number } & Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange'
>) => (
  <Input
    {...props}
    type="number"
    value={value ?? 0}
    min={min}
    max={max}
    step={step}
    onChange={(event) => onChange?.(Number(event.currentTarget.value))}
  />
);

export const Slider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step,
  disabled,
}: {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) => (
  <GrafanaSlider
    value={value ?? min}
    min={min}
    max={max}
    step={step}
    disabled={disabled}
    onChange={(value) => onChange?.(Number(value))}
  />
);

export const findField = <TValue = unknown,>(
  series: DataFrame[],
  predicateFn: (field: Field, frame: DataFrame) => boolean
): Field<TValue> | undefined => {
  for (const frame of series) {
    const field = frame.fields.find((field) => predicateFn(field, frame));
    if (field) {
      return field as Field<TValue>;
    }
  }
  return undefined;
};

export const useDashboardRefresh = () =>
  useCallback(() => {
    getAppEvents().publish({ type: 'variables-changed', payload: { refreshAll: true } });
  }, []);

export const useDashboardVariables = <TVariable = TypedVariableModel, TState = TVariable[]>({
  variableName,
  getOne,
  toState,
  initial,
}: {
  eventBus: unknown;
  variableName?: string;
  refreshCheckCount?: number;
  refreshCheckInterval?: number;
  getOne: (state: TState, name?: string) => TVariable | undefined;
  toState: (variables: TypedVariableModel[]) => TState;
  initial: TState;
}) => {
  const variables = toState(getTemplateSrv().getVariables());

  /**
   * `toState` builds a new object on every render. Keeping the previous value when it is deeply equal
   * stabilises the identity of everything derived from it (columns, filters), which otherwise causes
   * downstream effects to loop until React reports "Maximum update depth exceeded".
   */
  const variablesRef = useRef(variables);
  if (!isEqual(variablesRef.current, variables)) {
    variablesRef.current = variables;
  }
  const stableVariables = variablesRef.current;

  const variable = useMemo(
    () => getOne(stableVariables ?? initial, variableName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stableVariables, variableName]
  );

  const getVariable = useCallback(
    (name?: string) => getOne(stableVariables ?? initial, name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stableVariables]
  );

  return { variable, variables: stableVariables, getVariable };
};

class DatasourceResponseError extends Error {
  constructor(error: unknown, query: string) {
    super(`${error instanceof Error ? error.message : JSON.stringify(error)}\nRequest: ${query}`);
  }
}

export const useDatasourceRequest = () =>
  useCallback(
    async ({
      query,
      datasource,
      replaceVariables,
      payload,
    }: {
      query: unknown;
      datasource: string;
      replaceVariables: (value: string, scopedVars?: Record<string, SelectableValue>) => string;
      payload?: unknown;
    }) => {
      const ds = await getDataSourceSrv().get(datasource);
      const queryText = replaceVariables(JSON.stringify(query, null, 2), { payload: { value: payload } });
      const parsedQuery = JSON.parse(queryText);
      try {
        const response = ds.query({ targets: [parsedQuery] } as never);
        const result = response instanceof Promise ? await response : await lastValueFrom(response);
        if (result.state === LoadingState.Error) {
          throw result.errors?.[0] ?? result;
        }
        return result;
      } catch (error) {
        throw new DatasourceResponseError(error, queryText);
      }
    },
    []
  );

import { css } from '@emotion/css';
import { CSSProperties, FunctionComponent, PropsWithChildren, ReactElement, useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';

import { GrafanaTheme2, VariableHide } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Tooltip, useStyles2 } from '@grafana/ui';
import { FnGlobalState } from 'app/core/reducers/fn-slice';
import type { StoreState } from 'app/types';

import { variableAdapters } from '../adapters';
import { VariableModel } from '../types';

interface Props {
  variable: VariableModel;
  readOnly?: boolean;
}

// Picker types whose own trigger already renders the variable title inline
// (carrot-ui style pill). For these the standalone external label is hidden
// visually so the title isn't duplicated.
const PICKERS_WITH_INLINE_LABEL = new Set([
  'query',
  'custom',
  'constant',
  'datasource',
  'interval',
  'textbox',
]);

export const PickerRenderer: FunctionComponent<Props> = (props) => {
  const PickerToRender = useMemo(() => variableAdapters.get(props.variable.type).picker, [props.variable]);

  if (!props.variable) {
    return <div>Couldn&apos;t load variable</div>;
  }

  const hasInlineLabel = PICKERS_WITH_INLINE_LABEL.has(props.variable.type);

  return (
    <div className="gf-form">
      <PickerLabel variable={props.variable} visuallyHidden={hasInlineLabel} />
      {props.variable.hide !== VariableHide.hideVariable && PickerToRender && (
        <div>
          <PickerToRender variable={props.variable} readOnly={props.readOnly ?? false} />
        </div>
      )}
    </div>
  );
};

const COMMON_PICKER_LABEL_STYLE: CSSProperties = {
  fontWeight: 500,
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
};

const DEFAULT_PICKER_LABEL_STYLE: CSSProperties = {
  ...COMMON_PICKER_LABEL_STYLE,
  border: 'none',
  padding: '12px 6px',
};

interface PickerLabelProps extends Props {
  visuallyHidden?: boolean;
}

function PickerLabel({ variable, visuallyHidden }: PropsWithChildren<PickerLabelProps>): ReactElement | null {
  const labelOrName = useMemo(() => variable.label || variable.name, [variable]);
  const { FNDashboard } = useSelector<StoreState, FnGlobalState>(({ fnGlobalState }) => fnGlobalState);
  const styles = useStyles2(getStyles);

  const labelStyle = useMemo<CSSProperties>(() => ({ ...DEFAULT_PICKER_LABEL_STYLE }), []);

  if (variable.hide !== VariableHide.dontHide) {
    return null;
  }
  const fnLabelOrName = FNDashboard ? labelOrName.replace('druid_adhoc_filters', 'ad-hoc') : labelOrName;

  const elementId = `var-${variable.id}`;

  // When the picker renders the title inline (carrot-ui pill) we hide the
  // standalone external label visually, but keep it in the DOM for assistive
  // tech and existing e2e selectors.
  const className = visuallyHidden ? styles.visuallyHiddenLabel : 'gf-form-label gf-form-label--variable';
  const style = visuallyHidden ? undefined : labelStyle;

  if (variable.description) {
    return (
      <Tooltip content={variable.description} placement={'bottom'}>
        <label
          className={className}
          style={style}
          data-testid={selectors.pages.Dashboard.SubMenu.submenuItemLabels(labelOrName)}
          htmlFor={elementId}
        >
          {fnLabelOrName}
        </label>
      </Tooltip>
    );
  }
  return (
    <label
      className={className}
      style={style}
      data-testid={selectors.pages.Dashboard.SubMenu.submenuItemLabels(labelOrName)}
      htmlFor={elementId}
    >
      {fnLabelOrName}
    </label>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  // Accessible label that is removed from visual flow without being hidden
  // from screen readers — matches the standard `sr-only` pattern.
  visuallyHiddenLabel: css({
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  }),
});

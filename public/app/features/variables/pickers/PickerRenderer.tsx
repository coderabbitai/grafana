// import { css } from '@emotion/css';
import { CSSProperties, FunctionComponent, PropsWithChildren, ReactElement, useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';

import { VariableHide } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Tooltip } from '@grafana/ui';
import { FnGlobalState } from 'app/core/reducers/fn-slice';
import type { StoreState } from 'app/types';

import { variableAdapters } from '../adapters';
import { VariableModel } from '../types';

interface Props {
  variable: VariableModel;
  readOnly?: boolean;
}

// not using this style  for now.
// const renderWrapperStyle = css`
//   & button,
//   & span,
//   & label,
//   & input {
//     height: 35px;
//     font-size: 14px;
//   }

//   /* Center align filter picker buttons */
//   & button {
//     margin-top: 2px;
//   }

//   /* Adhoc filter: Disable green border and make input height similar to others */
//   & div[class*='input-wrapper'] {
//     min-height: 0 !important;
//     box-shadow: none !important;
//   }
// `;

export const PickerRenderer: FunctionComponent<Props> = (props) => {
  const PickerToRender = useMemo(() => variableAdapters.get(props.variable.type).picker, [props.variable]);

  if (!props.variable) {
    return <div>Couldn&apos;t load variable</div>;
  }

  return (
    <div className="gf-form">
      <PickerLabel variable={props.variable} />
      {props.variable.hide !== VariableHide.hideVariable && PickerToRender && (
        <div>
          <PickerToRender variable={props.variable} readOnly={props.readOnly ?? false} />
        </div>
      )}
    </div>
  );
};

const COMMON_PICKER_LABEL_STYLE: CSSProperties = {
  border: 'none',
  fontWeight: 500,
  fontSize: '14px',
  padding: '12px 6px',
  display: 'flex',
  alignItems: 'center',
};

function PickerLabel({ variable }: PropsWithChildren<Props>): ReactElement | null {
  const labelOrName = useMemo(() => variable.label || variable.name, [variable]);
  const { FNDashboard, mode } = useSelector<StoreState, FnGlobalState>(({ fnGlobalState }) => fnGlobalState);

  const fnLabelStyle = useMemo(
    () => ({
      ...COMMON_PICKER_LABEL_STYLE,
      color: mode === 'light' ? '#2D333E' : '#DBD9D7',
      backgroundColor: '#F6F6F1',
    }),
    [mode]
  );

  if (variable.hide !== VariableHide.dontHide) {
    return null;
  }
  const fnLabelOrName = FNDashboard ? labelOrName.replace('druid_adhoc_filters', 'ad-hoc') : labelOrName;

  const elementId = `var-${variable.id}`;
  if (variable.description) {
    return (
      <Tooltip content={variable.description} placement={'bottom'}>
        <label
          className="gf-form-label gf-form-label--variable"
          style={fnLabelStyle}
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
      className="gf-form-label gf-form-label--variable"
      style={fnLabelStyle}
      data-testid={selectors.pages.Dashboard.SubMenu.submenuItemLabels(labelOrName)}
      htmlFor={elementId}
    >
      {fnLabelOrName}
    </label>
  );
}

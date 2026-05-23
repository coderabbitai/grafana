import { css } from '@emotion/css';
import { useEffect, useState } from 'react';

import { GrafanaTheme2, TypedVariableModel, VariableHide } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { useStyles2 } from '@grafana/ui';
import { useSelector } from 'app/types';

import { PickerRenderer } from '../../../variables/pickers/PickerRenderer';

interface Props {
  variables: TypedVariableModel[];
  readOnly?: boolean;
}

export const SubMenuItems = ({ variables, readOnly }: Props) => {
  const [visibleVariables, setVisibleVariables] = useState<TypedVariableModel[]>([]);

  const hiddenVariables = useSelector((state) => state.fnGlobalState.hiddenVariables);
  const isFnDashboard = useSelector((state) => state.fnGlobalState.FNDashboard);
  const styles = useStyles2(getStyles(isFnDashboard));

  useEffect(() => {
    setVisibleVariables(
      variables.filter((state) => state.hide !== VariableHide.hideVariable && !hiddenVariables?.includes(state.id))
    );
  }, [variables, hiddenVariables]);

  if (visibleVariables.length === 0) {
    return null;
  }

  return (
    <>
      {visibleVariables.map((variable) => {
        return (
          <div
            key={variable.id}
            className={styles.submenuItem}
            data-testid={selectors.pages.Dashboard.SubMenu.submenuItem}
          >
            <PickerRenderer variable={variable} readOnly={readOnly} />
          </div>
        );
      })}
    </>
  );
};

const getStyles = (isFnDashboard: boolean) => (theme: GrafanaTheme2) => ({
  submenuItem: css({
    display: 'inline-flex',
    alignItems: 'center',

    '.fa-caret-down': {
      fontSize: '75%',
      paddingLeft: theme.spacing(1),
    },

    '.gf-form': {
      marginBottom: 0,
    },

    ...(isFnDashboard && {
      '.gf-form': {
        alignItems: 'center',
        display: 'flex',
        marginBottom: 0,
        minHeight: theme.spacing(theme.components.height.md),
      },

      '.gf-form-inline': {
        alignItems: 'center',
        display: 'inline-flex',
        flexWrap: 'wrap',
        gap: theme.spacing(0.75),
      },

      '.gf-form-label--variable': {
        borderBottomRightRadius: 0,
        borderTopRightRadius: 0,
        minHeight: theme.spacing(theme.components.height.md),
      },

      '.gf-form-label--variable + div': {
        display: 'flex',
        minWidth: 0,
      },

      '.gf-form-label--variable + div button, .gf-form-label--variable + div input': {
        borderBottomLeftRadius: 0,
        borderTopLeftRadius: 0,
        marginLeft: '-1px',
      },

      '.gf-form-input': {
        background: theme.colors.background.primary,
        border: `1px solid ${theme.colors.border.weak}`,
        borderRadius: theme.shape.radius.default,
        color: theme.colors.text.primary,
        height: theme.spacing(theme.components.height.md),
      },
    }),
  }),
});

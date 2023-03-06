import { css } from '@emotion/css';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Box, styled } from '@mui/material';
import React, { FC, PureComponent } from 'react';
import { connect, MapStateToProps } from 'react-redux';

import { AnnotationQuery, DataQuery, TypedVariableModel, GrafanaTheme2 } from '@grafana/data';
import { FnGlobalState } from 'app/core/reducers/fn-slice';

import { StoreState } from '../../../../types';
import { getSubMenuVariables, getVariablesState } from '../../../variables/state/selectors';
import { DashboardModel } from '../../state';

import { Annotations } from './Annotations';
import { DashboardLinks } from './DashboardLinks';
import { SubMenuItems } from './SubMenuItems';
// import { VariableModel } from 'app/features/variables/types';
import { Themeable2, stylesFactory, withTheme2 } from '@grafana-ui';
import { DashboardLink } from '@grafana/schema/dist/esm/index';

interface OwnProps extends Themeable2 {
  dashboard: DashboardModel;
  links: DashboardLink[];
  annotations: AnnotationQuery[];
}

interface ConnectedProps {
  variables: TypedVariableModel[];
  hiddenVariables: FnGlobalState['hiddenVariables'];
}

interface DispatchProps {}

type Props = OwnProps & ConnectedProps & DispatchProps;

class SubMenuUnConnected extends PureComponent<Props> {
  onAnnotationStateChanged = (updatedAnnotation: AnnotationQuery<DataQuery>) => {
    // we're mutating dashboard state directly here until annotations are in Redux.
    for (let index = 0; index < this.props.dashboard.annotations.list.length; index++) {
      const annotation = this.props.dashboard.annotations.list[index];
      if (annotation.name === updatedAnnotation.name) {
        annotation.enable = !annotation.enable;
        break;
      }
    }
    this.props.dashboard.startRefresh();
    this.forceUpdate();
  };

  disableSubmitOnEnter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  render() {
    const { dashboard, variables, links, annotations, theme } = this.props;

    const styles = getStyles(theme);

    const readOnlyVariables = dashboard.meta.isSnapshot ?? false;

    return (
      <div className="submenu-controls">
        <form aria-label="Template variables" className={styles}>
          <FilterWithIcon />
          <SubMenuItems
            variables={variables}
            readOnly={readOnlyVariables}
            hiddenVariables={this.props.hiddenVariables}
          />
        </form>
        <Annotations
          annotations={annotations}
          onAnnotationChanged={this.onAnnotationStateChanged}
          events={dashboard.events}
        />
        <div className={styles.spacer} />
        {dashboard && <DashboardLinks dashboard={dashboard} links={links} />}
      </div>
    );
  }
}

const mapStateToProps: MapStateToProps<ConnectedProps, OwnProps, StoreState> = (state, ownProps) => {
  const { uid } = ownProps.dashboard;
  const templatingState = getVariablesState(uid, state);

  return {
    variables: getSubMenuVariables(uid, templatingState.variables),
    hiddenVariables: state.fnGlobalState.hiddenVariables,
  };
};

const getStyles = stylesFactory((theme: GrafanaTheme2) => {
  return {
    formStyles: css({
      display: 'contents',
      flexWrap: 'wrap',
    }),
    submenu: css({
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignContent: 'flex-start',
      alignItems: 'flex-start',
      gap: `${theme.spacing(1)} ${theme.spacing(2)}`,
      padding: `0 0 ${theme.spacing(1)} 0`,
    }),
    spacer: css({
      flexGrow: 1,
    }),
  };
});

export const SubMenu = withTheme2(connect(mapStateToProps)(SubMenuUnConnected));

SubMenu.displayName = 'SubMenu';

const FilterWithIcon: FC = () => (
  <FilterWithIconStyled>
    <FilterListIcon sx={{ color: '#3A785E' }} />
    FILTERS
  </FilterWithIconStyled>
);

const FilterWithIconStyled = styled(Box)({
  display: 'flex',
  gap: 1,
  alignItems: 'center',
  color: '#3A785E',
  fontWeight: 600,
  lineHeight: '160%',
  fontSize: 12,
});

import { css, cx } from '@emotion/css';
import { isEmpty, noop } from 'lodash';
import React, { PureComponent } from 'react';
import DropZone, { FileRejection, DropEvent, ErrorCode } from 'react-dropzone';
import { connect, ConnectedProps, MapDispatchToProps, MapStateToProps } from 'react-redux';

import {
  NavModel,
  NavModelItem,
  TimeRange,
  PageLayoutType,
  locationUtil,
  dataFrameToJSON,
  DataFrameJSON,
  GrafanaTheme2,
  getValueFormat,
  formattedValueToString,
} from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { config, locationService } from '@grafana/runtime';
import { Icon, Themeable2, withTheme2 } from '@grafana/ui';
import { notifyApp } from 'app/core/actions';
import ErrorPage from 'app/core/components/ErrorPage/ErrorPage';
import { Page } from 'app/core/components/Page/Page';
import { GrafanaContext, GrafanaContextType } from 'app/core/context/GrafanaContext';
import { createErrorNotification } from 'app/core/copy/appNotification';
import { getKioskMode } from 'app/core/navigation/kiosk';
import { GrafanaRouteComponentProps } from 'app/core/navigation/types';
import { FnGlobalState } from 'app/core/reducers/fn-slice';
import { getNavModel } from 'app/core/selectors/navModel';
import { PanelModel } from 'app/features/dashboard/state';
import * as DFImport from 'app/features/dataframe-import';
import { dashboardWatcher } from 'app/features/live/dashboard/dashboardWatcher';
import { getPageNavFromSlug, getRootContentNavModel } from 'app/features/storage/StorageFolderPage';
import { FNDashboardProps } from 'app/fn-app/types';
import { RenderPortal } from 'app/fn-app/utils';
import { GrafanaQueryType } from 'app/plugins/datasource/grafana/types';
import { DashboardRoutes, DashboardState, KioskMode, StoreState } from 'app/types';
import { PanelEditEnteredEvent, PanelEditExitedEvent } from 'app/types/events';

import { cancelVariables, templateVarsChangedInUrl } from '../../variables/state/actions';
import { findTemplateVarChanges } from '../../variables/utils';
import { DashNav } from '../components/DashNav';
import { DashboardFailed } from '../components/DashboardLoading/DashboardFailed';
import { FnLoader } from '../components/DashboardLoading/FnLoader';
import { DashboardPrompt } from '../components/DashboardPrompt/DashboardPrompt';
import { DashboardSettings } from '../components/DashboardSettings';
import { PanelInspector } from '../components/Inspector/PanelInspector';
import { PanelEditor } from '../components/PanelEditor/PanelEditor';
import { SubMenu } from '../components/SubMenu/SubMenu';
import { DashboardGrid } from '../dashgrid/DashboardGrid';
import { liveTimer } from '../dashgrid/liveTimer';
import { getTimeSrv } from '../services/TimeSrv';
import { cleanUpDashboardAndVariables } from '../state/actions';
import { initDashboard } from '../state/initDashboard';
import { calculateNewPanelGridPos } from '../utils/panel';

export interface DashboardPageRouteParams {
  uid?: string;
  type?: string;
  slug?: string;
  accessToken?: string;
}

export type DashboardPageRouteSearchParams = {
  tab?: string;
  folderUid?: string;
  editPanel?: string;
  viewPanel?: string;
  editview?: string;
  shareView?: string;
  panelType?: string;
  inspect?: string;
  from?: string;
  to?: string;
  refresh?: string;
  kiosk?: string | true;
};

export type MapStateToDashboardPageProps = MapStateToProps<
  Pick<DashboardState, 'initPhase' | 'initError'> & { dashboard: ReturnType<DashboardState['getModel']> } & Pick<
      FnGlobalState,
      'FNDashboard'
    >,
  OwnProps,
  StoreState
>;

export type MapDispatchToDashboardPageProps = MapDispatchToProps<MappedDispatch, OwnProps>;

export type MappedDispatch = {
  initDashboard: typeof initDashboard;
  cleanUpDashboardAndVariables: typeof cleanUpDashboardAndVariables;
  notifyApp: typeof notifyApp;
  cancelVariables: typeof cancelVariables;
  templateVarsChangedInUrl: typeof templateVarsChangedInUrl;
};

export const mapStateToProps: MapStateToDashboardPageProps = (state) => ({
  initPhase: state.dashboard.initPhase,
  initError: state.dashboard.initError,
  dashboard: state.dashboard.getModel(),
  navIndex: state.navIndex,
  FNDashboard: state.fnGlobalState.FNDashboard,
});

const mapDispatchToProps: MapDispatchToDashboardPageProps = {
  initDashboard,
  cleanUpDashboardAndVariables,
  notifyApp,
  cancelVariables,
  templateVarsChangedInUrl,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

type OwnProps = {
  isPublic?: boolean;
  controlsContainer?: string | null;
  version?: FNDashboardProps['version'];
  isLoading?: FNDashboardProps['isLoading'];
};

export type DashboardPageProps = OwnProps &
  GrafanaRouteComponentProps<DashboardPageRouteParams, DashboardPageRouteSearchParams>;

export type Props = OwnProps &
  Themeable2 &
  GrafanaRouteComponentProps<DashboardPageRouteParams, DashboardPageRouteSearchParams> &
  ConnectedProps<typeof connector>;

export interface State {
  editPanel: PanelModel | null;
  viewPanel: PanelModel | null;
  updateScrollTop?: number;
  rememberScrollTop?: number;
  showLoadingState: boolean;
  panelNotFound: boolean;
  editPanelAccessDenied: boolean;
  scrollElement?: HTMLDivElement;
  pageNav?: NavModelItem;
  sectionNav?: NavModel;
}

export class UnthemedDashboardPage extends PureComponent<Props, State> {
  declare context: GrafanaContextType;
  static contextType = GrafanaContext;

  private forceRouteReloadCounter = 0;
  state: State = this.getCleanState();

  pageNav?: NavModelItem;
  onFileDrop = (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => {
    const grafanaDS = {
      type: 'grafana',
      uid: 'grafana',
    };
    DFImport.filesToDataframes(acceptedFiles).subscribe((next) => {
      const snapshot: DataFrameJSON[] = [];
      next.dataFrames.forEach((df) => {
        const dataframeJson = dataFrameToJSON(df);
        snapshot.push(dataframeJson);
      });
      this.props.dashboard?.addPanel({
        type: 'table',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        title: next.file.name,
        datasource: grafanaDS,
        targets: [
          {
            queryType: GrafanaQueryType.Snapshot,
            snapshot,
            file: { name: next.file.name, size: next.file.size },
            datasource: grafanaDS,
          },
        ],
      });
    });

    fileRejections.forEach((fileRejection) => {
      const errors = fileRejection.errors.map((error) => {
        switch (error.code) {
          case ErrorCode.FileTooLarge:
            const formattedSize = getValueFormat('decbytes')(DFImport.maxFileSize);
            return `File size must be less than ${formattedValueToString(formattedSize)}.`;
          case ErrorCode.FileInvalidType:
            return `File type must be one of the following types ${DFImport.formatFileTypes(DFImport.acceptedFiles)}.`;
          default:
            return error.message;
        }
      });
      this.props.notifyApp(
        createErrorNotification(
          `Failed to load ${fileRejection.file.name}`,
          undefined,
          undefined,
          <ul>
            {errors.map((err) => {
              return <li key={err}>{err}</li>;
            })}
          </ul>
        )
      );
    });
  };

  getCleanState(): State {
    return {
      editPanel: null,
      viewPanel: null,
      showLoadingState: false,
      panelNotFound: false,
      editPanelAccessDenied: false,
    };
  }

  componentDidMount() {
    this.initDashboard();

    const { isPublic, FNDashboard } = this.props;

    if (!isPublic && !FNDashboard) {
      this.forceRouteReloadCounter = (this.props.history.location?.state as any)?.routeReloadCounter || 0;
    }
  }

  componentWillUnmount() {
    this.closeDashboard();
  }

  closeDashboard() {
    this.props.cleanUpDashboardAndVariables();
    this.setState(this.getCleanState());
  }

  initDashboard() {
    const { dashboard, isPublic, match, queryParams, FNDashboard } = this.props;

    if (dashboard) {
      this.closeDashboard();
    }

    this.props.initDashboard({
      urlSlug: match.params.slug,
      urlUid: match.params.uid,
      urlType: match.params.type,
      urlFolderUid: queryParams.folderUid,
      version: match.params.version,
      panelType: queryParams.panelType,
      routeName: this.props.route.routeName,
      fixUrl: !isPublic && !FNDashboard,
      accessToken: match.params.accessToken,
      keybindingSrv: this.context.keybindings,
    });

    // small delay to start live updates
    setTimeout(this.updateLiveTimer, 250);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { dashboard, match, templateVarsChangedInUrl, isPublic, FNDashboard } = this.props;

    if (!dashboard) {
      return;
    }

    if (!isPublic && !FNDashboard) {
      const routeReloadCounter = (this.props.history.location?.state as any)?.routeReloadCounter;

      if (
        prevProps.match.params.uid !== match.params.uid ||
        prevProps.match.params.version !== match.params.version ||
        (routeReloadCounter !== undefined && this.forceRouteReloadCounter !== routeReloadCounter)
      ) {
        this.initDashboard();
        this.forceRouteReloadCounter = routeReloadCounter;
        return;
      }
    }

    if (prevProps.location.search !== this.props.location.search) {
      const prevUrlParams = prevProps.queryParams;
      const urlParams = this.props.queryParams;

      if (urlParams?.from !== prevUrlParams?.from || urlParams?.to !== prevUrlParams?.to) {
        getTimeSrv().updateTimeRangeFromUrl();
        this.updateLiveTimer();
      }

      if (!prevUrlParams?.refresh && urlParams?.refresh) {
        getTimeSrv().setAutoRefresh(urlParams.refresh);
      }

      const templateVarChanges = findTemplateVarChanges(this.props.queryParams, prevProps.queryParams);

      if (templateVarChanges) {
        templateVarsChangedInUrl(dashboard.uid, templateVarChanges);
      }
    }

    // entering edit mode
    if (this.state.editPanel && !prevState.editPanel) {
      dashboardWatcher.setEditingState(true);

      // Some panels need to be notified when entering edit mode
      this.props.dashboard?.events.publish(new PanelEditEnteredEvent(this.state.editPanel.id));
    }

    // leaving edit mode
    if (!this.state.editPanel && prevState.editPanel) {
      dashboardWatcher.setEditingState(false);

      // Some panels need kicked when leaving edit mode
      this.props.dashboard?.events.publish(new PanelEditExitedEvent(prevState.editPanel.id));
    }

    if (this.state.editPanelAccessDenied) {
      this.props.notifyApp(createErrorNotification('Permission to edit panel denied'));
      locationService.partial({ editPanel: null });
    }

    if (this.state.panelNotFound) {
      this.props.notifyApp(createErrorNotification(`Panel not found`));
      locationService.partial({ editPanel: null, viewPanel: null });
    }
  }

  updateLiveTimer = () => {
    let tr: TimeRange | undefined = undefined;
    if (this.props.dashboard?.liveNow) {
      tr = getTimeSrv().timeRange();
    }
    liveTimer.setLiveTimeRange(tr);
  };

  static getDerivedStateFromProps(props: Props, state: State) {
    const { dashboard, queryParams } = props;

    const urlEditPanelId = queryParams.editPanel;
    const urlViewPanelId = queryParams.viewPanel;

    if (!dashboard) {
      return state;
    }

    const updatedState = { ...state };

    // Entering edit mode
    if (!state.editPanel && urlEditPanelId) {
      const panel = dashboard.getPanelByUrlId(urlEditPanelId);
      if (panel) {
        if (dashboard.canEditPanel(panel)) {
          updatedState.editPanel = panel;
          updatedState.rememberScrollTop = state.scrollElement?.scrollTop;
        } else {
          updatedState.editPanelAccessDenied = true;
        }
      } else {
        updatedState.panelNotFound = true;
      }
    }
    // Leaving edit mode
    else if (state.editPanel && !urlEditPanelId) {
      updatedState.editPanel = null;
      updatedState.updateScrollTop = state.rememberScrollTop;
    }

    // Entering view mode
    if (!state.viewPanel && urlViewPanelId) {
      const panel = dashboard.getPanelByUrlId(urlViewPanelId);
      if (panel) {
        // This mutable state feels wrong to have in getDerivedStateFromProps
        // Should move this state out of dashboard in the future
        dashboard.initViewPanel(panel);
        updatedState.viewPanel = panel;
        updatedState.rememberScrollTop = state.scrollElement?.scrollTop;
        updatedState.updateScrollTop = 0;
      } else {
        updatedState.panelNotFound = true;
      }
    }
    // Leaving view mode
    else if (state.viewPanel && !urlViewPanelId) {
      // This mutable state feels wrong to have in getDerivedStateFromProps
      // Should move this state out of dashboard in the future
      dashboard.exitViewPanel(state.viewPanel);
      updatedState.viewPanel = null;
      updatedState.updateScrollTop = state.rememberScrollTop;
    }

    // if we removed url edit state, clear any panel not found state
    if (state.panelNotFound || (state.editPanelAccessDenied && !urlEditPanelId)) {
      updatedState.panelNotFound = false;
      updatedState.editPanelAccessDenied = false;
    }

    return updateStatePageNavFromProps(props, updatedState);
  }

  onAddPanel = () => {
    const { dashboard } = this.props;

    if (!dashboard) {
      return;
    }

    // Return if the "Add panel" exists already
    if (dashboard.panels.length > 0 && dashboard.panels[0].type === 'add-panel') {
      return;
    }

    dashboard.addPanel({
      type: 'add-panel',
      gridPos: calculateNewPanelGridPos(dashboard),
      title: 'Panel Title',
    });

    // scroll to top after adding panel
    this.setState({ updateScrollTop: 0 });
  };

  setScrollRef = (scrollElement: HTMLDivElement): void => {
    this.setState({ scrollElement });
  };

  getInspectPanel() {
    const { dashboard, queryParams } = this.props;

    const inspectPanelId = queryParams.inspect;

    if (!dashboard || !inspectPanelId) {
      return null;
    }

    const inspectPanel = dashboard.getPanelById(parseInt(inspectPanelId, 10));

    // cannot inspect panels plugin is not already loaded
    if (!inspectPanel) {
      return null;
    }

    return inspectPanel;
  }

  render() {
    const { dashboard, initError, queryParams, isPublic, FNDashboard, isLoading = noop } = this.props;
    const { editPanel, viewPanel, updateScrollTop, pageNav, sectionNav } = this.state;
    const kioskMode = FNDashboard ? KioskMode.FN : !isPublic ? getKioskMode(this.props.queryParams) : KioskMode.Full;

    if (!dashboard || isEmpty(queryParams)) {
      isLoading(true);

      // return isUndefined(fnLoader) ? <DashboardLoading initPhase={this.props.initPhase} />: <>{fnLoader}</>;
      return <FnLoader />;
    }

    isLoading(false);

    const inspectPanel = this.getInspectPanel();
    const showSubMenu = !editPanel && !this.props.queryParams.editview;

    const toolbar = kioskMode !== KioskMode.Full && !queryParams.editview && (
      <header data-testid={selectors.pages.Dashboard.DashNav.navV2}>
        <DashNav
          dashboard={dashboard}
          title={!FNDashboard ? dashboard.title : ''}
          folderTitle={dashboard.meta.folderTitle}
          isFullscreen={!!viewPanel}
          onAddPanel={this.onAddPanel}
          kioskMode={kioskMode}
          hideTimePicker={dashboard.timepicker.hidden}
          shareModalActiveTab={this.props.queryParams.shareView}
        />
      </header>
    );

    const pageClassName = cx({
      'panel-in-fullscreen': Boolean(viewPanel),
      'page-hidden': Boolean(queryParams.editview || editPanel),
    });

    return (
      <>
        <Page
          navModel={sectionNav}
          pageNav={pageNav}
          layout={PageLayoutType.Canvas}
          toolbar={
            this.props.controlsContainer ? (
              <RenderPortal ID={this.props.controlsContainer}>{toolbar}</RenderPortal>
            ) : (
              toolbar
            )
          }
          className={pageClassName}
          scrollRef={this.setScrollRef}
          scrollTop={updateScrollTop}
        >
          {!FNDashboard && <DashboardPrompt dashboard={dashboard} />}

          {initError && <DashboardFailed />}
          {dashboard.meta.dashboardNotFound ? (
            <ErrorPage />
          ) : (
            <>
              {showSubMenu && (
                <section aria-label={selectors.pages.Dashboard.SubMenu.submenu}>
                  <SubMenu dashboard={dashboard} annotations={dashboard.annotations.list} links={dashboard.links} />
                </section>
              )}
              {config.featureToggles.editPanelCSVDragAndDrop ? (
                <DropZone
                  onDrop={this.onFileDrop}
                  accept={DFImport.acceptedFiles}
                  maxSize={DFImport.maxFileSize}
                  noClick={true}
                >
                  {({ getRootProps, isDragActive }) => {
                    const styles = getStyles(this.props.theme, isDragActive);
                    return (
                      <div {...getRootProps({ className: styles.dropZone })}>
                        <div className={styles.dropOverlay}>
                          <div className={styles.dropHint}>
                            <Icon name="upload" size="xxxl"></Icon>
                            <h3>Create tables from spreadsheets</h3>
                          </div>
                        </div>
                        <DashboardGrid
                          dashboard={dashboard}
                          isEditable={!!dashboard.meta.canEdit}
                          viewPanel={viewPanel}
                          editPanel={editPanel}
                        />
                      </div>
                    );
                  }}
                </DropZone>
              ) : (
                <DashboardGrid
                  dashboard={dashboard}
                  isEditable={!!dashboard.meta.canEdit}
                  viewPanel={viewPanel}
                  editPanel={editPanel}
                />
              )}
              {inspectPanel && <PanelInspector dashboard={dashboard} panel={inspectPanel} />}
            </>
          )}
        </Page>
        {editPanel && (
          <PanelEditor
            dashboard={dashboard}
            sourcePanel={editPanel}
            tab={this.props.queryParams.tab}
            sectionNav={sectionNav}
            pageNav={pageNav}
          />
        )}
        {queryParams.editview && (
          <DashboardSettings
            dashboard={dashboard}
            editview={queryParams.editview}
            pageNav={pageNav}
            sectionNav={sectionNav}
          />
        )}
      </>
    );
  }
}

function updateStatePageNavFromProps(props: Props, state: State): State {
  const { dashboard, FNDashboard } = props;

  if (!dashboard || FNDashboard) {
    return state;
  }

  let pageNav = state.pageNav;
  let sectionNav = state.sectionNav;

  if (!pageNav || dashboard.title !== pageNav.text) {
    pageNav = {
      text: dashboard.title,
      url: locationUtil.getUrlForPartial(props.history.location, {
        editview: null,
        editPanel: null,
        viewPanel: null,
      }),
    };
  }

  // Check if folder changed
  const { folderTitle, folderUid } = dashboard.meta;
  if (folderTitle && folderUid && pageNav && pageNav.parentItem?.text !== folderTitle) {
    pageNav = {
      ...pageNav,
      parentItem: {
        text: folderTitle,
        url: `/dashboards/f/${dashboard.meta.folderUid}`,
      },
    };
  }

  if (props.route.routeName === DashboardRoutes.Path) {
    sectionNav = getRootContentNavModel();
    const pageNav = getPageNavFromSlug(props.match.params.slug!);
    if (pageNav?.parentItem) {
      pageNav.parentItem = pageNav.parentItem;
    }
  } else {
    sectionNav = getNavModel(props.navIndex, config.featureToggles.topnav ? 'dashboards/browse' : 'dashboards');
  }

  if (state.editPanel || state.viewPanel) {
    pageNav = {
      ...pageNav,
      text: `${state.editPanel ? 'Edit' : 'View'} panel`,
      parentItem: pageNav,
      url: undefined,
    };
  }

  if (state.pageNav === pageNav && state.sectionNav === sectionNav) {
    return state;
  }

  return {
    ...state,
    pageNav,
    sectionNav,
  };
}

function getStyles(theme: GrafanaTheme2, isDragActive: boolean) {
  return {
    dropZone: css`
      height: 100%;
    `,
    dropOverlay: css`
      background-color: ${isDragActive ? theme.colors.action.hover : `inherit`};
      border: ${isDragActive ? `2px dashed ${theme.colors.border.medium}` : 0};
      position: absolute;
      display: ${isDragActive ? 'flex' : 'none'};
      z-index: ${theme.zIndex.modal};
      top: 0px;
      left: 0px;
      height: 100%;
      width: 100%;
      align-items: center;
      justify-content: center;
    `,
    dropHint: css`
      align-items: center;
      display: flex;
      flex-direction: column;
    `,
  };
}

export const DashboardPage = withTheme2(UnthemedDashboardPage);
DashboardPage.displayName = 'DashboardPage';
export default connector(DashboardPage);

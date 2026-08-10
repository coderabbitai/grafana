import { cx } from '@emotion/css';
import { Portal } from '@mui/material';
import React, { PureComponent } from 'react';
import { connect, ConnectedProps, MapDispatchToProps, MapStateToProps } from 'react-redux';

import { FieldConfigSource, NavModel, NavModelItem, TimeRange, PageLayoutType, locationUtil } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { config, locationService } from '@grafana/runtime';
import { Themeable2, withTheme2, ToolbarButtonRow } from '@grafana/ui';
import { notifyApp } from 'app/core/actions';
import { Page } from 'app/core/components/Page/Page';
import { EntityNotFound } from 'app/core/components/PageNotFound/EntityNotFound';
import { GrafanaContext, GrafanaContextType } from 'app/core/context/GrafanaContext';
import { createErrorNotification } from 'app/core/copy/appNotification';
import { getKioskMode } from 'app/core/navigation/kiosk';
import { GrafanaRouteComponentProps } from 'app/core/navigation/types';
import { FnGlobalState, FnPanelOptionsUpdate } from 'app/core/reducers/fn-slice';
import { getNavModel } from 'app/core/selectors/navModel';
import { PanelModel } from 'app/features/dashboard/state';
import { dashboardWatcher } from 'app/features/live/dashboard/dashboardWatcher';
import { updateTimeZoneForSession } from 'app/features/profile/state/reducers';
import { getPageNavFromSlug, getRootContentNavModel } from 'app/features/storage/StorageFolderPage';
import { FNDashboardProps } from 'app/fn-app/types';
import { DashboardRoutes, DashboardState, KioskMode, StoreState } from 'app/types';
import { PanelEditEnteredEvent, PanelEditExitedEvent } from 'app/types/events';

import { cancelVariables, templateVarsChangedInUrl } from '../../variables/state/actions';
import { findTemplateVarChanges } from '../../variables/utils';
import { AddWidgetModal } from '../components/AddWidgetModal/AddWidgetModal';
import { DashNav } from '../components/DashNav';
import { DashNavTimeControls } from '../components/DashNav/DashNavTimeControls';
import { DashboardFailed } from '../components/DashboardLoading/DashboardFailed';
import { DashboardLoading } from '../components/DashboardLoading/DashboardLoading';
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
  version?: number;
}

export type DashboardPageRouteSearchParams = {
  tab?: string;
  folderUid?: string;
  editPanel?: string;
  viewPanel?: string;
  editview?: string;
  shareView?: string;
  addWidget?: boolean;
  panelType?: string;
  inspect?: string;
  from?: string;
  to?: string;
  refresh?: string;
  kiosk?: string | true;
};

export type MapStateToDashboardPageProps = MapStateToProps<
  Pick<DashboardState, 'initPhase' | 'initError'> & {
    dashboard: ReturnType<DashboardState['getModel']>;
    navIndex: StoreState['navIndex'];
  } & Pick<FnGlobalState, 'FNDashboard' | 'controlsContainer' | 'enablePanelLayoutEdit' | 'panelOptionsUpdate'> & {
      dashboardEventListener: FnGlobalState['metadata']['eventListener'];
    },
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
  controlsContainer: state.fnGlobalState.controlsContainer,
  enablePanelLayoutEdit: state.fnGlobalState.enablePanelLayoutEdit,
  panelOptionsUpdate: state.fnGlobalState.panelOptionsUpdate,
  dashboardEventListener: state.fnGlobalState.metadata?.eventListener ?? null,
});

const mapDispatchToProps: MapDispatchToDashboardPageProps = {
  initDashboard,
  cleanUpDashboardAndVariables,
  notifyApp,
  cancelVariables,
  templateVarsChangedInUrl,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function stringArrayValue(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined;
}

function panelFieldConfigParts(panel: PanelModel) {
  const baseFieldConfig = panel.fieldConfig ?? ({ defaults: {}, overrides: [] } as FieldConfigSource);
  const defaults = isRecord(baseFieldConfig.defaults) ? { ...baseFieldConfig.defaults } : {};
  const custom = isRecord(defaults.custom) ? { ...defaults.custom } : {};

  return {
    fieldConfig: {
      ...baseFieldConfig,
      defaults,
      overrides: baseFieldConfig.overrides ?? [],
    } as FieldConfigSource,
    defaults,
    custom,
  };
}

function applyFnPanelOptionsPreview(panel: PanelModel, update: FnPanelOptionsUpdate): void {
  const draft = update.options;
  const previousFieldConfig = JSON.stringify(panel.fieldConfig ?? { defaults: {}, overrides: [] });
  const previousOptions = JSON.stringify(panel.options ?? {});
  const options = isRecord(panel.options) ? { ...panel.options } : {};
  const { fieldConfig, defaults, custom } = panelFieldConfigParts(panel);
  let frameOptionsChanged = false;

  const title = stringValue(draft.title);
  if (title !== undefined && panel.title !== title) {
    panel.title = title;
    frameOptionsChanged = true;
  }

  const description = stringValue(draft.description);
  if (description !== undefined && panel.description !== description) {
    panel.description = description;
    frameOptionsChanged = true;
  }

  const unit = stringValue(draft.unit);
  if (unit !== undefined) {
    defaults.unit = unit;
  }

  const decimals = numberValue(draft.decimals);
  if (decimals !== undefined) {
    defaults.decimals = decimals;
  }

  switch (panel.type) {
    case 'stat':
    case 'gauge': {
      const fontSize = numberValue(draft.fontSize);
      if (fontSize !== undefined) {
        const text = isRecord(options.text) ? { ...options.text } : {};
        text.valueSize = fontSize;
        options.text = text;
      }
      break;
    }
    case 'table': {
      const showHeader = booleanValue(draft.tableShowHeader);
      if (showHeader !== undefined) {
        options.showHeader = showHeader;
      }

      const cellHeight = stringValue(draft.tableCellHeight);
      if (cellHeight !== undefined) {
        options.cellHeight = cellHeight;
      }

      const tableColumnFilter = booleanValue(draft.tableColumnFilter);
      if (tableColumnFilter !== undefined) {
        custom.filterable = tableColumnFilter;
      }

      const tableSortBy = stringValue(draft.tableSortBy);
      if (tableSortBy !== undefined) {
        const displayName = tableSortBy.trim();
        options.sortBy = displayName ? [{ displayName, desc: booleanValue(draft.tableSortDesc) ?? false }] : [];
      }

      const pagination = booleanValue(draft.tablePagination);
      const footerVisible = booleanValue(draft.tableFooter);
      if (pagination !== undefined || footerVisible !== undefined) {
        const footer: Record<string, unknown> = isRecord(options.footer)
          ? { ...options.footer }
          : { countRows: false, fields: '', reducer: ['sum'], show: false };
        if (pagination !== undefined) {
          footer.enablePagination = pagination;
        }
        if (footerVisible !== undefined) {
          footer.show = footerVisible;
        }
        options.footer = footer;
      }
      break;
    }
    case 'timeseries': {
      const drawStyle = stringValue(draft.timeseriesDrawStyle);
      if (drawStyle !== undefined) {
        custom.drawStyle = drawStyle;
      }

      const lineInterpolation = stringValue(draft.timeseriesLineInterpolation);
      if (lineInterpolation !== undefined) {
        custom.lineInterpolation = lineInterpolation;
      }

      const lineWidth = numberValue(draft.timeseriesLineWidth);
      if (lineWidth !== undefined) {
        custom.lineWidth = lineWidth;
      }

      const fillOpacity = numberValue(draft.timeseriesFillOpacity);
      if (fillOpacity !== undefined) {
        custom.fillOpacity = fillOpacity;
      }

      const showPoints = stringValue(draft.timeseriesShowPoints);
      if (showPoints !== undefined) {
        custom.showPoints = showPoints;
      }

      const pointSize = numberValue(draft.timeseriesPointSize);
      if (pointSize !== undefined) {
        custom.pointSize = pointSize;
      }

      const stacking = stringValue(draft.timeseriesStacking);
      if (stacking !== undefined) {
        const existingStacking = isRecord(custom.stacking) ? custom.stacking : {};
        custom.stacking = {
          ...existingStacking,
          group: stringValue(existingStacking.group) ?? 'A',
          mode: stacking,
        };
      }
      break;
    }
    case 'barchart': {
      const orientation = stringValue(draft.orientation);
      if (orientation !== undefined) {
        options.orientation = orientation;
      }

      const showValue = stringValue(draft.barShowValue);
      if (showValue !== undefined) {
        options.showValue = showValue;
      }

      const stacking = stringValue(draft.barStacking);
      if (stacking !== undefined) {
        options.stacking = stacking;
      }

      const groupWidth = numberValue(draft.barGroupWidth);
      if (groupWidth !== undefined) {
        options.groupWidth = groupWidth;
      }

      const barWidth = numberValue(draft.barWidth);
      if (barWidth !== undefined) {
        options.barWidth = barWidth;
      }

      const barRadius = numberValue(draft.barRadius);
      if (barRadius !== undefined) {
        options.barRadius = barRadius;
      }

      const fillOpacity = numberValue(draft.barFillOpacity);
      if (fillOpacity !== undefined) {
        custom.fillOpacity = fillOpacity;
      }

      const tickRotation = numberValue(draft.barTickLabelRotation);
      if (tickRotation !== undefined) {
        options.xTickLabelRotation = tickRotation;
      }

      const tickMaxLength = numberValue(draft.barTickLabelMaxLength);
      if (tickMaxLength !== undefined) {
        options.xTickLabelMaxLength = tickMaxLength;
      }
      break;
    }
    case 'piechart': {
      const pieType = stringValue(draft.pieType);
      if (pieType !== undefined) {
        options.pieType = pieType;
      }

      const labels = stringArrayValue(draft.pieDisplayLabels);
      if (labels !== undefined) {
        options.displayLabels = labels;
      }
      break;
    }
  }

  if (panel.type === 'timeseries' || panel.type === 'barchart' || panel.type === 'piechart') {
    const legend: Record<string, unknown> = isRecord(options.legend)
      ? { ...options.legend }
      : { calcs: [], displayMode: 'list', placement: 'bottom' };

    const legendVisible = booleanValue(draft.legend);
    if (legendVisible !== undefined) {
      legend.showLegend = legendVisible;
    }

    const legendMode = stringValue(draft.legendMode);
    if (legendMode !== undefined) {
      legend.displayMode = legendMode;
    }

    const legendPlacement = stringValue(draft.legendPlacement);
    if (legendPlacement !== undefined) {
      legend.placement = legendPlacement;
    }

    if (panel.type === 'piechart') {
      const legendValues = stringArrayValue(draft.pieLegendValues);
      if (legendValues !== undefined) {
        legend.values = legendValues;
      }
    }

    options.legend = legend;

    const tooltipMode = stringValue(draft.tooltipMode);
    const tooltipSort = stringValue(draft.tooltipSort);
    if (tooltipMode !== undefined || tooltipSort !== undefined) {
      const tooltip = isRecord(options.tooltip) ? { ...options.tooltip } : { mode: 'single', sort: 'none' };
      if (tooltipMode !== undefined) {
        tooltip.mode = tooltipMode;
      }
      if (tooltipSort !== undefined) {
        tooltip.sort = tooltipSort;
      }
      options.tooltip = tooltip;
    }
  }

  defaults.custom = custom;
  fieldConfig.defaults = defaults;

  const fieldConfigChanged = JSON.stringify(fieldConfig) !== previousFieldConfig;
  const optionsChanged = JSON.stringify(options) !== previousOptions;

  if (fieldConfigChanged) {
    panel.updateFieldConfig(fieldConfig);
  }

  if (optionsChanged) {
    panel.updateOptions(options);
  }

  if (frameOptionsChanged && !fieldConfigChanged && !optionsChanged) {
    panel.render();
  }
}

type OwnProps = {
  isPublic?: boolean;
  controlsContainer?: string | null;
  version?: FNDashboardProps['version'];
  isLoading?: FNDashboardProps['isLoading'];
};

export type DashboardPageProps = OwnProps &
  GrafanaRouteComponentProps<DashboardPageRouteParams, DashboardPageRouteSearchParams>;

export type Props = Themeable2 & DashboardPageProps & ConnectedProps<typeof connector>;

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
    const { FNDashboard } = this.props;

    if (!FNDashboard) {
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
    const { dashboard, match, queryParams, FNDashboard } = this.props;

    if (dashboard) {
      this.closeDashboard();
    }

    this.props.initDashboard({
      urlSlug: match.params.slug,
      urlUid: match.params.uid,
      urlType: match.params.type,
      // urlFolderUid: queryParams.folderUid,
      panelType: queryParams.panelType,
      routeName: this.props.route.routeName,
      fixUrl: !FNDashboard,
      accessToken: match.params.accessToken,
      keybindingSrv: this.context.keybindings,
    });

    // small delay to start live updates
    setTimeout(this.updateLiveTimer, 250);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { dashboard, match, templateVarsChangedInUrl, FNDashboard } = this.props;

    if (!dashboard) {
      return;
    }

    if (
      FNDashboard &&
      this.props.panelOptionsUpdate &&
      (prevProps.dashboard !== this.props.dashboard ||
        prevProps.panelOptionsUpdate?.panelId !== this.props.panelOptionsUpdate.panelId ||
        prevProps.panelOptionsUpdate?.revision !== this.props.panelOptionsUpdate.revision)
    ) {
      this.applyFnPanelOptionsUpdate(this.props.panelOptionsUpdate);
    }

    if (!FNDashboard) {
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

  applyFnPanelOptionsUpdate(update: FnPanelOptionsUpdate) {
    const panel = this.props.dashboard?.getPanelById(update.panelId);
    if (!panel) {
      return;
    }

    applyFnPanelOptionsPreview(panel, update);
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

  // Todo: Remove this when we remove the emptyDashboardPage toggle
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

  getFnDashboardSaveModel() {
    return this.props.dashboard?.getSaveModelClone();
  }

  onFnDashboardLayoutChange = () => {
    const dashboardJson = this.getFnDashboardSaveModel();
    if (!dashboardJson) {
      return;
    }

    this.props.dashboardEventListener?.({
      type: 'dashboardLayoutChanged',
      data: dashboardJson,
    });
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
    const { dashboard, initError, queryParams, FNDashboard, controlsContainer, enablePanelLayoutEdit } = this.props;
    const { editPanel, viewPanel, pageNav, sectionNav } = this.state;
    const kioskMode = getKioskMode(this.props.queryParams);

    if (!dashboard) {
      this.props?.isLoading?.(true);
      return FNDashboard ? <FnLoader /> : <DashboardLoading initPhase={this.props.initPhase} />;
    }

    this.props?.isLoading?.(false);
    const inspectPanel = this.getInspectPanel();
    const showSubMenu = !editPanel && !kioskMode && !this.props.queryParams.editview;

    const showToolbar = FNDashboard || (kioskMode !== KioskMode.Full && !queryParams.editview);
    const isCustomFnDashboardLayoutEditable = FNDashboard && enablePanelLayoutEdit && !viewPanel && !editPanel;
    const isDashboardGridLayoutEditable = FNDashboard
      ? isCustomFnDashboardLayoutEditable
      : Boolean(dashboard.meta.canEdit);
    const fnControlsClassName = cx(
      'flex w-full gap-y-2',
      viewPanel
        ? 'flex-row items-start justify-between gap-x-3'
        : 'flex-col-reverse md:flex-row md:items-center md:justify-between'
    );
    const fnVariablesClassName = cx('flex items-center', viewPanel ? 'min-w-0 flex-1' : 'w-full');
    const fnTimeRangeClassName = cx('flex items-center justify-end gap-2', viewPanel ? 'shrink-0' : 'w-full');

    const pageClassName = cx({
      'panel-in-fullscreen': Boolean(viewPanel),
      'page-hidden': Boolean(queryParams.editview || editPanel),
    });

    if (dashboard.meta.dashboardNotFound) {
      return (
        <Page navId="dashboards/browse" layout={PageLayoutType.Canvas} pageNav={{ text: 'Not found' }}>
          <EntityNotFound entity="Dashboard" />
        </Page>
      );
    }

    const FNTimeRange = !controlsContainer ? (
      <ToolbarButtonRow alignment="right" style={{ marginBottom: '16px' }}>
        <DashNavTimeControls
          dashboard={dashboard}
          onChangeTimeZone={updateTimeZoneForSession}
          key="time-controls"
          isFnDashboard={FNDashboard}
        />
      </ToolbarButtonRow>
    ) : (
      <Portal container={document.getElementById(controlsContainer)!}>
        <ToolbarButtonRow>
          <DashNavTimeControls
            dashboard={dashboard}
            onChangeTimeZone={updateTimeZoneForSession}
            key="time-controls"
            isFnDashboard={FNDashboard}
          />
        </ToolbarButtonRow>
      </Portal>
    );

    return (
      <React.Fragment>
        <Page
          navModel={sectionNav}
          pageNav={pageNav}
          layout={PageLayoutType.Canvas}
          className={pageClassName}
          // scrollRef={this.setScrollRef}
          // scrollTop={updateScrollTop}
          style={{ minHeight: '550px' }}
        >
          {showToolbar && (
            <header data-testid={selectors.pages.Dashboard.DashNav.navV2}>
              {!FNDashboard && (
                <DashNav
                  dashboard={dashboard}
                  title={dashboard.title}
                  folderTitle={dashboard.meta.folderTitle}
                  isFullscreen={!!viewPanel}
                  // onAddPanel={this.onAddPanel}
                  kioskMode={kioskMode}
                  hideTimePicker={dashboard.timepicker.hidden}
                />
              )}
            </header>
          )}
          {!FNDashboard && <DashboardPrompt dashboard={dashboard} />}
          {initError && <DashboardFailed />}
          {FNDashboard && (
            <div className={fnControlsClassName}>
              <div className={fnVariablesClassName}>
                {showSubMenu && (
                  <section aria-label={selectors.pages.Dashboard.SubMenu.submenu}>
                    <SubMenu dashboard={dashboard} annotations={dashboard.annotations.list} links={dashboard.links} />
                  </section>
                )}
              </div>
              <div className={fnTimeRangeClassName}>{FNTimeRange}</div>
            </div>
          )}
          {showSubMenu && !FNDashboard && (
            <section aria-label={selectors.pages.Dashboard.SubMenu.submenu}>
              <SubMenu dashboard={dashboard} annotations={dashboard.annotations.list} links={dashboard.links} />
            </section>
          )}
          <DashboardGrid
            dashboard={dashboard}
            isEditable={!!dashboard.meta.canEdit && !FNDashboard}
            isLayoutEditable={isDashboardGridLayoutEditable}
            onLayoutUpdate={isCustomFnDashboardLayoutEditable ? this.onFnDashboardLayoutChange : undefined}
            viewPanel={viewPanel}
            editPanel={editPanel}
          />

          {inspectPanel && !FNDashboard && <PanelInspector dashboard={dashboard} panel={inspectPanel} />}
        </Page>
        {editPanel && !FNDashboard && sectionNav && pageNav && (
          <PanelEditor
            dashboard={dashboard}
            sourcePanel={editPanel}
            tab={this.props.queryParams.tab}
            sectionNav={sectionNav}
            pageNav={pageNav}
          />
        )}
        {queryParams.editview && !FNDashboard && pageNav && sectionNav && (
          <DashboardSettings
            dashboard={dashboard}
            editview={queryParams.editview}
            pageNav={pageNav}
            sectionNav={sectionNav}
          />
        )}
        {!FNDashboard && queryParams.addWidget && config.featureToggles.vizAndWidgetSplit && <AddWidgetModal />}
      </React.Fragment>
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

export const DashboardPage = withTheme2(UnthemedDashboardPage);
DashboardPage.displayName = 'DashboardPage';
export default connector(DashboardPage);

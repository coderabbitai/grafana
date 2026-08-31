import classNames from 'classnames';
import React, { PureComponent, CSSProperties } from 'react';
import ReactGridLayout, { ItemCallback } from 'react-grid-layout';
import { connect } from 'react-redux';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Subscription } from 'rxjs';

import { config } from '@grafana/runtime';
import { GRID_CELL_HEIGHT, GRID_CELL_VMARGIN, GRID_COLUMN_COUNT } from 'app/core/constants';
import { contextSrv } from 'app/core/services/context_srv';
import { StoreState } from 'app/types';
import { DashboardPanelsChangedEvent } from 'app/types/events';

import { AddLibraryPanelWidget } from '../components/AddLibraryPanelWidget';
import { DashboardRow } from '../components/DashboardRow';
import { DashboardModel, PanelModel } from '../state';
import { GridPos } from '../state/PanelModel';

import DashboardEmpty from './DashboardEmpty';
import { DashboardPanel } from './DashboardPanel';

export interface Props {
  dashboard: DashboardModel;
  isEditable: boolean;
  isLayoutEditable?: boolean;
  editPanel: PanelModel | null;
  viewPanel: PanelModel | null;
  hidePanelMenus?: boolean;
  isFnDashboard?: boolean;
  onLayoutUpdate?: () => void;
  portalContainerID?: string;
}

interface State {
  /** Host-measured height for an embedded single-panel view. */
  viewPanelHeight?: number;
}

type GridResizeHandle = NonNullable<ReactGridLayout.ReactGridLayoutProps['resizeHandles']>[number];
type ResizeHandleRenderer = (resizeHandle: GridResizeHandle, ref: React.RefObject<HTMLSpanElement>) => React.ReactNode;

const customDashboardResizeHandles: GridResizeHandle[] = ['e', 's', 'se'];
const customDashboardResizeHandleBaseStyle: CSSProperties = {
  display: 'block',
  pointerEvents: 'auto',
  position: 'absolute',
  touchAction: 'none',
  visibility: 'visible',
  zIndex: 20,
};

const customDashboardResizeHandleStyles: Record<GridResizeHandle, CSSProperties> = {
  e: { ...customDashboardResizeHandleBaseStyle, cursor: 'ew-resize', height: '100%', right: -6, top: 0, width: 12 },
  n: { ...customDashboardResizeHandleBaseStyle, cursor: 'ns-resize', height: 12, left: 0, top: -6, width: '100%' },
  ne: { ...customDashboardResizeHandleBaseStyle, cursor: 'ne-resize', height: 28, right: -6, top: -6, width: 28 },
  nw: { ...customDashboardResizeHandleBaseStyle, cursor: 'nw-resize', height: 28, left: -6, top: -6, width: 28 },
  s: { ...customDashboardResizeHandleBaseStyle, bottom: -6, cursor: 'ns-resize', height: 12, left: 0, width: '100%' },
  se: { ...customDashboardResizeHandleBaseStyle, bottom: -6, cursor: 'se-resize', height: 28, right: -6, width: 28 },
  sw: { ...customDashboardResizeHandleBaseStyle, bottom: -6, cursor: 'sw-resize', height: 28, left: -6, width: 28 },
  w: { ...customDashboardResizeHandleBaseStyle, cursor: 'ew-resize', height: '100%', left: -6, top: 0, width: 12 },
};

const renderCustomDashboardResizeHandle: ResizeHandleRenderer = (resizeHandle, ref) => (
  <span
    aria-hidden="true"
    className={`react-resizable-handle react-resizable-handle-${resizeHandle}`}
    ref={ref}
    style={customDashboardResizeHandleStyles[resizeHandle]}
  />
);

const customDashboardResizeHandle =
  renderCustomDashboardResizeHandle as ReactGridLayout.ReactGridLayoutProps['resizeHandle'];

export class Component extends PureComponent<Props, State> {
  private panelMap: { [key: string]: PanelModel } = {};
  private eventSubs = new Subscription();
  private windowHeight = 1200;
  private windowWidth = 1920;
  private gridWidth = 0;
  /** Used to keep track of mobile panel layout position */
  private lastPanelBottom = 0;
  private isLayoutInitialized = false;
  private portalResizeObserver?: ResizeObserver;
  private gridWrapperElement?: HTMLDivElement;
  private embeddedHeightMeasureAnimationFrame?: number;
  private embeddedViewPanelMeasureRetryTimeout?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    this.state = { viewPanelHeight: undefined };
  }

  componentDidMount() {
    const { dashboard } = this.props;
    this.eventSubs.add(dashboard.events.subscribe(DashboardPanelsChangedEvent, this.triggerForceUpdate));
    this.observePortalContainer();
  }

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.portalContainerID !== this.props.portalContainerID ||
      prevProps.viewPanel !== this.props.viewPanel ||
      prevProps.isFnDashboard !== this.props.isFnDashboard
    ) {
      this.observePortalContainer();
    }
  }

  componentWillUnmount() {
    this.eventSubs.unsubscribe();
    this.portalResizeObserver?.disconnect();
    this.portalResizeObserver = undefined;
    if (this.embeddedHeightMeasureAnimationFrame !== undefined) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.embeddedHeightMeasureAnimationFrame);
      }
      this.embeddedHeightMeasureAnimationFrame = undefined;
    }
    if (this.embeddedViewPanelMeasureRetryTimeout !== undefined) {
      clearTimeout(this.embeddedViewPanelMeasureRetryTimeout);
      this.embeddedViewPanelMeasureRetryTimeout = undefined;
    }
  }

  /**
   * Embedded (MFE) single-panel mode only.
   *
   * The host sizes the portal container, but on first paint it can still measure
   * 0 (the portal div mounts before the host flex layout resolves). A one-shot
   * read therefore falls back to `windowHeight * 0.85`, which overflows the host
   * box and crops the panel. Observing the container keeps the panel height in
   * sync with whatever the host actually allocates, including window resizes.
   */
  observePortalContainer() {
    this.portalResizeObserver?.disconnect();
    this.portalResizeObserver = undefined;

    const { isFnDashboard, viewPanel, portalContainerID } = this.props;
    if (!isFnDashboard || !viewPanel || !portalContainerID) {
      if (this.state.viewPanelHeight !== undefined) {
        this.setState({ viewPanelHeight: undefined });
      }
      return;
    }

    const portalContainer = document.getElementById(portalContainerID);
    if (!portalContainer) {
      return;
    }

    this.portalResizeObserver = new ResizeObserver(this.scheduleEmbeddedViewPanelHeightMeasure);
    this.portalResizeObserver.observe(portalContainer);

    const height = this.measureEmbeddedViewPanelHeight();
    if (height !== undefined && height > 0 && height !== this.state.viewPanelHeight) {
      this.setState({ viewPanelHeight: height });
    }

    this.scheduleEmbeddedViewPanelMeasureRetry();
  }

  scheduleEmbeddedViewPanelHeightMeasure = () => {
    if (!this.props.isFnDashboard || !this.props.viewPanel) {
      return;
    }

    if (this.embeddedHeightMeasureAnimationFrame !== undefined) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.embeddedHeightMeasureAnimationFrame);
      }
      this.embeddedHeightMeasureAnimationFrame = undefined;
    }

    const measureHeight = () => {
      this.embeddedHeightMeasureAnimationFrame = undefined;
      const height = this.measureEmbeddedViewPanelHeight();

      if (height !== undefined && height > 0 && height !== this.state.viewPanelHeight) {
        this.setState({ viewPanelHeight: height });
      }
    };

    if (typeof requestAnimationFrame !== 'function') {
      measureHeight();
      return;
    }

    this.embeddedHeightMeasureAnimationFrame = requestAnimationFrame(measureHeight);
  };

  scheduleEmbeddedViewPanelMeasureRetry = (attempt = 0) => {
    if (this.embeddedViewPanelMeasureRetryTimeout !== undefined) {
      clearTimeout(this.embeddedViewPanelMeasureRetryTimeout);
      this.embeddedViewPanelMeasureRetryTimeout = undefined;
    }

    if (!this.props.isFnDashboard || !this.props.viewPanel) {
      return;
    }

    this.embeddedViewPanelMeasureRetryTimeout = setTimeout(() => {
      this.embeddedViewPanelMeasureRetryTimeout = undefined;

      if (!this.props.isFnDashboard || !this.props.viewPanel) {
        return;
      }

      const width = this.measureEmbeddedViewPanelWidth();
      const height = this.measureEmbeddedViewPanelHeight();
      if (width !== undefined && height !== undefined) {
        if (height !== this.state.viewPanelHeight) {
          this.setState({ viewPanelHeight: height });
        } else {
          this.forceUpdate();
        }
        return;
      }

      if (attempt < 120) {
        this.scheduleEmbeddedViewPanelMeasureRetry(attempt + 1);
      }
    }, 250);
  };

  measureEmbeddedViewPanelHeight(): number | undefined {
    if (!this.props.isFnDashboard || !this.props.viewPanel || !this.props.portalContainerID) {
      return undefined;
    }

    const portalContainer = document.getElementById(this.props.portalContainerID);
    if (!portalContainer) {
      return undefined;
    }

    const gridElement = this.gridWrapperElement ?? portalContainer.querySelector<HTMLElement>('.react-grid-layout');
    if (!gridElement) {
      const height = portalContainer.clientHeight;
      return height > 0 ? height : undefined;
    }

    const portalRect = portalContainer.getBoundingClientRect();
    const gridRect = gridElement.getBoundingClientRect();
    const availableHeight = Math.floor(portalRect.bottom - gridRect.top - GRID_CELL_VMARGIN);

    return availableHeight > 0 ? availableHeight : undefined;
  }

  measureEmbeddedViewPanelWidth(): number | undefined {
    if (!this.props.isFnDashboard || !this.props.viewPanel || !this.props.portalContainerID) {
      return undefined;
    }

    const portalContainer = document.getElementById(this.props.portalContainerID);
    if (!portalContainer) {
      return undefined;
    }

    const scrollContainer = portalContainer.querySelector<HTMLElement>('#page-scrollbar');
    const canvasContent =
      scrollContainer?.firstElementChild instanceof HTMLElement ? scrollContainer.firstElementChild : undefined;
    const widthElement = canvasContent ?? portalContainer;
    const widthElementStyle = getComputedStyle(widthElement);
    const horizontalPadding =
      parseFloat(widthElementStyle.paddingLeft || '0') + parseFloat(widthElementStyle.paddingRight || '0');
    const width = Math.floor(
      (widthElement.getBoundingClientRect().width || widthElement.clientWidth) - horizontalPadding
    );

    return width > 0 ? width : undefined;
  }

  getRenderablePanels(): PanelModel[] {
    if (this.props.isFnDashboard && this.props.viewPanel) {
      return [this.props.viewPanel];
    }

    return this.props.dashboard.panels;
  }

  isEmbeddedViewPanel(panel: PanelModel): boolean {
    return Boolean(this.props.isFnDashboard && this.props.viewPanel === panel);
  }

  buildLayout() {
    const layout: ReactGridLayout.Layout[] = [];
    this.panelMap = {};

    for (const panel of this.getRenderablePanels()) {
      if (!panel.key) {
        panel.key = `panel-${panel.id}-${Date.now()}`;
      }
      this.panelMap[panel.key] = panel;

      if (!panel.gridPos) {
        console.log('panel without gridpos');
        continue;
      }

      const isEmbeddedViewPanel = this.isEmbeddedViewPanel(panel);
      const panelPos: ReactGridLayout.Layout = {
        i: panel.key,
        x: isEmbeddedViewPanel ? 0 : panel.gridPos.x,
        y: isEmbeddedViewPanel ? 0 : panel.gridPos.y,
        w: isEmbeddedViewPanel ? GRID_COLUMN_COUNT : panel.gridPos.w,
        h: panel.gridPos.h,
      };

      if (panel.type === 'row') {
        panelPos.w = GRID_COLUMN_COUNT;
        panelPos.h = 1;
        panelPos.isResizable = false;
        panelPos.isDraggable = panel.collapsed;
      }

      layout.push(panelPos);
    }

    return layout;
  }

  onLayoutChange = (newLayout: ReactGridLayout.Layout[]) => {
    if (this.props.isFnDashboard && this.props.viewPanel) {
      return;
    }

    for (const newPos of newLayout) {
      this.panelMap[newPos.i!].updateGridPos(newPos, this.isLayoutInitialized);
    }

    if (!this.isLayoutInitialized) {
      this.isLayoutInitialized = true;
    }

    this.props.dashboard.sortPanelsByGridPos();
    this.forceUpdate();
  };

  triggerForceUpdate = () => {
    this.forceUpdate();
  };

  updateGridPos = (item: ReactGridLayout.Layout, layout: ReactGridLayout.Layout[]) => {
    this.panelMap[item.i!].updateGridPos(item);
  };

  onResize: ItemCallback = (layout, oldItem, newItem) => {
    const panel = this.panelMap[newItem.i!];
    panel.updateGridPos(newItem);
  };

  onResizeStop: ItemCallback = (layout, oldItem, newItem) => {
    this.updateGridPos(newItem, layout);
    this.props.onLayoutUpdate?.();
  };

  onDragStop: ItemCallback = (layout, oldItem, newItem) => {
    this.updateGridPos(newItem, layout);
    this.props.onLayoutUpdate?.();
  };

  getPanelScreenPos(panel: PanelModel, gridWidth: number): { top: number; bottom: number } {
    let top = 0;

    // mobile layout
    if (gridWidth < config.theme2.breakpoints.values.md) {
      // In mobile layout panels are stacked so we just add the panel vertical margin to the last panel bottom position
      top = this.lastPanelBottom + GRID_CELL_VMARGIN;
    } else {
      // For top position we need to add back the vertical margin removed by translateGridHeightToScreenHeight
      top = translateGridHeightToScreenHeight(panel.gridPos.y) + GRID_CELL_VMARGIN;
    }

    this.lastPanelBottom = top + translateGridHeightToScreenHeight(panel.gridPos.h);

    return { top, bottom: this.lastPanelBottom };
  }

  getEmbeddedViewPanelHeight(): number | undefined {
    const measuredHeight = this.measureEmbeddedViewPanelHeight();
    if (measuredHeight !== undefined) {
      return measuredHeight;
    }

    // Prefer the observed height; fall back to a direct read for the first paint
    // before the ResizeObserver has delivered its initial entry.
    if (this.state.viewPanelHeight !== undefined) {
      return this.state.viewPanelHeight;
    }

    return undefined;
  }

  renderPanels(gridWidth: number, isDashboardDraggable: boolean) {
    const panelElements = [];
    const viewPanelHeight = this.getEmbeddedViewPanelHeight();

    // Reset last panel bottom
    this.lastPanelBottom = 0;

    // This is to avoid layout re-flows, accessing window.innerHeight can trigger re-flow
    // We assume here that if width change height might have changed as well
    if (this.gridWidth !== gridWidth) {
      this.windowHeight = window.innerHeight ?? 1000;
      this.windowWidth = window.innerWidth;
      this.gridWidth = gridWidth;
    }

    for (const panel of this.getRenderablePanels()) {
      const isViewing = panel.isViewing || panel === this.props.viewPanel;
      const panelClasses = classNames({ 'react-grid-item--fullscreen': isViewing });

      panelElements.push(
        <GrafanaGridItem
          key={panel.key}
          className={panelClasses}
          data-panelid={panel.id}
          gridPos={panel.gridPos}
          gridWidth={gridWidth}
          windowHeight={this.windowHeight}
          windowWidth={this.windowWidth}
          viewPanelHeight={viewPanelHeight}
          isViewing={isViewing}
        >
          {(width: number, height: number) => {
            return this.renderPanel(panel, width, height, isDashboardDraggable);
          }}
        </GrafanaGridItem>
      );
    }

    return panelElements;
  }

  renderPanel(panel: PanelModel, width: number, height: number, isDraggable: boolean) {
    if (panel.type === 'row') {
      return <DashboardRow key={panel.key} panel={panel} dashboard={this.props.dashboard} />;
    }

    if (panel.type === 'add-library-panel') {
      return <AddLibraryPanelWidget key={panel.key} panel={panel} dashboard={this.props.dashboard} />;
    }

    return (
      <DashboardPanel
        key={panel.key}
        stateKey={panel.key}
        panel={panel}
        dashboard={this.props.dashboard}
        isEditing={panel.isEditing}
        isViewing={panel.isViewing}
        isDraggable={isDraggable}
        width={width}
        height={height}
        hideMenu={this.props.hidePanelMenus}
      />
    );
  }

  /**
   * Without this hack the move animations are triggered on initial load and all panels fly into position.
   * This can be quite distracting and make the dashboard appear to less snappy.
   */
  onGetWrapperDivRef = (ref: HTMLDivElement | null) => {
    if (ref) {
      this.gridWrapperElement = ref;
    } else {
      this.gridWrapperElement = undefined;
    }

    if (ref && contextSrv.user.authenticatedBy !== 'render') {
      setTimeout(() => {
        ref.classList.add('react-grid-layout--enable-move-animations');
      }, 50);
    }

    if (ref) {
      this.scheduleEmbeddedViewPanelHeightMeasure();
    }
  };

  render() {
    const { isEditable, isFnDashboard, isLayoutEditable = isEditable, dashboard } = this.props;
    const useCustomResizeHandle = Boolean(isFnDashboard && isLayoutEditable);

    if (config.featureToggles.emptyDashboardPage && dashboard.panels.length === 0) {
      return <DashboardEmpty dashboard={dashboard} canCreate={isEditable} />;
    }

    const renderGrid = (gridWidth: number) => {
      // Disable draggable if mobile device, solving an issue with unintentionally
      // moving panels. https://github.com/grafana/grafana/issues/18497
      const isLg = gridWidth <= config.theme2.breakpoints.values.md;
      const draggable = isLg ? false : isLayoutEditable;

      return (
        /**
         * The children use a width of 100%, so wrap them in an element with the
         * calculated grid width.
         */
        <div style={{ width: gridWidth, height: '100%' }} ref={this.onGetWrapperDivRef}>
          <ReactGridLayout
            width={gridWidth}
            isDraggable={draggable}
            isResizable={isLayoutEditable}
            resizeHandle={useCustomResizeHandle ? customDashboardResizeHandle : undefined}
            resizeHandles={useCustomResizeHandle ? customDashboardResizeHandles : undefined}
            containerPadding={[0, 0]}
            useCSSTransforms={true}
            margin={[GRID_CELL_VMARGIN, GRID_CELL_VMARGIN]}
            cols={GRID_COLUMN_COUNT}
            rowHeight={GRID_CELL_HEIGHT}
            draggableHandle=".grid-drag-handle"
            draggableCancel=".grid-drag-cancel"
            layout={this.buildLayout()}
            onDragStop={this.onDragStop}
            onResize={this.onResize}
            onResizeStop={this.onResizeStop}
            onLayoutChange={this.onLayoutChange}
          >
            {this.renderPanels(gridWidth, draggable)}
          </ReactGridLayout>
        </div>
      );
    };

    const renderEmbeddedViewPanelGrid = () => {
      const gridWidth = this.measureEmbeddedViewPanelWidth();

      return gridWidth === undefined ? null : renderGrid(gridWidth);
    };

    /**
     * We have a parent with "flex: 1 1 0" we need to reset it to "flex: 1 1 auto" to have the AutoSizer
     * properly working. For more information go here:
     * https://github.com/bvaughn/react-virtualized/blob/master/docs/usingAutoSizer.md#can-i-use-autosizer-within-a-flex-container
     */
    return (
      <div style={{ flex: '1 1 auto', display: this.props.editPanel ? 'none' : undefined }}>
        {isFnDashboard && this.props.viewPanel ? (
          renderEmbeddedViewPanelGrid()
        ) : (
          <AutoSizer disableHeight>
            {({ width }) => {
              if (width === 0) {
                return null;
              }

              return renderGrid(width);
            }}
          </AutoSizer>
        )}
      </div>
    );
  }
}

interface GrafanaGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  gridWidth?: number;
  gridPos?: GridPos;
  isViewing: boolean;
  windowHeight: number;
  windowWidth: number;
  viewPanelHeight?: number;
  children: any;
}

/**
 * A hacky way to intercept the react-layout-grid item dimensions and pass them to DashboardPanel
 */
const GrafanaGridItem = React.forwardRef<HTMLDivElement, GrafanaGridItemProps>((props, ref) => {
  const theme = config.theme2;
  let width = 100;
  let height = 100;

  const { gridWidth, gridPos, isViewing, windowHeight, windowWidth, viewPanelHeight, ...divProps } = props;
  const style: CSSProperties = props.style ?? {};

  if (isViewing) {
    // In fullscreen view mode a single panel take up full width & 85% height.
    // Embedded FN dashboards have a host-owned viewport, so use that measured
    // height instead of the browser window to avoid cropping inside the host.
    width = gridWidth!;
    height = viewPanelHeight ?? windowHeight * 0.85;
    style.height = height;
    style.width = '100%';
  } else if (windowWidth < theme.breakpoints.values.md) {
    // Mobile layout is a bit different, every panel take up full width
    width = props.gridWidth!;
    height = translateGridHeightToScreenHeight(gridPos!.h);
    style.height = height;
    style.width = '100%';
  } else {
    // Normal grid layout. The grid framework passes width and height directly to children as style props.
    if (props.style) {
      const { width: styleWidth, height: styleHeight } = props.style;
      if (styleWidth != null) {
        width = typeof styleWidth === 'number' ? styleWidth : parseFloat(styleWidth);
      }
      if (styleHeight != null) {
        height = typeof styleHeight === 'number' ? styleHeight : parseFloat(styleHeight);
      }
    }
  }

  // props.children[0] is our main children. RGL adds the drag handle at props.children[1]
  return (
    <div {...divProps} ref={ref}>
      {/* Pass width and height to children as render props */}
      {[props.children[0](width, height), props.children.slice(1)]}
    </div>
  );
});

/**
 * This translates grid height dimensions to real pixels
 */
function translateGridHeightToScreenHeight(gridHeight: number): number {
  return gridHeight * (GRID_CELL_HEIGHT + GRID_CELL_VMARGIN) - GRID_CELL_VMARGIN;
}

GrafanaGridItem.displayName = 'GridItemWithDimensions';

function mapStateToProps() {
  return (state: StoreState) => ({
    isFnDashboard: state.fnGlobalState.FNDashboard,
    portalContainerID: state.fnGlobalState.portalContainerID,
  });
}

export const DashboardGrid = connect(mapStateToProps)(Component);

import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { useEffectOnce } from 'react-use';
import { getGrafanaContextMock } from 'test/mocks/getGrafanaContextMock';

import { TextBoxVariableModel } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { Dashboard } from '@grafana/schema';
import appEvents from 'app/core/app_events';
import { GRID_CELL_VMARGIN, GRID_COLUMN_COUNT } from 'app/core/constants';
import { GrafanaContext } from 'app/core/context/GrafanaContext';
import { GetVariables } from 'app/features/variables/state/selectors';
import { VariablesChanged } from 'app/features/variables/types';
import { configureStore } from 'app/store/configureStore';
import { DashboardMeta } from 'app/types';

import { DashboardModel, PanelModel } from '../state';
import { createDashboardModelFixture } from '../state/__fixtures__/dashboardFixtures';

import { Component, DashboardGrid, Props } from './DashboardGrid';
import { Props as LazyLoaderProps } from './LazyLoader';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  config: {
    ...jest.requireActual('@grafana/runtime').config,
    featureToggles: {
      panelFilterVariable: true,
    },
  },
}));

jest.mock('app/features/dashboard/dashgrid/LazyLoader', () => {
  const LazyLoader = ({ children, onLoad }: Pick<LazyLoaderProps, 'children' | 'onLoad'>) => {
    useEffectOnce(() => {
      onLoad?.();
    });
    return <>{typeof children === 'function' ? children({ isInView: true }) : children}</>;
  };
  return { LazyLoader };
});

function setup(props: Props) {
  const context = getGrafanaContextMock();
  const store = configureStore({});

  return render(
    <GrafanaContext.Provider value={context}>
      <Provider store={store}>
        <Router history={locationService.getHistory()}>
          <DashboardGrid {...props} />
        </Router>
      </Provider>
    </GrafanaContext.Provider>
  );
}

function getRect(overrides: Partial<DOMRect>): DOMRect {
  return {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    toJSON: () => ({}),
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function getRequiredPanel(dashboard: DashboardModel, panelId: number): PanelModel {
  const panel = dashboard.getPanelById(panelId);
  if (!panel) {
    throw new Error(`Expected test dashboard to contain panel ${panelId}`);
  }

  return panel;
}

function getTestDashboard(
  overrides?: Partial<Dashboard>,
  metaOverrides?: Partial<DashboardMeta>,
  getVariablesFromState?: GetVariables
): DashboardModel {
  const data = Object.assign(
    {
      title: 'My dashboard',
      panels: [
        {
          id: 1,
          type: 'graph',
          title: 'My graph',
          gridPos: { x: 0, y: 0, w: 24, h: 10 },
        },
        {
          id: 2,
          type: 'table',
          title: 'My table',
          gridPos: { x: 0, y: 10, w: 25, h: 10 },
        },
        {
          id: 3,
          type: 'table',
          title: 'My table 2',
          gridPos: { x: 0, y: 20, w: 25, h: 100 },
        },
        {
          id: 4,
          type: 'gauge',
          title: 'My gauge',
          gridPos: { x: 0, y: 120, w: 25, h: 10 },
        },
      ],
    },
    overrides
  );

  return createDashboardModelFixture(data, metaOverrides, getVariablesFromState);
}

describe('DashboardGrid', () => {
  it('Should render panels', async () => {
    const props: Props = {
      editPanel: null,
      viewPanel: null,
      isEditable: true,
      dashboard: getTestDashboard(),
    };

    act(() => {
      setup(props);
    });

    expect(await screen.findByText('My graph')).toBeInTheDocument();
    expect(await screen.findByText('My table')).toBeInTheDocument();
    expect(await screen.findByText('My table 2')).toBeInTheDocument();
    expect(await screen.findByText('My gauge')).toBeInTheDocument();
  });

  it('Should render only the selected panel in embedded view-panel mode', async () => {
    const dashboard = getTestDashboard();
    const viewPanel = getRequiredPanel(dashboard, 2);
    dashboard.initViewPanel(viewPanel);

    const props: Props = {
      editPanel: null,
      viewPanel,
      isEditable: false,
      isFnDashboard: true,
      portalContainerID: 'grafana-portal',
      dashboard,
    };

    act(() => {
      setup(props);
    });

    expect(await screen.findByText('My table')).toBeInTheDocument();
    expect(screen.queryByText('My graph')).toBeNull();
    expect(screen.queryByText('My table 2')).toBeNull();
    expect(screen.queryByText('My gauge')).toBeNull();
  });

  it('Should normalize selected panel layout in embedded view-panel mode without changing the dashboard model', () => {
    const dashboard = getTestDashboard();
    const viewPanel = getRequiredPanel(dashboard, 2);
    const originalGridPos = { x: 12, y: 10, w: 12, h: 10 };
    viewPanel.gridPos = { ...originalGridPos };
    dashboard.initViewPanel(viewPanel);

    const props: Props = {
      editPanel: null,
      viewPanel,
      isEditable: false,
      isFnDashboard: true,
      portalContainerID: 'grafana-portal',
      dashboard,
    };

    const grid = new Component(props);
    const layout = grid.buildLayout();
    const panelLayout = layout[0]!;

    expect(layout).toHaveLength(1);
    expect(panelLayout).toEqual(
      expect.objectContaining({
        x: 0,
        y: 0,
        w: GRID_COLUMN_COUNT,
        h: originalGridPos.h,
      })
    );

    grid.onLayoutChange([{ ...panelLayout, x: 8, y: 5, w: 8, h: 8 }]);

    expect(viewPanel.gridPos).toEqual(originalGridPos);
  });

  it('Should measure embedded view-panel height below dashboard controls', () => {
    const dashboard = getTestDashboard();
    const viewPanel = getRequiredPanel(dashboard, 2);
    dashboard.initViewPanel(viewPanel);
    const portal = document.createElement('div');
    const gridWrapper = document.createElement('div');
    portal.id = 'grafana-portal';
    portal.appendChild(gridWrapper);
    document.body.appendChild(portal);

    jest.spyOn(portal, 'getBoundingClientRect').mockReturnValue(getRect({ bottom: 680, height: 575, top: 105 }));
    jest.spyOn(gridWrapper, 'getBoundingClientRect').mockReturnValue(getRect({ bottom: 541, height: 372, top: 169 }));

    const props: Props = {
      editPanel: null,
      viewPanel,
      isEditable: false,
      isFnDashboard: true,
      portalContainerID: portal.id,
      dashboard,
    };
    const grid = new Component(props);
    Object.defineProperty(grid, 'gridWrapperElement', {
      value: gridWrapper,
    });

    expect(grid.getEmbeddedViewPanelHeight()).toBe(680 - 169 - GRID_CELL_VMARGIN);

    portal.remove();
  });

  it('Should allow filtering panels', async () => {
    const props: Props = {
      editPanel: null,
      viewPanel: null,
      isEditable: true,
      dashboard: getTestDashboard(),
    };
    act(() => {
      setup(props);
    });

    act(() => {
      appEvents.publish(
        new VariablesChanged({
          panelIds: [],
          refreshAll: false,
          variable: {
            type: 'textbox',
            id: '1',
            current: {
              value: 'My graph',
            },
          } as TextBoxVariableModel,
        })
      );
    });
    const table = screen.queryByText('My table');
    const table2 = screen.queryByText('My table 2');
    const gauge = screen.queryByText('My gauge');

    expect(await screen.findByText('My graph')).toBeInTheDocument();
    expect(table).toBeNull();
    expect(table2).toBeNull();
    expect(gauge).toBeNull();
  });

  it('Should rendered filtered panels on init when filter variable is present', async () => {
    const props: Props = {
      editPanel: null,
      viewPanel: null,
      isEditable: true,
      dashboard: getTestDashboard(undefined, undefined, () => [
        {
          id: '1',
          type: 'textbox',
          query: 'My tab',
        } as TextBoxVariableModel,
      ]),
    };

    act(() => {
      setup(props);
    });

    const graph = screen.queryByText('My graph');
    const gauge = screen.queryByText('My gauge');

    expect(await screen.findByText('My table')).toBeInTheDocument();
    expect(await screen.findByText('My table 2')).toBeInTheDocument();
    expect(graph).toBeNull();
    expect(gauge).toBeNull();
  });
});

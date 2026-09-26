import { render } from '@testing-library/react';

import { mfeDispatch, mfeGetStoreState, updateRenderingDashboardUID } from 'app/store/configureMfeStore';

import { getDashboardModel } from '../../../../../test/helpers/getDashboardModel';
import { getTimeSrv } from '../../services/TimeSrv';
import { DashboardModel } from '../../state/DashboardModel';
import { PanelModel } from '../../state/PanelModel';

import { DashNavTimeControls } from './DashNavTimeControls';

jest.unmock('@grafana/scenes');
jest.unmock('@grafana/data');
jest.unmock('@grafana/runtime');

describe('DashNavTimeControls', () => {
  let dashboardModel: DashboardModel;

  beforeEach(() => {
    const json = {
      panels: [
        {
          datasource: null,
          gridPos: {
            h: 3,
            w: 24,
            x: 0,
            y: 8,
          },
          id: 1,
          type: 'welcome',
        },
      ],
      refresh: '',
      templating: {
        list: [],
      },
    };
    dashboardModel = getDashboardModel(json);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mfeDispatch(updateRenderingDashboardUID(''));
  });

  it('refreshes the embedded toolbar owner rather than a stale singleton model', async () => {
    dashboardModel.uid = 'toolbar-owner';
    mfeDispatch(updateRenderingDashboardUID('other-dashboard'));
    const singletonRefresh = jest.spyOn(getTimeSrv(), 'refreshTimeModel').mockImplementation(() => {});
    const ownerRefresh = jest.spyOn(dashboardModel, 'timeRangeUpdated').mockImplementation(() => {
      expect(mfeGetStoreState().fnGlobalReducer.renderingDashboardUID).toBe('toolbar-owner');
      return Promise.resolve();
    });
    const controls = new DashNavTimeControls({
      dashboard: dashboardModel,
      isFnDashboard: true,
      onChangeTimeZone: jest.fn(),
    });

    await controls.onRefresh();

    expect(ownerRefresh).toHaveBeenCalledTimes(1);
    expect(singletonRefresh).not.toHaveBeenCalled();
    expect(mfeGetStoreState().fnGlobalReducer.renderingDashboardUID).toBe('other-dashboard');
  });

  it('restores the previous owner when embedded refresh dispatch throws', () => {
    dashboardModel.uid = 'toolbar-owner';
    mfeDispatch(updateRenderingDashboardUID('other-dashboard'));
    jest.spyOn(dashboardModel, 'timeRangeUpdated').mockImplementation(() => {
      throw new Error('dispatch failed');
    });
    const controls = new DashNavTimeControls({
      dashboard: dashboardModel,
      isFnDashboard: true,
      onChangeTimeZone: jest.fn(),
    });

    expect(() => controls.onRefresh()).toThrow('dispatch failed');
    expect(mfeGetStoreState().fnGlobalReducer.renderingDashboardUID).toBe('other-dashboard');
  });

  it('restores ownership before an asynchronous refresh settles and preserves its rejection', async () => {
    dashboardModel.uid = 'toolbar-owner';
    mfeDispatch(updateRenderingDashboardUID('other-dashboard'));
    let rejectRefresh!: (error: Error) => void;
    const pending = new Promise<void>((_, reject) => {
      rejectRefresh = reject;
    });
    jest.spyOn(dashboardModel, 'timeRangeUpdated').mockReturnValue(pending);
    const controls = new DashNavTimeControls({
      dashboard: dashboardModel,
      isFnDashboard: true,
      onChangeTimeZone: jest.fn(),
    });

    const result = controls.onRefreshClick();
    expect(result).toBe(pending);
    expect(mfeGetStoreState().fnGlobalReducer.renderingDashboardUID).toBe('other-dashboard');
    rejectRefresh(new Error('refresh failed'));
    await expect(result).rejects.toThrow('refresh failed');
  });

  it('keeps standalone refresh on the time service', async () => {
    const singletonRefresh = jest.spyOn(getTimeSrv(), 'refreshTimeModel').mockImplementation(() => {});
    const ownerRefresh = jest.spyOn(dashboardModel, 'timeRangeUpdated');
    const controls = new DashNavTimeControls({ dashboard: dashboardModel, onChangeTimeZone: jest.fn() });

    await controls.onRefresh();

    expect(singletonRefresh).toHaveBeenCalledTimes(1);
    expect(ownerRefresh).not.toHaveBeenCalled();
  });

  it('renders RefreshPicker with run button in panel view', () => {
    const container = render(
      <DashNavTimeControls dashboard={dashboardModel} onChangeTimeZone={jest.fn()} key="time-controls" />
    );
    expect(container.queryByLabelText(/Refresh dashboard/i)).toBeInTheDocument();
  });

  it('renders RefreshPicker with interval button in panel view', () => {
    const container = render(
      <DashNavTimeControls dashboard={dashboardModel} onChangeTimeZone={jest.fn()} key="time-controls" />
    );
    expect(container.queryByLabelText(/Choose refresh time interval/i)).toBeInTheDocument();
  });

  it('should not render RefreshPicker interval button in panel edit', () => {
    const panel: PanelModel = new PanelModel({ destroy: jest.fn(), isEditing: true });
    dashboardModel.startRefresh = jest.fn();
    dashboardModel.panelInEdit = panel;
    const container = render(
      <DashNavTimeControls dashboard={dashboardModel} onChangeTimeZone={jest.fn()} key="time-controls" />
    );
    expect(container.queryByLabelText(/Choose refresh time interval/i)).not.toBeInTheDocument();
  });

  it('should render RefreshPicker run button in panel edit', () => {
    const panel: PanelModel = new PanelModel({ destroy: jest.fn(), isEditing: true });
    dashboardModel.startRefresh = jest.fn();
    dashboardModel.panelInEdit = panel;
    const container = render(
      <DashNavTimeControls dashboard={dashboardModel} onChangeTimeZone={jest.fn()} key="time-controls" />
    );
    expect(container.queryByLabelText(/Refresh dashboard/i)).toBeInTheDocument();
  });
});

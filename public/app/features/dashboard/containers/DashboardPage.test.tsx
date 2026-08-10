import type { FieldConfigSource } from '@grafana/data';
import type { PanelModel } from 'app/features/dashboard/state';

import { applyFnPanelOptionsPreview } from './DashboardPageFnPanelOptions';

interface PanelStub {
  description?: string;
  fieldConfig: FieldConfigSource;
  id: number;
  options: Record<string, unknown>;
  render: jest.Mock<void, []>;
  title: string;
  type: string;
  updateFieldConfig: jest.Mock<void, [FieldConfigSource]>;
  updateOptions: jest.Mock<void, [Record<string, unknown>]>;
}

function getPanel(
  type: string,
  panelOverrides: Partial<Pick<PanelStub, 'description' | 'fieldConfig' | 'options' | 'title'>> = {}
): PanelModel & PanelStub {
  const panel: PanelStub = {
    fieldConfig: { defaults: {}, overrides: [] },
    id: 1,
    options: {},
    render: jest.fn<void, []>(),
    title: 'Panel',
    type,
    updateFieldConfig: jest.fn<void, [FieldConfigSource]>(),
    updateOptions: jest.fn<void, [Record<string, unknown>]>(),
    ...panelOverrides,
  };

  panel.updateFieldConfig.mockImplementation((fieldConfig) => {
    panel.fieldConfig = fieldConfig;
  });
  panel.updateOptions.mockImplementation((options) => {
    panel.options = options;
  });

  return panel as PanelModel & PanelStub;
}

function applyOptions(panel: PanelModel, options: Record<string, unknown>): void {
  applyFnPanelOptionsPreview(panel, {
    options,
    panelId: panel.id,
    revision: 1,
  });
}

describe('applyFnPanelOptionsPreview', () => {
  it('applies common field config and stat text options', () => {
    const panel = getPanel('stat', {
      options: { text: { valueSize: 18 } },
    });

    applyOptions(panel, {
      decimals: 2,
      description: 'Updated description',
      fontSize: 36,
      title: 'Updated title',
      unit: 'suffix:s',
    });

    expect(panel.title).toBe('Updated title');
    expect(panel.description).toBe('Updated description');
    expect(panel.fieldConfig.defaults).toEqual(
      expect.objectContaining({
        decimals: 2,
        unit: 'suffix:s',
      })
    );
    expect(panel.options).toEqual(expect.objectContaining({ text: { valueSize: 36 } }));
  });

  it('applies table pagination, filters, sort, header, and footer options', () => {
    const panel = getPanel('table');

    applyOptions(panel, {
      tableCellHeight: 'lg',
      tableColumnFilter: true,
      tableFooter: true,
      tablePagination: true,
      tableShowHeader: false,
      tableSortBy: 'Author',
      tableSortDesc: true,
    });

    expect(panel.fieldConfig.defaults.custom).toEqual({ filterable: true });
    expect(panel.options).toEqual(
      expect.objectContaining({
        cellHeight: 'lg',
        footer: expect.objectContaining({
          enablePagination: true,
          show: true,
        }),
        showHeader: false,
        sortBy: [{ desc: true, displayName: 'Author' }],
      })
    );
  });

  it('applies timeseries style, stacking, legend, and tooltip options', () => {
    const panel = getPanel('timeseries', {
      fieldConfig: {
        defaults: { custom: { stacking: { group: 'B', mode: 'none' } } },
        overrides: [],
      },
      options: { legend: { displayMode: 'list', placement: 'bottom', showLegend: true } },
    });

    applyOptions(panel, {
      legend: false,
      legendMode: 'table',
      legendPlacement: 'right',
      timeseriesDrawStyle: 'bars',
      timeseriesFillOpacity: 30,
      timeseriesLineInterpolation: 'smooth',
      timeseriesLineWidth: 3,
      timeseriesPointSize: 8,
      timeseriesShowPoints: 'always',
      timeseriesStacking: 'normal',
      tooltipMode: 'multi',
      tooltipSort: 'desc',
    });

    expect(panel.fieldConfig.defaults.custom).toEqual(
      expect.objectContaining({
        drawStyle: 'bars',
        fillOpacity: 30,
        lineInterpolation: 'smooth',
        lineWidth: 3,
        pointSize: 8,
        showPoints: 'always',
        stacking: { group: 'B', mode: 'normal' },
      })
    );
    expect(panel.options.legend).toEqual(
      expect.objectContaining({
        displayMode: 'table',
        placement: 'right',
        showLegend: false,
      })
    );
    expect(panel.options.tooltip).toEqual({ mode: 'multi', sort: 'desc' });
  });

  it('applies bar chart layout and display options', () => {
    const panel = getPanel('barchart');

    applyOptions(panel, {
      barFillOpacity: 75,
      barGroupWidth: 0.6,
      barRadius: 0.2,
      barShowValue: 'always',
      barStacking: 'percent',
      barTickLabelMaxLength: 18,
      barTickLabelRotation: -30,
      barWidth: 0.8,
      orientation: 'horizontal',
    });

    expect(panel.fieldConfig.defaults.custom).toEqual({ fillOpacity: 75 });
    expect(panel.options).toEqual(
      expect.objectContaining({
        barRadius: 0.2,
        barWidth: 0.8,
        groupWidth: 0.6,
        orientation: 'horizontal',
        showValue: 'always',
        stacking: 'percent',
        xTickLabelMaxLength: 18,
        xTickLabelRotation: -30,
      })
    );
  });

  it('applies pie chart labels, legend values, and tooltip options', () => {
    const panel = getPanel('piechart');

    applyOptions(panel, {
      pieDisplayLabels: ['name', 'percent'],
      pieLegendValues: ['value'],
      pieType: 'donut',
      tooltipMode: 'none',
      tooltipSort: 'none',
    });

    expect(panel.options).toEqual(
      expect.objectContaining({
        displayLabels: ['name', 'percent'],
        legend: expect.objectContaining({
          values: ['value'],
        }),
        pieType: 'donut',
        tooltip: { mode: 'none', sort: 'none' },
      })
    );
  });
});

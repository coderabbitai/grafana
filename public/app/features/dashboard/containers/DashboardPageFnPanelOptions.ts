import type { FieldConfigSource } from '@grafana/data';
import type { FnPanelOptionsUpdate } from 'app/core/reducers/fn-slice';

export interface FnPanelOptionsPreviewTarget {
  description?: string;
  fieldConfig?: FieldConfigSource;
  id: number;
  options?: Record<string, unknown>;
  render: () => void;
  title: string;
  type: string;
  updateFieldConfig: (fieldConfig: FieldConfigSource) => void;
  updateOptions: (options: Record<string, unknown>) => void;
}

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
  return Array.isArray(value) && value.every((item): item is string => typeof item === 'string') ? value : undefined;
}

interface PanelFieldConfigParts {
  readonly custom: Record<string, unknown>;
  readonly defaults: Record<string, unknown>;
  readonly fieldConfig: FieldConfigSource;
}

const EMPTY_FIELD_CONFIG: FieldConfigSource = {
  defaults: {},
  overrides: [],
};

function panelFieldConfigParts(panel: FnPanelOptionsPreviewTarget): PanelFieldConfigParts {
  const baseFieldConfig = panel.fieldConfig ?? EMPTY_FIELD_CONFIG;
  const defaults = isRecord(baseFieldConfig.defaults) ? { ...baseFieldConfig.defaults } : {};
  const custom = isRecord(defaults.custom) ? { ...defaults.custom } : {};
  const fieldConfig: FieldConfigSource = {
    ...baseFieldConfig,
    defaults,
    overrides: baseFieldConfig.overrides ?? [],
  };

  return {
    custom,
    defaults,
    fieldConfig,
  };
}

function supportsLegendAndTooltip(panel: FnPanelOptionsPreviewTarget): boolean {
  return panel.type === 'timeseries' || panel.type === 'barchart' || panel.type === 'piechart';
}

function applyLegendOptions(
  panel: FnPanelOptionsPreviewTarget,
  options: Record<string, unknown>,
  draft: Readonly<Record<string, unknown>>
): void {
  const legendVisible = booleanValue(draft.legend);
  const legendMode = stringValue(draft.legendMode);
  const legendPlacement = stringValue(draft.legendPlacement);
  const legendValues = panel.type === 'piechart' ? stringArrayValue(draft.pieLegendValues) : undefined;

  if (
    legendVisible === undefined &&
    legendMode === undefined &&
    legendPlacement === undefined &&
    legendValues === undefined
  ) {
    return;
  }

  const legend: Record<string, unknown> = isRecord(options.legend)
    ? { ...options.legend }
    : { calcs: [], displayMode: 'list', placement: 'bottom' };

  if (legendVisible !== undefined) {
    legend.showLegend = legendVisible;
  }

  if (legendMode !== undefined) {
    legend.displayMode = legendMode;
  }

  if (legendPlacement !== undefined) {
    legend.placement = legendPlacement;
  }

  if (legendValues !== undefined) {
    legend.values = legendValues;
  }

  options.legend = legend;
}

function applyTooltipOptions(options: Record<string, unknown>, draft: Readonly<Record<string, unknown>>): void {
  const tooltipMode = stringValue(draft.tooltipMode);
  const tooltipSort = stringValue(draft.tooltipSort);
  if (tooltipMode === undefined && tooltipSort === undefined) {
    return;
  }

  const tooltip = isRecord(options.tooltip) ? { ...options.tooltip } : { mode: 'single', sort: 'none' };
  if (tooltipMode !== undefined) {
    tooltip.mode = tooltipMode;
  }
  if (tooltipSort !== undefined) {
    tooltip.sort = tooltipSort;
  }
  options.tooltip = tooltip;
}

function applySharedGraphOptions(
  panel: FnPanelOptionsPreviewTarget,
  options: Record<string, unknown>,
  draft: Readonly<Record<string, unknown>>
): void {
  if (!supportsLegendAndTooltip(panel)) {
    return;
  }

  applyLegendOptions(panel, options, draft);
  applyTooltipOptions(options, draft);
}

export function applyFnPanelOptionsPreview(panel: FnPanelOptionsPreviewTarget, update: FnPanelOptionsUpdate): void {
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

  applySharedGraphOptions(panel, options, draft);

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

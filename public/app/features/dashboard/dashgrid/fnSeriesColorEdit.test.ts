import { canEditSeriesColor } from './fnSeriesColorEdit';

describe('canEditSeriesColor', () => {
  it('keeps the picker for standalone Grafana', () => {
    expect(canEditSeriesColor({ isFnDashboard: false })).toBe(true);
  });

  it('hides the picker on a built-in embedded dashboard', () => {
    expect(canEditSeriesColor({ isFnDashboard: true })).toBe(false);
    expect(canEditSeriesColor({ isFnDashboard: true, enablePanelColorEdit: false })).toBe(false);
  });

  it('offers the picker once the host opts in', () => {
    expect(canEditSeriesColor({ isFnDashboard: true, enablePanelColorEdit: true })).toBe(true);
  });
});

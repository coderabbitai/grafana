import { canEditSeriesColor } from './fnSeriesColorEdit';

describe('canEditSeriesColor', () => {
  it('keeps the picker for standalone Grafana', () => {
    expect(canEditSeriesColor({ isFnDashboard: false })).toBe(true);
  });

  it('hides the picker on a built-in embedded dashboard', () => {
    expect(canEditSeriesColor({ isFnDashboard: true })).toBe(false);
    expect(
      canEditSeriesColor({ isFnDashboard: true, enablePanelColorEdit: false, panelColorListener: jest.fn() })
    ).toBe(false);
  });

  // Opting in without subscribing would open a tray whose colour is dropped,
  // which is the bug this whole change removes.
  it('hides the picker when the host opted in but is not listening', () => {
    expect(canEditSeriesColor({ isFnDashboard: true, enablePanelColorEdit: true })).toBe(false);
  });

  it('offers the picker once the host opts in and listens', () => {
    expect(canEditSeriesColor({ isFnDashboard: true, enablePanelColorEdit: true, panelColorListener: jest.fn() })).toBe(
      true
    );
  });
});

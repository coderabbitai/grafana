import { isVariablesTimeRangeProcessDoneForDashboard, VariablesTimeRangeProcessDone } from './types';

describe('VariablesTimeRangeProcessDone dashboard ownership', () => {
  it('selects only the dashboard that owns the completed variable refresh', () => {
    const event = new VariablesTimeRangeProcessDone({ dashboardUid: 'summary', variableIds: [] });
    const mountedDashboardUids = ['summary', 'details'];

    expect(mountedDashboardUids.filter((uid) => isVariablesTimeRangeProcessDoneForDashboard(event, uid))).toEqual([
      'summary',
    ]);
  });

  it('keeps legacy completion events broadcast-compatible', () => {
    const event = new VariablesTimeRangeProcessDone({ variableIds: [] });

    expect(isVariablesTimeRangeProcessDoneForDashboard(event, 'summary')).toBe(true);
    expect(isVariablesTimeRangeProcessDoneForDashboard(event, 'details')).toBe(true);
  });
});

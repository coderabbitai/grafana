/** Event the host listens on to persist a colour change made from a legend. */
export const FN_PANEL_COLOR_CHANGED_EVENT = 'panelColorChanged';

/**
 * How long to wait after the last colour change before reporting it. The
 * spectrum tab of the picker fires `onChange` on every pointer move, so
 * emitting each one would queue a draft write per pixel dragged.
 */
export const FN_PANEL_COLOR_CHANGE_DEBOUNCE_MS = 400;

export interface FnSeriesColorEditAccess {
  readonly isFnDashboard?: boolean;
  readonly enablePanelColorEdit?: boolean;
  /** Present only when the host subscribed to `panelColorChanged`. */
  readonly panelColorListener?: unknown;
}

/**
 * Whether the legend colour pill should open the series colour picker.
 *
 * Only a host that opted in *and* is listening can persist the result, so an
 * embedded dashboard missing either (every built-in dashboard) must not offer
 * the tray at all -- a picker whose change is dropped is the bug this guards.
 * Standalone Grafana is unaffected and keeps the picker.
 */
export function canEditSeriesColor(access: FnSeriesColorEditAccess): boolean {
  if (!access.isFnDashboard) {
    return true;
  }

  return access.enablePanelColorEdit === true && access.panelColorListener != null;
}

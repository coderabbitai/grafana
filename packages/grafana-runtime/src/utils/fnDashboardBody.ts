import { AdHocVariableFilter, ScopedVars } from '@grafana/data';

import { getTemplateSrv } from '../services';

/**
 * Build the `crFnContext` sidecar that the CodeRabbit proxy uses to resolve
 * a redacted `/api/ds/query` body — i.e. one whose `rawSql` values are
 * `[CR_REDACTED:p:<panelId>:<refId>]` (panel target) or
 * `[CR_REDACTED:v:<variableName>]` (templating-variable query).
 *
 * The proxy decodes each key, looks the original SQL up in its shipped
 * dashboard JSON, then interpolates the dashboard-level templating
 * variables and any panel-scoped overrides we forward here. Grafana's
 * upstream datasource ignores unknown body fields, so the same body can be
 * forwarded verbatim after resolution.
 *
 * `dashboardUID` is read from (in order):
 *
 *   1. `dashboardUIDFromRequest` if the caller supplies it (panel queries
 *      have it on `DataQueryRequest.dashboardUID`).
 *   2. The MFE store mirror `window.__FNDashboardRenderingUID__`.
 *   3. The URL pathname (`/dashboard/<uid>` or `/d/<uid>/<slug>`),
 *      walking up to `window.parent` / `window.top` when the MFE runs
 *      inside Qiankun's `about:blank` sandbox iframe (whose own
 *      `location.pathname` is `"blank"`).
 */
export interface CrFnContext {
  variables: Record<string, unknown>;
  filters: AdHocVariableFilter[];
  dashboardUID?: string;
}

export function buildCrFnContext(opts: {
  scopedVars?: ScopedVars;
  filters?: AdHocVariableFilter[];
  dashboardUIDFromRequest?: string;
}): CrFnContext {
  const variables: Record<string, unknown> = {};

  // 1. Dashboard-level template variables (org_id, repo_name, ...) live on
  //    TemplateSrv, *not* in scopedVars (which only carries panel-local vars
  //    like `__interval` / repeat).
  try {
    const templateSrv = getTemplateSrv();
    if (templateSrv) {
      for (const v of templateSrv.getVariables()) {
        const value = (v as { current?: { value?: unknown } }).current?.value;
        if (value !== undefined) {
          variables[v.name] = value;
        }
      }
    }
  } catch {
    // TemplateSrv may not be initialised in tests / non-dashboard contexts.
  }

  // 2. Panel-scoped vars override dashboard-level vars of the same name.
  if (opts.scopedVars) {
    for (const key of Object.keys(opts.scopedVars)) {
      const v = opts.scopedVars[key];
      if (v && typeof v === 'object' && 'value' in v) {
        variables[key] = (v as { value: unknown }).value;
      }
    }
  }

  return {
    variables,
    filters: opts.filters ?? [],
    dashboardUID: resolveDashboardUID(opts.dashboardUIDFromRequest),
  };
}

function resolveDashboardUID(fromRequest?: string): string | undefined {
  if (fromRequest) return fromRequest;
  if (typeof window === 'undefined') return undefined;
  const fromWindow = window.__FNDashboardRenderingUID__;
  if (fromWindow) return fromWindow;

  const re = /^\/(?:dashboard|d)\/([^/?#]+)/;
  const candidates: string[] = [window.location.pathname];
  try {
    if (window.parent && window.parent !== window) {
      candidates.push(window.parent.location.pathname);
    }
    if (window.top && window.top !== window) {
      candidates.push(window.top.location.pathname);
    }
  } catch {
    // cross-origin parent — ignore
  }
  for (const c of candidates) {
    const m = re.exec(c);
    if (m && m[1]) return m[1];
  }
  return undefined;
}

/**
 * Returns true if any of the supplied raw query texts is a CodeRabbit
 * redaction key (`[CR_REDACTED:...]`). Used to gate the attachment of the
 * `crFnContext` sidecar on bodies that the CR proxy will need to resolve.
 */
export function hasRedactedRawSql(rawSqls: Array<string | undefined>): boolean {
  return rawSqls.some(s => typeof s === 'string' && s.startsWith('[CR_REDACTED:'));
}

/**
 * True when the current window is the CodeRabbit microfrontend. The MFE
 * store mirrors this onto `window.__FNDashboard__` at dispatch time.
 * Initial templating-variable queries can fire *before* that mirror is
 * set, so callers that want to attach a `crFnContext` to any body that
 * already carries a redacted SQL should additionally check
 * {@link hasRedactedRawSql} on the request's targets.
 */
export function isFnDashboardWindow(): boolean {
  return typeof window !== 'undefined' && window.__FNDashboard__ === true;
}

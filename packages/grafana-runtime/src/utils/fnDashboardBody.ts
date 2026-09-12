import { AdHocVariableFilter, ScopedVars } from '@grafana/data';

import { getTemplateSrv } from '../services';

/**
 * Build the `mfeContext` sidecar that the CodeRabbit proxy uses to resolve
 * a redacted `/api/ds/query` body — i.e. one whose `rawSql` values are
 * `[MFE_REDACTED:p:<panelId>:<refId>]` (panel target) or
 * `[MFE_REDACTED:v:<variableName>]` (templating-variable query).
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
export interface MfeContext {
  variables: Record<string, unknown>;
  filters: AdHocVariableFilter[];
  dashboardUID?: string;
}

export function buildMfeContext(opts: {
  scopedVars?: ScopedVars;
  filters?: AdHocVariableFilter[];
  dashboardUIDFromRequest?: string;
}): MfeContext {
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
 * Fields the backend redacts when running as the CodeRabbit MFE
 * (see `pkg/api/dashboard_mfe_mask.go::mfeMaskedQueryFields`). Any one of
 * these on a query target may carry the `[MFE_REDACTED:...]` marker that
 * the MFE proxy needs to resolve, so they must all be inspected here.
 */
const MFE_REDACTED_QUERY_FIELDS = [
  'rawSql', // postgres, mysql, mssql
  'expr', // prometheus, loki
  'query', // elasticsearch, influxdb, cloudwatch, generic
  'rawQuery', // azure monitor, influxdb (string-valued only)
  'queryText', // bigquery, snowflake, athena
  'target', // graphite
] as const;

const MFE_REDACTION_PREFIX = '[MFE_REDACTED:';

/**
 * Prefix for a variable-scoped redaction marker. Full form:
 *
 *   [MFE_REDACTED:v:<variableName>]
 *
 * The proxy's `parseMaskKey` decodes this back to the variable name and
 * looks the shipped SQL up in its indexed dashboard JSON. Must stay in
 * lockstep with `variableMaskValue()` in pkg/api/dashboard_mfe_mask.go.
 *
 * `<variableName>` is URL-encoded (`encodeURIComponent` semantics — spaces
 * become `%20`, not `+`) so names carrying the structural `:`/`]`
 * delimiters or non-ASCII bytes still round-trip unambiguously.
 */
const MFE_VARIABLE_MASK_PREFIX = '[MFE_REDACTED:v:';
const MFE_VARIABLE_MASK_SUFFIX = ']';

/** ScopedVars key that carries the currently-refreshing variable's name. */
export const MFE_VARIABLE_NAME_SCOPED_VAR = '__mfeVariableName';

/** Build a `[MFE_REDACTED:v:<name>]` marker for the given variable name. */
export function buildVariableMaskValue(variableName: string): string {
  // Use `encodeURIComponent`, then leave `%20` alone — this matches the
  // Go-side `mfeEncodeMaskSegment` helper exactly (both produce `%20` for
  // spaces, unlike `URLSearchParams` which uses `+`).
  const encoded = encodeURIComponent(variableName);
  return `${MFE_VARIABLE_MASK_PREFIX}${encoded}${MFE_VARIABLE_MASK_SUFFIX}`;
}

/**
 * When a request is a variable metricFindQuery (identified by the
 * `__mfeVariableName` scoped-var stamped by `VariableQueryRunner`), the
 * SQL plugin sends the outgoing target with an EMPTY `rawSql` / `expr`
 * / etc. — the actual SQL lives only on the dashboard's templating
 * definition, which the proxy also has. We inline a
 * `[MFE_REDACTED:v:<name>]` marker on the empty field so the proxy can
 * resolve it by name (rather than by the SQL-plugin's session-global
 * `tempVar<N>` counter, whose ordinal is unstable across dashboards).
 *
 * Mutates `queries` in place and returns the (possibly-same) array so
 * the caller can chain. Only rewrites STRING fields whose value is
 * exactly `""` — non-empty fields are left alone (the frontend may
 * already carry a resolved value we must forward verbatim).
 */
export function inlineVariableMaskOnEmptyFields<Q extends Record<string, unknown>>(
  queries: Q[],
  variableName: string | undefined,
): Q[] {
  if (!variableName) return queries;
  const marker = buildVariableMaskValue(variableName);
  for (const q of queries) {
    for (const field of MFE_REDACTED_QUERY_FIELDS) {
      const cur = Reflect.get(q, field);
      // Rewrite the empty string on any known query-text field. Any of
      // {rawSql, expr, query, queryText, target} may be the plugin's
      // canonical field; the redaction marker looks the same on all of
      // them, and the proxy's resolver walks the same list.
      if (typeof cur === 'string' && cur.length === 0) {
        Reflect.set(q, field, marker);
      }
    }
  }
  return queries;
}

/**
 * Build the deterministic refId used for a variable-refresh query.
 *
 * The underlying SQL plugin (bigquery) auto-generates refIds of the form
 * `tempVar<N>` from a session-monotonic counter, so the SAME variable
 * (`org_name`) ends up with a different refId every time the user visits
 * a new dashboard. That defeats the browser-side response cache in
 * `coderabbit-ui/src/grafana/intercept-request.ts` (whose cache key
 * hashes the request body, and the refId is part of that body).
 *
 * We use the variable name itself as the refId — dashboard-scoped
 * uniqueness rather than session-global uniqueness — because:
 *
 *   - The intercept's `checkIfVariablesQuery` matcher looks the refId
 *     up in `GRAFANA_VARIABLES` (a list of the known variable names like
 *     `org_name`, `repo_name`, …). Using the bare variable name makes
 *     the intercept recognise every variable refresh out of the box.
 *   - The proxy resolves the request via the `[MFE_REDACTED:v:<name>]`
 *     marker on `rawSql`, so the refId is only used as an echo key when
 *     mapping the response back onto the target. Distinct variable
 *     names guarantee distinct refIds within any single batch.
 *   - Panel target refIds are always short letters (`A`, `B`, …) so
 *     there is no collision with the multi-word variable names shipped
 *     in the metrics dashboards.
 */
export function buildVariableRefId(variableName: string): string {
  return variableName;
}

/**
 * Rewrite the refId of every target in `queries` to a deterministic,
 * per-variable value so identical variable-refresh requests collapse onto
 * a single browser-side cache entry across dashboards (see
 * `buildVariableRefId` for the full rationale).
 *
 * Mutates in place. Only operates on queries whose refId still looks like
 * the SQL-plugin's auto-generated `tempVar<N>` — a defensive check that
 * lets us skip anything the caller may have pre-populated with a stable
 * refId already (e.g. tests, or a future plugin that emits sensible
 * refIds directly).
 */
export function stableRefIdForVariable<Q extends Record<string, unknown>>(
  queries: Q[],
  variableName: string | undefined,
): Q[] {
  if (!variableName) return queries;
  const nextRefId = buildVariableRefId(variableName);
  for (const q of queries) {
    const cur = Reflect.get(q, 'refId');
    if (typeof cur === 'string' && /^tempVar\d+$/i.test(cur)) {
      Reflect.set(q, 'refId', nextRefId);
    }
  }
  return queries;
}

/**
 * Returns true if any of the supplied queries carries a CodeRabbit redaction
 * marker (`[MFE_REDACTED:...]`) on any of the datasource-specific query-text
 * fields the backend masks. Used to gate the attachment of the `mfeContext`
 * sidecar on bodies that the MFE proxy will need to resolve — including
 * non-SQL datasources whose raw text lives on `expr`, `query`, etc.
 */
export function hasRedactedQueryField(queries: ReadonlyArray<unknown>): boolean {
  return queries.some((q) => {
    if (typeof q !== 'object' || q === null) return false;
    return MFE_REDACTED_QUERY_FIELDS.some((field) => {
      const value = Reflect.get(q, field);
      return typeof value === 'string' && value.startsWith(MFE_REDACTION_PREFIX);
    });
  });
}

/**
 * True when the current window is the CodeRabbit microfrontend. The MFE
 * store mirrors this onto `window.__FNDashboard__` at dispatch time.
 * Initial templating-variable queries can fire *before* that mirror is
 * set, so callers that want to attach a `mfeContext` to any body that
 * already carries a redacted query field should additionally check
 * {@link hasRedactedQueryField} on the request's targets.
 */
export function isFnDashboardWindow(): boolean {
  return typeof window !== 'undefined' && window.__FNDashboard__ === true;
}

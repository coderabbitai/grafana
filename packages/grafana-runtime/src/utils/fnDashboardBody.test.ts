import { hasRedactedQueryField } from './fnDashboardBody';

describe('hasRedactedQueryField', () => {
  it('detects redaction on rawSql (SQL datasources)', () => {
    expect(hasRedactedQueryField([{ refId: 'A', rawSql: '[MFE_REDACTED:p:1:A]' }])).toBe(true);
  });

  it('detects redaction on expr (prometheus / loki)', () => {
    expect(hasRedactedQueryField([{ refId: 'A', expr: '[MFE_REDACTED:p:1:A]' }])).toBe(true);
  });

  it('detects redaction on query (elasticsearch / influxdb / cloudwatch)', () => {
    expect(hasRedactedQueryField([{ refId: 'A', query: '[MFE_REDACTED:p:1:A]' }])).toBe(true);
  });

  it('detects redaction on rawQuery (azure monitor / influxdb string variants)', () => {
    expect(hasRedactedQueryField([{ refId: 'A', rawQuery: '[MFE_REDACTED:p:1:A]' }])).toBe(true);
  });

  it('detects redaction on queryText (bigquery / snowflake / athena)', () => {
    expect(hasRedactedQueryField([{ refId: 'A', queryText: '[MFE_REDACTED:p:1:A]' }])).toBe(true);
  });

  it('detects redaction on target (graphite)', () => {
    expect(hasRedactedQueryField([{ refId: 'A', target: '[MFE_REDACTED:p:1:A]' }])).toBe(true);
  });

  it('returns true if any query in the array has a redacted field', () => {
    expect(
      hasRedactedQueryField([
        { refId: 'A', rawSql: 'SELECT 1' },
        { refId: 'B', expr: '[MFE_REDACTED:p:1:B]' },
      ])
    ).toBe(true);
  });

  it('returns false when nothing is redacted', () => {
    expect(
      hasRedactedQueryField([
        { refId: 'A', rawSql: 'SELECT 1' },
        { refId: 'B', expr: 'up' },
      ])
    ).toBe(false);
  });

  it('returns false for an empty array', () => {
    expect(hasRedactedQueryField([])).toBe(false);
  });

  it('ignores non-object entries (null / primitive)', () => {
    expect(hasRedactedQueryField([null, undefined, 42, 'string'])).toBe(false);
  });

  it('ignores non-string masked-field values', () => {
    expect(
      hasRedactedQueryField([
        { refId: 'A', rawSql: 123 },
        { refId: 'B', rawQuery: true }, // azure-monitor toggle key — non-string is fine
      ])
    ).toBe(false);
  });

  it('only matches the literal redaction prefix', () => {
    expect(hasRedactedQueryField([{ refId: 'A', rawSql: 'not [MFE_REDACTED:p:1:A]' }])).toBe(false);
  });
});


import { buildVariableMaskValue, inlineVariableMaskOnEmptyFields } from './fnDashboardBody';

describe('buildVariableMaskValue', () => {
  it('emits the same shape as the Go-side variableMaskValue helper', () => {
    expect(buildVariableMaskValue('org_name')).toBe('[MFE_REDACTED:v:org_name]');
    expect(buildVariableMaskValue('repo_name')).toBe('[MFE_REDACTED:v:repo_name]');
  });

  it('percent-encodes structural delimiters so decodeURIComponent round-trips', () => {
    // `:` and `]` are the marker structural chars — they must be encoded when
    // they appear in the payload so `parseMaskKey` on the proxy can still
    // split on them. `encodeURIComponent` escapes both.
    const marker = buildVariableMaskValue('weird:name]v2');
    expect(marker).toBe('[MFE_REDACTED:v:weird%3Aname%5Dv2]');
    // Sanity: the payload segment round-trips exactly.
    const inner = marker.slice('[MFE_REDACTED:v:'.length, -1);
    expect(decodeURIComponent(inner)).toBe('weird:name]v2');
  });

  it('encodes spaces as %20 (not "+"), matching the Go-side encoder', () => {
    // `net/url.QueryEscape` on Go would produce `+` for spaces, which the
    // proxy's `decodeURIComponent` treats as a literal `+` rather than a
    // space — so both sides must use `%20`. This test guards against a
    // regression to `URLSearchParams`, which uses `+`.
    expect(buildVariableMaskValue('has space')).toBe('[MFE_REDACTED:v:has%20space]');
  });
});

describe('inlineVariableMaskOnEmptyFields', () => {
  it('replaces empty rawSql with a [MFE_REDACTED:v:<name>] marker', () => {
    const queries: Array<Record<string, unknown>> = [{ refId: 'tempVar5', rawSql: '' }];
    inlineVariableMaskOnEmptyFields(queries, 'org_name');
    expect(queries[0].rawSql).toBe('[MFE_REDACTED:v:org_name]');
  });

  it('is a no-op when the field is non-empty (do not overwrite resolved SQL)', () => {
    const queries: Array<Record<string, unknown>> = [{ refId: 'A', rawSql: 'SELECT 1' }];
    inlineVariableMaskOnEmptyFields(queries, 'org_name');
    // Existing SQL must survive — the resolver would otherwise lose an
    // already-inlined value (e.g. after `applyTemplateVariables`).
    expect(queries[0].rawSql).toBe('SELECT 1');
  });

  it('applies to every known query-text field (rawSql / expr / query / queryText / target)', () => {
    const queries: Array<Record<string, unknown>> = [
      { refId: 'A', rawSql: '' },
      { refId: 'B', expr: '' },
      { refId: 'C', query: '' },
      { refId: 'D', queryText: '' },
      { refId: 'E', target: '' },
    ];
    inlineVariableMaskOnEmptyFields(queries, 'v');
    expect(queries[0].rawSql).toBe('[MFE_REDACTED:v:v]');
    expect(queries[1].expr).toBe('[MFE_REDACTED:v:v]');
    expect(queries[2].query).toBe('[MFE_REDACTED:v:v]');
    expect(queries[3].queryText).toBe('[MFE_REDACTED:v:v]');
    expect(queries[4].target).toBe('[MFE_REDACTED:v:v]');
  });

  it('does not touch non-string fields', () => {
    // Azure monitor uses `rawQuery: boolean` as a UI toggle — coercing that
    // to a string would corrupt the query.
    const queries: Array<Record<string, unknown>> = [{ refId: 'A', rawQuery: true, rawSql: '' }];
    inlineVariableMaskOnEmptyFields(queries, 'v');
    expect(queries[0].rawQuery).toBe(true);
    expect(queries[0].rawSql).toBe('[MFE_REDACTED:v:v]');
  });

  it('is a no-op when variableName is undefined (non-variable path)', () => {
    const queries: Array<Record<string, unknown>> = [{ refId: 'A', rawSql: '' }];
    inlineVariableMaskOnEmptyFields(queries, undefined);
    expect(queries[0].rawSql).toBe('');
  });
});

import { buildVariableRefId, stableRefIdForVariable } from './fnDashboardBody';

describe('buildVariableRefId', () => {
  it('returns the variable name verbatim so the coderabbit-ui intercept recognises it', () => {
    // `intercept-request.ts::checkIfVariablesQuery` compares `refId` against
    // the `GRAFANA_VARIABLES` list (`org_name`, `repo_name`, …). Emitting
    // the bare variable name as the refId makes every variable refresh
    // eligible for the browser-side cache.
    expect(buildVariableRefId('org_name')).toBe('org_name');
    expect(buildVariableRefId('repo_name')).toBe('repo_name');
    expect(buildVariableRefId('teams')).toBe('teams');
  });
});

describe('stableRefIdForVariable', () => {
  it('rewrites the SQL plugin\'s auto-generated tempVar<N> refId to the variable name', () => {
    const queries: Array<Record<string, unknown>> = [{ refId: 'tempVar5', rawSql: '' }];
    stableRefIdForVariable(queries, 'org_name');
    // Deterministic: switching dashboards produces the same refId, so the
    // browser-side response cache in `intercept-request.ts` hits on the
    // second visit instead of firing a new fetch.
    expect(queries[0].refId).toBe('org_name');
  });

  it('applies the rewrite to every target in the batch', () => {
    // Every variable-refresh batch we\'ve observed contains a single target,
    // but the helper is safe against multi-target inputs — every entry\'s
    // refId gets the same rewrite (all targets in the batch refresh the
    // same variable by construction).
    const queries: Array<Record<string, unknown>> = [
      { refId: 'tempVar1', rawSql: '' },
      { refId: 'tempVar2', rawSql: '' },
    ];
    stableRefIdForVariable(queries, 'repo_name');
    expect(queries[0].refId).toBe('repo_name');
    expect(queries[1].refId).toBe('repo_name');
  });

  it('leaves non-tempVar refIds alone (panel path is unaffected)', () => {
    // Panel targets carry refIds like `A`, `B`, `tempvar` (lowercase — a
    // literal placeholder emitted by the plugin\'s variable editor, NOT a
    // metricFindQuery). None of them match `^tempVar\\d+$`, so we don\'t
    // clobber them.
    const queries: Array<Record<string, unknown>> = [
      { refId: 'A', rawSql: 'SELECT 1' },
      { refId: 'tempvar', rawSql: '' }, // lowercase — plugin variable editor placeholder
    ];
    stableRefIdForVariable(queries, 'org_name');
    expect(queries[0].refId).toBe('A');
    expect(queries[1].refId).toBe('tempvar');
  });

  it('is a no-op when variableName is undefined (non-variable-refresh request)', () => {
    const queries: Array<Record<string, unknown>> = [{ refId: 'tempVar5' }];
    stableRefIdForVariable(queries, undefined);
    expect(queries[0].refId).toBe('tempVar5');
  });
});

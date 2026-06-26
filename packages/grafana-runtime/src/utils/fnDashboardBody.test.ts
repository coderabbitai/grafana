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


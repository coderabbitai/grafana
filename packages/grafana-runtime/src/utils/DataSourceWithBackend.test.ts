import { of } from 'rxjs';
import { BackendSrv, BackendSrvRequest, FetchResponse } from 'src/services';

import {
  DataQuery,
  DataQueryRequest,
  DataQueryResponseData,
  DataSourceInstanceSettings,
  DataSourceJsonData,
  DataSourceRef,
  createDataFrame,
  AdHocVariableFilter,
  ScopedVars,
  getDefaultTimeRange,
} from '@grafana/data';

import { config } from '../config';

import {
  DataSourceWithBackend,
  isExpressionReference,
  standardStreamOptionsProvider,
  toStreamingDataResponse,
} from './DataSourceWithBackend';
import { publicDashboardQueryHandler } from './publicDashboardQueryHandler';

interface MyQuery extends DataQuery {
  filters?: AdHocVariableFilter[];
  applyTemplateVariablesCalled?: boolean;
}

class MyDataSource extends DataSourceWithBackend<MyQuery, DataSourceJsonData> {
  constructor(instanceSettings: DataSourceInstanceSettings<DataSourceJsonData>) {
    super(instanceSettings);
  }

  applyTemplateVariables(query: MyQuery, scopedVars: ScopedVars, filters?: AdHocVariableFilter[] | undefined): MyQuery {
    return { ...query, applyTemplateVariablesCalled: true, filters };
  }
}

const mockDatasourceRequest = jest.fn<Promise<FetchResponse>, BackendSrvRequest[]>();

const backendSrv = {
  fetch: (options: BackendSrvRequest) => {
    return of(mockDatasourceRequest(options));
  },
} as unknown as BackendSrv;

const mockTemplateVariables: Array<{ name: string; current: { value: unknown } }> = [];

jest.mock('../services', () => ({
  ...jest.requireActual('../services'),
  getBackendSrv: () => backendSrv,
  getDataSourceSrv: () => {
    return {
      getInstanceSettings: (ref?: DataSourceRef) => ({
        type: ref?.type ?? '<mocktype>',
        uid: ref?.uid ?? '<mockuid>',
      }),
    };
  },
  getTemplateSrv: () => ({
    getVariables: () => mockTemplateVariables,
  }),
}));
jest.mock('./publicDashboardQueryHandler');

describe('DataSourceWithBackend', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-10-13'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('check the executed queries', () => {
    const { mock, ds } = createMockDatasource();
    ds.query({
      maxDataPoints: 10,
      intervalMs: 5000,
      targets: [{ refId: 'A' }, { refId: 'B', datasource: { type: 'sample' } }],
      dashboardUID: 'dashA',
      panelId: 123,
      filters: [{ key: 'key1', operator: '=', value: 'val1' }],
      range: getDefaultTimeRange(),
      queryGroupId: 'abc',
    } as DataQueryRequest);

    const args = mock.calls[0][0];

    expect(mock.calls.length).toBe(1);
    expect(args).toMatchInlineSnapshot(`
      {
        "data": {
          "from": "1697133600000",
          "queries": [
            {
              "applyTemplateVariablesCalled": true,
              "datasource": {
                "type": "dummy",
                "uid": "abc",
              },
              "datasourceId": 1234,
              "filters": [
                {
                  "key": "key1",
                  "operator": "=",
                  "value": "val1",
                },
              ],
              "intervalMs": 5000,
              "maxDataPoints": 10,
              "queryCachingTTL": undefined,
              "refId": "A",
            },
            {
              "datasource": {
                "type": "sample",
                "uid": "<mockuid>",
              },
              "datasourceId": undefined,
              "intervalMs": 5000,
              "maxDataPoints": 10,
              "queryCachingTTL": undefined,
              "refId": "B",
            },
          ],
          "to": "1697155200000",
        },
        "headers": {
          "X-Dashboard-Uid": "dashA",
          "X-Datasource-Uid": "abc, <mockuid>",
          "X-Panel-Id": "123",
          "X-Plugin-Id": "dummy, sample",
          "X-Query-Group-Id": "abc",
        },
        "hideFromInspector": false,
        "method": "POST",
        "requestId": undefined,
        "url": "/api/ds/query?ds_type=dummy",
      }
    `);
  });

  test('correctly passes datasource headers', () => {
    const { mock, ds } = createMockDatasource();
    ds.query({
      maxDataPoints: 10,
      intervalMs: 5000,
      targets: [{ refId: 'A' }, { refId: 'B', datasource: { type: 'sample' } }],
      dashboardUID: 'dashA',
      panelId: 123,
      filters: [{ key: 'key1', operator: '=', value: 'val1' }],
      range: getDefaultTimeRange(),
      queryGroupId: 'abc',
      interval: '5s',
      scopedVars: {},
      timezone: '',
      requestId: 'request-123',
      startTime: 0,
      app: '',
      headers: {
        'X-Test-Header': 'test',
      },
    });

    const args = mock.calls[0][0];

    expect(mock.calls.length).toBe(1);
    expect(args).toMatchInlineSnapshot(`
      {
        "data": {
          "from": "1697133600000",
          "queries": [
            {
              "applyTemplateVariablesCalled": true,
              "datasource": {
                "type": "dummy",
                "uid": "abc",
              },
              "datasourceId": 1234,
              "filters": [
                {
                  "key": "key1",
                  "operator": "=",
                  "value": "val1",
                },
              ],
              "intervalMs": 5000,
              "maxDataPoints": 10,
              "queryCachingTTL": undefined,
              "refId": "A",
            },
            {
              "datasource": {
                "type": "sample",
                "uid": "<mockuid>",
              },
              "datasourceId": undefined,
              "intervalMs": 5000,
              "maxDataPoints": 10,
              "queryCachingTTL": undefined,
              "refId": "B",
            },
          ],
          "to": "1697155200000",
        },
        "headers": {
          "X-Dashboard-Uid": "dashA",
          "X-Datasource-Uid": "abc, <mockuid>",
          "X-Panel-Id": "123",
          "X-Plugin-Id": "dummy, sample",
          "X-Query-Group-Id": "abc",
          "X-Test-Header": "test",
        },
        "hideFromInspector": false,
        "method": "POST",
        "requestId": "request-123",
        "url": "/api/ds/query?ds_type=dummy&requestId=request-123",
      }
    `);
  });

  test('correctly creates expression queries', () => {
    const { mock, ds } = createMockDatasource();
    ds.query({
      maxDataPoints: 10,
      intervalMs: 5000,
      targets: [{ refId: 'A' }, { refId: 'B', datasource: { type: '__expr__' } }],
      dashboardUID: 'dashA',
      panelId: 123,
      range: getDefaultTimeRange(),
      queryGroupId: 'abc',
    } as DataQueryRequest);

    const args = mock.calls[0][0];

    expect(mock.calls.length).toBe(1);
    expect(args).toMatchInlineSnapshot(`
      {
        "data": {
          "from": "1697133600000",
          "queries": [
            {
              "applyTemplateVariablesCalled": true,
              "datasource": {
                "type": "dummy",
                "uid": "abc",
              },
              "datasourceId": 1234,
              "filters": undefined,
              "intervalMs": 5000,
              "maxDataPoints": 10,
              "queryCachingTTL": undefined,
              "refId": "A",
            },
            {
              "datasource": {
                "name": "Expression",
                "type": "__expr__",
                "uid": "__expr__",
              },
              "refId": "B",
            },
          ],
          "to": "1697155200000",
        },
        "headers": {
          "X-Dashboard-Uid": "dashA",
          "X-Datasource-Uid": "abc",
          "X-Grafana-From-Expr": "true",
          "X-Panel-Id": "123",
          "X-Plugin-Id": "dummy",
          "X-Query-Group-Id": "abc",
        },
        "hideFromInspector": false,
        "method": "POST",
        "requestId": undefined,
        "url": "/api/ds/query?ds_type=dummy&expression=true",
      }
    `);
  });

  test('should apply template variables only for the current data source', () => {
    const { mock, ds } = createMockDatasource();
    ds.applyTemplateVariables = jest.fn();
    ds.query({
      maxDataPoints: 10,
      intervalMs: 5000,
      range: getDefaultTimeRange(),
      targets: [{ refId: 'A' }, { refId: 'B', datasource: { type: 'sample' } }],
    } as DataQueryRequest);

    expect(mock.calls.length).toBe(1);
    expect(ds.applyTemplateVariables).toHaveBeenCalledTimes(1);
  });

  test('check that the executed queries is hidden from inspector', () => {
    const { mock, ds } = createMockDatasource();
    ds.query({
      maxDataPoints: 10,
      intervalMs: 5000,
      targets: [{ refId: 'A' }, { refId: 'B', datasource: { type: 'sample' } }],
      hideFromInspector: true,
      dashboardUID: 'dashA',
      range: getDefaultTimeRange(),
      panelId: 123,
    } as DataQueryRequest);

    const args = mock.calls[0][0];

    expect(mock.calls.length).toBe(1);
    expect(args).toMatchInlineSnapshot(`
      {
        "data": {
          "from": "1697133600000",
          "queries": [
            {
              "applyTemplateVariablesCalled": true,
              "datasource": {
                "type": "dummy",
                "uid": "abc",
              },
              "datasourceId": 1234,
              "filters": undefined,
              "intervalMs": 5000,
              "maxDataPoints": 10,
              "queryCachingTTL": undefined,
              "refId": "A",
            },
            {
              "datasource": {
                "type": "sample",
                "uid": "<mockuid>",
              },
              "datasourceId": undefined,
              "intervalMs": 5000,
              "maxDataPoints": 10,
              "queryCachingTTL": undefined,
              "refId": "B",
            },
          ],
          "to": "1697155200000",
        },
        "headers": {
          "X-Dashboard-Uid": "dashA",
          "X-Datasource-Uid": "abc, <mockuid>",
          "X-Panel-Id": "123",
          "X-Plugin-Id": "dummy, sample",
        },
        "hideFromInspector": true,
        "method": "POST",
        "requestId": undefined,
        "url": "/api/ds/query?ds_type=dummy",
      }
    `);
  });

  test('it converts results with channels to streaming queries', () => {
    const request: DataQueryRequest = {
      intervalMs: 100,
    } as DataQueryRequest;

    const rsp: DataQueryResponseData = {
      data: [],
    };

    // Simple empty query
    let obs = toStreamingDataResponse(rsp, request, standardStreamOptionsProvider);
    expect(obs).toBeDefined();

    let frame = createDataFrame({
      meta: {
        channel: 'a/b/c',
      },
      fields: [],
    });
    rsp.data = [frame];
    obs = toStreamingDataResponse(rsp, request, standardStreamOptionsProvider);
    expect(obs).toBeDefined();
  });

  test('check that getResource uses the data source UID', () => {
    const { mock, ds } = createMockDatasource();
    ds.getResource('foo');

    const args = mock.calls[0][0];

    expect(mock.calls.length).toBe(1);
    expect(args).toMatchObject({
      headers: {
        'X-Datasource-Uid': 'abc',
        'X-Plugin-Id': 'dummy',
      },
      method: 'GET',
      url: '/api/datasources/uid/abc/resources/foo',
    });
  });

  test('check that postResource uses the data source UID', () => {
    const { mock, ds } = createMockDatasource();
    ds.postResource('foo');

    const args = mock.calls[0][0];

    expect(mock.calls.length).toBe(1);
    expect(args).toMatchObject({
      headers: {
        'X-Datasource-Uid': 'abc',
        'X-Plugin-Id': 'dummy',
      },
      method: 'POST',
      url: '/api/datasources/uid/abc/resources/foo',
    });
  });

  test('check that callHealthCheck uses the data source UID', () => {
    const { mock, ds } = createMockDatasource();
    ds.callHealthCheck();

    const args = mock.calls[0][0];

    expect(mock.calls.length).toBe(1);
    expect(args).toMatchObject({
      headers: {
        'X-Datasource-Uid': 'abc',
        'X-Plugin-Id': 'dummy',
      },
      method: 'GET',
      url: '/api/datasources/uid/abc/health',
    });
  });

  test('check that queries can skip the query cache', () => {
    const { mock, ds } = createMockDatasource();
    ds.query({
      maxDataPoints: 10,
      intervalMs: 5000,
      targets: [{ refId: 'A' }],
      dashboardUID: 'dashA',
      panelId: 123,
      range: getDefaultTimeRange(),
      skipQueryCache: true,
      requestId: 'request-123',
      interval: '5s',
      scopedVars: {},
      timezone: '',
      app: '',
      startTime: 0,
    });

    const args = mock.calls[0][0];

    expect(mock.calls.length).toBe(1);
    expect(args).toMatchInlineSnapshot(`
      {
        "data": {
          "from": "1697133600000",
          "queries": [
            {
              "applyTemplateVariablesCalled": true,
              "datasource": {
                "type": "dummy",
                "uid": "abc",
              },
              "datasourceId": 1234,
              "filters": undefined,
              "intervalMs": 5000,
              "maxDataPoints": 10,
              "queryCachingTTL": undefined,
              "refId": "A",
            },
          ],
          "to": "1697155200000",
        },
        "headers": {
          "X-Cache-Skip": "true",
          "X-Dashboard-Uid": "dashA",
          "X-Datasource-Uid": "abc",
          "X-Panel-Id": "123",
          "X-Plugin-Id": "dummy",
        },
        "hideFromInspector": false,
        "method": "POST",
        "requestId": "request-123",
        "url": "/api/ds/query?ds_type=dummy&requestId=request-123",
      }
    `);
  });

  describe('isExpressionReference', () => {
    test('check all possible expression references', () => {
      expect(isExpressionReference('__expr__')).toBeTruthy(); // New UID
      expect(isExpressionReference('-100')).toBeTruthy(); // Legacy UID
      expect(isExpressionReference('Expression')).toBeTruthy(); // Name
      expect(isExpressionReference({ type: '__expr__' })).toBeTruthy();
      expect(isExpressionReference({ type: '-100' })).toBeTruthy();
      expect(isExpressionReference(null)).toBeFalsy();
      expect(isExpressionReference(undefined)).toBeFalsy();
    });
  });

  describe('FNDashboard (microfrontend) body rewriting', () => {
    afterEach(() => {
      delete (window as { __FNDashboard__?: boolean }).__FNDashboard__;
      delete (window as { __FNDashboardRenderingUID__?: string })
        .__FNDashboardRenderingUID__;
      mockTemplateVariables.length = 0;
    });

    test('does not change the body when FNDashboard flag is not set', () => {
      const { mock, ds } = createMockDatasource();
      ds.query({
        maxDataPoints: 10,
        intervalMs: 5000,
        targets: [{ refId: 'A' }],
        dashboardUID: 'dashA',
        panelId: 123,
        range: getDefaultTimeRange(),
      } as DataQueryRequest);

      const body = mock.calls[0][0].data;
      expect(body).toHaveProperty('queries');
      expect(body).not.toHaveProperty('mfeContext');
    });

    test('attaches mfeContext to the body when FNDashboard flag is set', () => {
      window.__FNDashboard__ = true;
      mockTemplateVariables.push(
        { name: 'org_id', current: { value: 'org-uuid' } },
        { name: 'repo_name', current: { value: ['a', 'b'] } },
      );

      const { mock, ds } = createMockDatasource();
      ds.query({
        maxDataPoints: 10,
        intervalMs: 5000,
        targets: [{ refId: 'A', rawSql: '[MFE_REDACTED:p:123:A]' }],
        dashboardUID: 'dashA',
        panelId: 123,
        scopedVars: {
          __interval: { text: '1m', value: '1m' },
        },
        filters: [{ key: 'team', operator: '=', value: 'sre' }],
        range: getDefaultTimeRange(),
      } as unknown as DataQueryRequest);

      const body = mock.calls[0][0].data;
      // Body retains the legacy { queries, from, to } shape so unknown
      // upstream code paths (including non-FN proxies) keep working.
      expect(body).toHaveProperty('queries');
      expect(body).toHaveProperty('mfeContext');
      expect(body.mfeContext).toEqual({
        variables: {
          org_id: 'org-uuid',
          repo_name: ['a', 'b'],
          __interval: '1m',
        },
        filters: [{ key: 'team', operator: '=', value: 'sre' }],
        dashboardUID: 'dashA',
      });
    });

    test('falls back to window.__FNDashboardRenderingUID__ when request.dashboardUID is missing', () => {
      window.__FNDashboard__ = true;
      window.__FNDashboardRenderingUID__ = 'dashB';
      mockTemplateVariables.push({ name: 'org_id', current: { value: 'org-uuid' } });

      const { mock, ds } = createMockDatasource();
      ds.query({
        maxDataPoints: 10,
        intervalMs: 5000,
        // No dashboardUID / panelId — this is how Grafana's variable runner
        // dispatches templating-variable queries.
        targets: [{ refId: 'A', rawSql: '[MFE_REDACTED:v:org_name]' }],
        range: getDefaultTimeRange(),
      } as unknown as DataQueryRequest);

      const body = mock.calls[0][0].data;
      expect(body.mfeContext.dashboardUID).toBe('dashB');
      expect(body.mfeContext.variables).toEqual({ org_id: 'org-uuid' });
    });

    test('falls back to dashboard UID parsed from location.pathname', () => {
      // Regression: in the Qiankun-sandboxed MFE, the
      // `__FNDashboardRenderingUID__` window mirror may not be set yet when
      // VariableQueryRunner fires its initial dropdown-population queries,
      // and request.dashboardUID is also unset for those queries. The proxy
      // then can't resolve the redacted SQL. Pull the UID out of the URL
      // (which is always `/dashboard/<uid>` or `/d/<uid>/<slug>`) as a
      // last-resort fallback.
      window.__FNDashboard__ = true;
      const originalPath = window.location.pathname;
      const setPath = (p: string) =>
        window.history.replaceState({}, '', p + window.location.search);
      setPath('/dashboard/summary');
      try {
        const { mock, ds } = createMockDatasource();
        ds.query({
          maxDataPoints: 10,
          intervalMs: 5000,
          targets: [{ refId: 'A', rawSql: '[MFE_REDACTED:v:org_name]' }],
          range: getDefaultTimeRange(),
        } as unknown as DataQueryRequest);

        const body = mock.calls[0][0].data;
        expect(body.mfeContext.dashboardUID).toBe('summary');
      } finally {
        setPath(originalPath);
      }
    });

    test('inlines [MFE_REDACTED:v:<name>] on empty rawSql when scopedVars.__mfeVariableName is set', () => {
      // Regression: the SQL plugin's variable-refresh pipeline
      // (`VariableQueryRunner.getRequest`) fires with `rawSql: ""` and a
      // session-monotonic `refId: tempVar<N>`. Without the marker rewrite
      // the proxy has to guess which variable a `tempVar<N>` refers to
      // from its ordinal N — which breaks on dashboard switch (N counter
      // is global). Stamping `[MFE_REDACTED:v:<name>]` on the outgoing
      // body gives the proxy a stable identifier.
      window.__FNDashboard__ = true;
      const { mock, ds } = createMockDatasource();
      ds.query({
        maxDataPoints: 0,
        intervalMs: 0,
        targets: [{ refId: 'tempVar5', rawSql: '' }],
        dashboardUID: 'qualityMetrics',
        scopedVars: {
          __mfeVariableName: { text: 'org_name', value: 'org_name' },
        },
        range: getDefaultTimeRange(),
      } as unknown as DataQueryRequest);

      const body = mock.calls[0][0].data;
      expect(body.queries[0].rawSql).toBe('[MFE_REDACTED:v:org_name]');
      // And because the marker is now present, `hasRedactedQueryField`
      // triggers the mfeContext sidecar too — the resolver needs both to
      // resolve the variable SQL correctly.
      expect(body).toHaveProperty('mfeContext');
    });

    test('inlines the marker even before window.__FNDashboard__ mirror is set', () => {
      // Variable refresh can fire on cold start BEFORE
      // `updatePartialMfeStates` dispatches (which is what sets the
      // `__FNDashboard__` window mirror). The marker inline path must
      // NOT gate on the window flag — otherwise the very first variable
      // batch after page load leaks through unresolvable.
      delete (window as { __FNDashboard__?: boolean }).__FNDashboard__;
      const { mock, ds } = createMockDatasource();
      ds.query({
        maxDataPoints: 0,
        intervalMs: 0,
        targets: [{ refId: 'tempVar1', rawSql: '' }],
        dashboardUID: 'summary',
        scopedVars: {
          __mfeVariableName: { text: 'repo_name', value: 'repo_name' },
        },
        range: getDefaultTimeRange(),
      } as unknown as DataQueryRequest);

      const body = mock.calls[0][0].data;
      expect(body.queries[0].rawSql).toBe('[MFE_REDACTED:v:repo_name]');
    });

    test('does NOT rewrite non-empty rawSql (already-resolved SQL survives)', () => {
      // If the SQL plugin has already interpolated a variable's SQL by
      // the time we see the body, leave it alone — the proxy will accept
      // it verbatim. Only empty query-text fields get the marker.
      window.__FNDashboard__ = true;
      const { mock, ds } = createMockDatasource();
      ds.query({
        maxDataPoints: 0,
        intervalMs: 0,
        targets: [{ refId: 'tempVar2', rawSql: 'SELECT organization_name FROM organizations' }],
        dashboardUID: 'summary',
        scopedVars: {
          __mfeVariableName: { text: 'org_name', value: 'org_name' },
        },
        range: getDefaultTimeRange(),
      } as unknown as DataQueryRequest);

      const body = mock.calls[0][0].data;
      expect(body.queries[0].rawSql).toBe('SELECT organization_name FROM organizations');
    });

    test('is a no-op when scopedVars.__mfeVariableName is absent (panel path)', () => {
      // Panel queries flow through the same DataSourceWithBackend.query
      // codepath, and they must NOT be rewritten by the variable-inline
      // logic — their rawSql is either resolved SQL or the panel
      // redaction marker. Absent `__mfeVariableName`, the empty-rawSql
      // path is left alone.
      window.__FNDashboard__ = true;
      const { mock, ds } = createMockDatasource();
      ds.query({
        maxDataPoints: 0,
        intervalMs: 0,
        targets: [{ refId: 'A', rawSql: '' }],
        dashboardUID: 'summary',
        scopedVars: {},
        range: getDefaultTimeRange(),
      } as unknown as DataQueryRequest);

      const body = mock.calls[0][0].data;
      expect(body.queries[0].rawSql).toBe('');
    });

    test('rewrites the SQL-plugin tempVar<N> refId to the variable name so cross-dashboard caching works', () => {
      // The SQL plugin (bigquery) uses a session-monotonic counter for its
      // metricFindQuery refIds: the same variable (`org_name`) becomes
      // `tempVar1` on the first dashboard visit, `tempVar5` on the second,
      // etc. That defeats the browser-side response cache in
      // coderabbit-ui's intercept-request.ts, which keys off the request
      // body (whose contents include the refId). Rewriting the refId to
      // the variable NAME collapses those identical queries onto a single
      // cache entry.
      window.__FNDashboard__ = true;
      const { mock, ds } = createMockDatasource();
      ds.query({
        maxDataPoints: 0,
        intervalMs: 0,
        targets: [{ refId: 'tempVar5', rawSql: '' }],
        dashboardUID: 'qualityMetrics',
        scopedVars: {
          __mfeVariableName: { text: 'org_name', value: 'org_name' },
        },
        range: getDefaultTimeRange(),
      } as unknown as DataQueryRequest);

      const body = mock.calls[0][0].data;
      expect(body.queries[0].refId).toBe('org_name');
      // And the marker still gets inlined on the same target, so the
      // proxy can resolve the SQL end-to-end.
      expect(body.queries[0].rawSql).toBe('[MFE_REDACTED:v:org_name]');
    });

    test('does NOT rewrite non-tempVar refIds on panel targets', () => {
      // Guard against overreach: the refId rewrite must only fire on the
      // SQL-plugin's auto-generated `tempVar<N>` refIds, never on panel
      // target refIds (typically single letters). Even if a panel target
      // somehow got tagged with `__mfeVariableName` in the future, its
      // refId (e.g. `A`) must survive.
      window.__FNDashboard__ = true;
      const { mock, ds } = createMockDatasource();
      ds.query({
        maxDataPoints: 0,
        intervalMs: 0,
        targets: [{ refId: 'A', rawSql: '' }],
        dashboardUID: 'summary',
        scopedVars: {
          __mfeVariableName: { text: 'org_name', value: 'org_name' },
        },
        range: getDefaultTimeRange(),
      } as unknown as DataQueryRequest);

      const body = mock.calls[0][0].data;
      expect(body.queries[0].refId).toBe('A');
    });
  });

  describe('public dashboard scope', () => {
    test("check public dashboard handler is not executed when it's not public dashboard scope", () => {
      const { ds } = createMockDatasource();

      const request = {
        maxDataPoints: 10,
        intervalMs: 5000,
        targets: [{ refId: 'A' }, { refId: 'B', datasource: { type: 'sample' } }],
        dashboardUID: 'dashA',
        panelId: 123,
        queryGroupId: 'abc',
        range: getDefaultTimeRange(),
      } as DataQueryRequest;

      ds.query(request);

      expect(publicDashboardQueryHandler).not.toHaveBeenCalledWith(request);
    });

    test("check public dashboard handler is executed when it's public dashboard scope", () => {
      config.publicDashboardAccessToken = 'abc123';
      const { ds } = createMockDatasource();

      const request = {
        maxDataPoints: 10,
        intervalMs: 5000,
        targets: [{ refId: 'A' }, { refId: 'B', datasource: { type: 'sample' } }],
        dashboardUID: 'dashA',
        panelId: 123,
        queryGroupId: 'abc',
        range: getDefaultTimeRange(),
      } as DataQueryRequest;

      ds.query(request);

      expect(publicDashboardQueryHandler).toHaveBeenCalledWith(request);
    });
  });
});

function createMockDatasource() {
  const settings = {
    name: 'test',
    id: 1234,
    uid: 'abc',
    type: 'dummy',
    jsonData: {},
  } as DataSourceInstanceSettings<DataSourceJsonData>;

  mockDatasourceRequest.mockReset();
  mockDatasourceRequest.mockReturnValue(Promise.resolve({} as FetchResponse));

  const ds = new MyDataSource(settings);
  return { ds, mock: mockDatasourceRequest.mock };
}

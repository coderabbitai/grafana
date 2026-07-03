import { from, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import {
  DataQuery,
  DataQueryRequest,
  DataSourceApi,
  getDefaultTimeRange,
  LoadingState,
  PanelData,
  QueryVariableModel,
  VariableSupportType,
} from '@grafana/data';

import { TimeSrv } from '../../dashboard/services/TimeSrv';
import {
  hasCustomVariableSupport,
  hasDatasourceVariableSupport,
  hasLegacyVariableSupport,
  hasStandardVariableSupport,
} from '../guard';
import { getLegacyQueryOptions } from '../utils';

export interface RunnerArgs {
  variable: QueryVariableModel;
  datasource: DataSourceApi;
  timeSrv: TimeSrv;
  runRequest: (
    datasource: DataSourceApi,
    request: DataQueryRequest,
    queryFunction?: typeof datasource.query
  ) => Observable<PanelData>;
  searchFilter?: string;
}

type GetTargetArgs = { datasource: DataSourceApi; variable: QueryVariableModel };

export interface QueryRunner {
  type: VariableSupportType;
  canRun: (dataSource: DataSourceApi) => boolean;
  getTarget: (args: GetTargetArgs) => DataQuery;
  runRequest: (args: RunnerArgs, request: DataQueryRequest) => Observable<PanelData>;
}

export class QueryRunners {
  private readonly runners: QueryRunner[];
  constructor() {
    this.runners = [
      new LegacyQueryRunner(),
      new StandardQueryRunner(),
      new CustomQueryRunner(),
      new DatasourceQueryRunner(),
    ];
  }

  getRunnerForDatasource(datasource: DataSourceApi): QueryRunner {
    const runner = this.runners.find((runner) => runner.canRun(datasource));
    if (runner) {
      return runner;
    }

    throw new Error("Couldn't find a query runner that matches supplied arguments.");
  }

  //Check if datasource has a query runner associated with it
  isQueryRunnerAvailableForDatasource(datasource: DataSourceApi) {
    return this.runners.some((runner) => runner.canRun(datasource));
  }
}

class LegacyQueryRunner implements QueryRunner {
  type = VariableSupportType.Legacy;

  canRun(dataSource: DataSourceApi) {
    return hasLegacyVariableSupport(dataSource);
  }

  getTarget({ datasource, variable }: GetTargetArgs) {
    if (hasLegacyVariableSupport(datasource)) {
      return variable.query;
    }

    throw new Error("Couldn't create a target with supplied arguments.");
  }

  runRequest({ datasource, variable, searchFilter, timeSrv }: RunnerArgs, request: DataQueryRequest) {
    if (!hasLegacyVariableSupport(datasource)) {
      return getEmptyMetricFindValueObservable();
    }

    const queryOptions: any = getLegacyQueryOptions(variable, searchFilter, timeSrv, request.scopedVars);

    return from(datasource.metricFindQuery(variable.query, queryOptions)).pipe(
      mergeMap((values) => {
        if (!values || !values.length) {
          return getEmptyMetricFindValueObservable();
        }

        const series: any = values;
        return of({ series, state: LoadingState.Done, timeRange: queryOptions.range });
      })
    );
  }
}

class StandardQueryRunner implements QueryRunner {
  type = VariableSupportType.Standard;

  canRun(dataSource: DataSourceApi) {
    return hasStandardVariableSupport(dataSource);
  }

  getTarget({ datasource, variable }: GetTargetArgs) {
    if (hasStandardVariableSupport(datasource)) {
      return datasource.variables.toDataQuery(variable.query);
    }

    throw new Error("Couldn't create a target with supplied arguments.");
  }

  runRequest({ datasource, runRequest }: RunnerArgs, request: DataQueryRequest) {
    if (!hasStandardVariableSupport(datasource)) {
      return getEmptyMetricFindValueObservable();
    }

    if (!datasource.variables.query) {
      return runRequest(datasource, request);
    }

    return runRequest(datasource, request, datasource.variables.query.bind(datasource.variables));
  }
}

class CustomQueryRunner implements QueryRunner {
  type = VariableSupportType.Custom;

  canRun(dataSource: DataSourceApi) {
    return hasCustomVariableSupport(dataSource);
  }

  getTarget({ datasource, variable }: GetTargetArgs) {
    if (hasCustomVariableSupport(datasource)) {
      return variable.query;
    }

    throw new Error("Couldn't create a target with supplied arguments.");
  }

  runRequest({ datasource, variable, runRequest }: RunnerArgs, request: DataQueryRequest) {
    if (!hasCustomVariableSupport(datasource)) {
      // Under the CodeRabbit microfrontend the datasource may be a
      // stub that has no `variables` block because the query is
      // resolved by the backend proxy. Rather than swallow the request
      // with an empty result — which leaves variable dropdowns empty
      // and blocks the rest of the flow — pass the request through
      // unchanged so it still reaches `/api/ds/query`.
      if (isFnDashboardEnabled()) {
        return runRequest(datasource, stampVariableRefId(request, variable));
      }
      return getEmptyMetricFindValueObservable();
    }

    return runRequest(
      datasource,
      stampVariableRefId(request, variable),
      datasource.variables.query.bind(datasource.variables)
    );
  }
}

/**
 * Stamp `refId = variable.name` onto every target of a variable's
 * metric-find query when Grafana runs as the CodeRabbit microfrontend.
 *
 * Upstream Grafana leaves it to each datasource plugin to pick a refId
 * for variable queries. The `grafana-bigquery-datasource` plugin, for
 * example, uses `lodash.uniqueId('tempVar')` — a globally-incrementing
 * counter (`tempVar1`, `tempVar2`, ...) that has no relation to the
 * templating variable it describes. Downstream consumers of the
 * request (the CodeRabbit request interceptor and the backend proxy's
 * dashboard-query resolver) key their per-variable state off the
 * refId, so a counter-based refId prevents both caching and reliable
 * variable-name mapping.
 *
 * Using the variable name as the refId keeps the request self-
 * describing without changing behaviour for upstream Grafana users —
 * the stamp is only applied when the microfrontend flag is set.
 */
function stampVariableRefId(request: DataQueryRequest, variable?: QueryVariableModel): DataQueryRequest {
  if (!isFnDashboardEnabled() || !variable?.name || !Array.isArray(request.targets)) {
    return request;
  }
  return {
    ...request,
    targets: request.targets.map((t) => {
      // Shipped CodeRabbit dashboards can store a variable's query as a
      // bare string. Wrap those into a minimal `DataQuery` so the
      // plugin's own `{ ...q, refId: q.refId || uniqueId(...) }` path
      // has a real object to spread and picks up our refId.
      if (typeof t === 'string') {
        return { rawSql: t, refId: variable.name } as unknown as DataQuery;
      }
      if (t === null || typeof t !== 'object') {
        return t;
      }
      const existing = (t as { refId?: unknown }).refId;
      if (typeof existing === 'string' && existing.length > 0) {
        return t;
      }
      return { ...t, refId: variable.name };
    }),
  };
}

/**
 * True when Grafana is running as the CodeRabbit microfrontend.
 *
 * The MFE store mirrors `fnGlobalState.FNDashboard` onto
 * `window.__FNDashboard__` for exactly this consumer pattern —
 * importing `app/store/store` from a module that participates in
 * variable-query resolution would drag in the whole store graph on
 * every test that mounts a template variable and would create a
 * bootstrap cycle. See the mirror site in
 * `public/app/store/configureMfeStore.ts` for the write path.
 */
function isFnDashboardEnabled(): boolean {
  return typeof window !== 'undefined' && window.__FNDashboard__ === true;
}

export const variableDummyRefId = 'variable-query';

class DatasourceQueryRunner implements QueryRunner {
  type = VariableSupportType.Datasource;

  canRun(dataSource: DataSourceApi) {
    return hasDatasourceVariableSupport(dataSource);
  }

  getTarget({ datasource, variable }: GetTargetArgs) {
    if (hasDatasourceVariableSupport(datasource)) {
      return { ...variable.query, refId: variable.query.refId ?? variableDummyRefId };
    }

    throw new Error("Couldn't create a target with supplied arguments.");
  }

  runRequest({ datasource, runRequest }: RunnerArgs, request: DataQueryRequest) {
    if (!hasDatasourceVariableSupport(datasource)) {
      return getEmptyMetricFindValueObservable();
    }

    return runRequest(datasource, request);
  }
}

function getEmptyMetricFindValueObservable(): Observable<PanelData> {
  return of({ state: LoadingState.Done, series: [], timeRange: getDefaultTimeRange() });
}

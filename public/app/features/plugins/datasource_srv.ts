import {
  AppEvents,
  DataSourceApi,
  DataSourceInstanceSettings,
  DataSourcePluginMeta,
  DataSourceRef,
  DataSourceSelectItem,
  PluginType,
  ScopedVars,
  matchPluginId,
} from '@grafana/data';
import {
  DataSourceSrv as DataSourceService,
  DataSourceWithBackend,
  getBackendSrv,
  GetDataSourceListFilters,
  getDataSourceSrv as getDataSourceService,
  getLegacyAngularInjector,
  getTemplateSrv,
  TemplateSrv,
} from '@grafana/runtime';
import { ExpressionDatasourceRef, isExpressionReference } from '@grafana/runtime/src/utils/DataSourceWithBackend';
import appEvents from 'app/core/app_events';
import config from 'app/core/config';
import {
  dataSource as expressionDatasource,
  instanceSettings as expressionInstanceSettings,
} from 'app/features/expressions/ExpressionDatasource';
import { ExpressionDatasourceUID } from 'app/features/expressions/types';

import { importDataSourcePlugin } from './plugin_loader';

export class DatasourceSrv implements DataSourceService {
  private datasources: Record<string, DataSourceApi> = {}; // UID
  private settingsMapByName: Record<string, DataSourceInstanceSettings> = {};
  private settingsMapByUid: Record<string, DataSourceInstanceSettings> = {};
  private settingsMapById: Record<string, DataSourceInstanceSettings> = {};
  private defaultName = ''; // actually UID

  constructor(private templateSrv: TemplateSrv = getTemplateSrv()) {}

  init(settingsMapByName: Record<string, DataSourceInstanceSettings>, defaultName: string) {
    this.datasources = {};
    this.settingsMapByUid = {};
    this.settingsMapByName = settingsMapByName;
    this.defaultName = defaultName;

    for (const dsSettings of Object.values(settingsMapByName)) {
      if (!dsSettings.uid) {
        dsSettings.uid = dsSettings.name; // -- Grafana --, -- Mixed etc
      }

      this.settingsMapByUid[dsSettings.uid] = dsSettings;
      this.settingsMapById[dsSettings.id] = dsSettings;
    }

    // Preload expressions
    this.datasources[ExpressionDatasourceRef.type] = expressionDatasource as any;
    this.datasources[ExpressionDatasourceUID] = expressionDatasource as any;
    this.settingsMapByUid[ExpressionDatasourceRef.uid] = expressionInstanceSettings;
    this.settingsMapByUid[ExpressionDatasourceUID] = expressionInstanceSettings;
  }

  getDataSourceSettingsByUid(uid: string): DataSourceInstanceSettings | undefined {
    return this.settingsMapByUid[uid];
  }

  getInstanceSettings(
    ref: string | null | undefined | DataSourceRef,
    scopedVars?: ScopedVars
  ): DataSourceInstanceSettings | undefined {
    let nameOrUid = getNameOrUid(ref);

    // Expressions has a new UID as __expr__ See: https://github.com/grafana/grafana/pull/62510/
    // But we still have dashboards/panels with old expression UID (-100)
    // To support both UIDs until we migrate them all to new one, this check is necessary
    if (isExpressionReference(nameOrUid)) {
      return expressionInstanceSettings;
    }

    if (nameOrUid === 'default' || nameOrUid == null) {
      return this.settingsMapByUid[this.defaultName] ?? this.settingsMapByName[this.defaultName];
    }

    // Complex logic to support template variable data source names
    // For this we just pick the current or first data source in the variable
    if (nameOrUid[0] === '$') {
      const interpolatedName = this.templateSrv.replace(nameOrUid, scopedVars, variableInterpolation);

      let dsSettings;

      if (interpolatedName === 'default') {
        dsSettings = this.settingsMapByName[this.defaultName];
      } else {
        dsSettings = this.settingsMapByUid[interpolatedName] ?? this.settingsMapByName[interpolatedName];
      }

      if (!dsSettings) {
        return undefined;
      }

      // Return an instance with un-interpolated values for name and uid
      return {
        ...dsSettings,
        isDefault: false,
        name: nameOrUid,
        uid: nameOrUid,
        rawRef: { type: dsSettings.type, uid: dsSettings.uid },
      };
    }

    return this.settingsMapByUid[nameOrUid] ?? this.settingsMapByName[nameOrUid] ?? this.settingsMapById[nameOrUid];
  }

  get(ref?: string | DataSourceRef | null, scopedVars?: ScopedVars): Promise<DataSourceApi> {
    let nameOrUid = getNameOrUid(ref);
    if (!nameOrUid) {
      return this.get(this.defaultName);
    }

    if (isExpressionReference(ref)) {
      return Promise.resolve(this.datasources[ExpressionDatasourceUID]);
    }

    // Check if nameOrUid matches a uid and then get the name
    const byName = this.settingsMapByName[nameOrUid];
    if (byName) {
      nameOrUid = byName.uid;
    }

    // This check is duplicated below, this is here mainly as performance optimization to skip interpolation
    if (this.datasources[nameOrUid]) {
      return Promise.resolve(this.datasources[nameOrUid]);
    }

    // Interpolation here is to support template variable in data source selection
    nameOrUid = this.templateSrv.replace(nameOrUid, scopedVars, variableInterpolation);

    if (nameOrUid === 'default' && this.defaultName !== 'default') {
      return this.get(this.defaultName);
    }

    if (this.datasources[nameOrUid]) {
      return Promise.resolve(this.datasources[nameOrUid]);
    }

    return this.loadDatasource(nameOrUid);
  }

  async loadDatasource(key: string): Promise<DataSourceApi<any, any>> {
    if (this.datasources[key]) {
      return Promise.resolve(this.datasources[key]);
    }

    // find the metadata
    const instanceSettings = this.getInstanceSettings(key);
    if (!instanceSettings) {
      // When Grafana is running as the CodeRabbit microfrontend the
      // actual datasource plugins are not provisioned inside this
      // instance — every SQL / query call is forwarded to
      // `coderabbitHandler` which resolves it against the shipped
      // dashboard JSON and executes it against the real backend
      // (BigQuery). Rejecting here would fail every panel and every
      // variable dropdown before the request ever reaches the proxy.
      // Fall back to a stub that mirrors the reference name/UID and
      // whose `query()` posts to `/api/ds/query` — the endpoint the
      // proxy already intercepts — so the flow completes without a
      // real datasource registration.
      if (isFnDashboardEnabled()) {
        const stub = createFnDashboardStubDatasource(key);
        this.datasources[key] = stub;
        this.datasources[stub.uid] = stub;
        return stub;
      }
      return Promise.reject({ message: `Datasource ${key} was not found` });
    }

    try {
      const dsPlugin = await importDataSourcePlugin(instanceSettings.meta);
      // check if its in cache now
      if (this.datasources[key]) {
        return this.datasources[key];
      }

      // If there is only one constructor argument it is instanceSettings
      const useAngular = dsPlugin.DataSourceClass.length !== 1;
      let instance: DataSourceApi<any, any>;

      if (useAngular) {
        instance = getLegacyAngularInjector().instantiate(dsPlugin.DataSourceClass, {
          instanceSettings,
        });
      } else {
        instance = new dsPlugin.DataSourceClass(instanceSettings);
      }

      instance.components = dsPlugin.components;

      // Some old plugins does not extend DataSourceApi so we need to manually patch them
      if (!(instance instanceof DataSourceApi)) {
        const anyInstance = instance as any;
        anyInstance.name = instanceSettings.name;
        anyInstance.id = instanceSettings.id;
        anyInstance.type = instanceSettings.type;
        anyInstance.meta = instanceSettings.meta;
        anyInstance.uid = instanceSettings.uid;
        (instance as any).getRef = DataSourceApi.prototype.getRef;
      }

      // store in instance cache
      this.datasources[key] = instance;
      this.datasources[instance.uid] = instance;
      return instance;
    } catch (err) {
      if (err instanceof Error) {
        appEvents.emit(AppEvents.alertError, [instanceSettings.name + ' plugin failed', err.toString()]);
      }
      // Same rationale as above: in the microfrontend the plugin
      // module may fail to load (no plugin bundle is shipped for the
      // real datasource type). Return a stub built off the settings
      // we already resolved so the caller can still submit the query
      // to `/api/ds/query`.
      if (isFnDashboardEnabled()) {
        const stub = createFnDashboardStubDatasource(key, instanceSettings);
        this.datasources[key] = stub;
        this.datasources[stub.uid] = stub;
        return stub;
      }
      return Promise.reject({ message: `Datasource: ${key} was not found` });
    }
  }

  getAll(): DataSourceInstanceSettings[] {
    return Object.values(this.settingsMapByName);
  }

  getList(filters: GetDataSourceListFilters = {}): DataSourceInstanceSettings[] {
    const base = Object.values(this.settingsMapByName).filter((x) => {
      if (x.meta.id === 'grafana' || x.meta.id === 'mixed' || x.meta.id === 'dashboard') {
        return false;
      }
      if (filters.metrics && !x.meta.metrics) {
        return false;
      }
      if (filters.tracing && !x.meta.tracing) {
        return false;
      }
      if (filters.logs && x.meta.category !== 'logging' && !x.meta.logs) {
        return false;
      }
      if (filters.annotations && !x.meta.annotations) {
        return false;
      }
      if (filters.alerting && !x.meta.alerting) {
        return false;
      }
      if (filters.pluginId && !matchPluginId(filters.pluginId, x.meta)) {
        return false;
      }
      if (filters.filter && !filters.filter(x)) {
        return false;
      }
      if (filters.type && (Array.isArray(filters.type) ? !filters.type.includes(x.type) : filters.type !== x.type)) {
        return false;
      }
      if (
        !filters.all &&
        x.meta.metrics !== true &&
        x.meta.annotations !== true &&
        x.meta.tracing !== true &&
        x.meta.logs !== true &&
        x.meta.alerting !== true
      ) {
        return false;
      }
      return true;
    });

    if (filters.variables) {
      for (const variable of this.templateSrv.getVariables()) {
        if (variable.type !== 'datasource') {
          continue;
        }
        let dsValue = variable.current.value === 'default' ? this.defaultName : variable.current.value;
        // Support for multi-value DataSource (ds) variables
        if (Array.isArray(dsValue)) {
          // If the ds variable have multiple selected datasources
          // We will use the first one
          dsValue = dsValue[0];
        }
        const dsSettings =
          !Array.isArray(dsValue) && (this.settingsMapByName[dsValue] || this.settingsMapByUid[dsValue]);

        if (dsSettings) {
          const key = `$\{${variable.name}\}`;
          base.push({
            ...dsSettings,
            isDefault: false,
            name: key,
            uid: key,
          });
        }
      }
    }

    const sorted = base.sort((a, b) => {
      if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1;
      }
      if (a.name.toLowerCase() < b.name.toLowerCase()) {
        return -1;
      }
      return 0;
    });

    if (!filters.pluginId && !filters.alerting) {
      if (filters.mixed) {
        const mixedInstanceSettings = this.getInstanceSettings('-- Mixed --');
        if (mixedInstanceSettings) {
          base.push(mixedInstanceSettings);
        }
      }

      if (filters.dashboard) {
        const dashboardInstanceSettings = this.getInstanceSettings('-- Dashboard --');
        if (dashboardInstanceSettings) {
          base.push(dashboardInstanceSettings);
        }
      }

      if (!filters.tracing) {
        const grafanaInstanceSettings = this.getInstanceSettings('-- Grafana --');
        if (grafanaInstanceSettings) {
          base.push(grafanaInstanceSettings);
        }
      }
    }

    return sorted;
  }

  /**
   * @deprecated use getList
   * */
  getExternal(): DataSourceInstanceSettings[] {
    return this.getList();
  }

  /**
   * @deprecated use getList
   * */
  getAnnotationSources() {
    return this.getList({ annotations: true, variables: true }).map((x) => {
      return {
        name: x.name,
        value: x.name,
        meta: x.meta,
      };
    });
  }

  /**
   * @deprecated use getList
   * */
  getMetricSources(options?: { skipVariables?: boolean }): DataSourceSelectItem[] {
    return this.getList({ metrics: true, variables: !options?.skipVariables }).map((x) => {
      return {
        name: x.name,
        value: x.name,
        meta: x.meta,
      };
    });
  }

  async reload() {
    const settings = await getBackendSrv().get('/api/frontend/settings');
    config.datasources = settings.datasources;
    config.defaultDatasource = settings.defaultDatasource;
    this.init(settings.datasources, settings.defaultDatasource);
  }
}

export function getNameOrUid(ref?: string | DataSourceRef | null): string | undefined {
  if (isExpressionReference(ref)) {
    return ExpressionDatasourceRef.uid;
  }

  const isString = typeof ref === 'string';
  return isString ? ref : ref?.uid;
}

export function variableInterpolation<T>(value: T | T[]) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export const getDatasourceSrv = (): DatasourceSrv => {
  return getDataSourceService() as DatasourceSrv;
};

/**
 * True when Grafana is running as the CodeRabbit microfrontend.
 *
 * The MFE store mirrors the `fnGlobalState.FNDashboard` Redux slice
 * onto `window.__FNDashboard__` at dispatch time (see
 * `store/configureMfeStore.ts`) precisely so that low-level modules
 * imported during app bootstrap can consult the flag without pulling
 * in `app/store/store` — importing the store here would create a
 * circular initialisation with `configureStore` and break every
 * dashboard-scene test that transitively loads this file.
 *
 * When the flag is true, every `/api/ds/query` request is routed
 * through the CodeRabbit backend proxy (`coderabbitHandler`), which
 * resolves the panel/variable SQL from the shipped dashboard JSON and
 * executes it against BigQuery. Real datasource plugins are not
 * provisioned inside the embedded Grafana, so callers should treat a
 * missing datasource as a proxy-only path instead of a hard error.
 */
function isFnDashboardEnabled(): boolean {
  return typeof window !== 'undefined' && window.__FNDashboard__ === true;
}

/**
 * Build a fake `DataSourceApi` for the microfrontend flow.
 *
 * The stub inherits from `DataSourceWithBackend`, which implements
 * `query()` by POSTing the incoming `DataQueryRequest` to
 * `/api/ds/query`. That endpoint is intercepted by the CodeRabbit
 * proxy, so the stub's targets never need to reach a real datasource
 * plugin — the proxy resolves the SQL from the dashboard JSON and
 * executes it. `testDatasource()` returns a passing status because
 * there is nothing meaningful to health-check on this side of the
 * proxy.
 *
 * If `instanceSettings` are supplied (plugin-load failure path) the
 * stub reuses them so its `type` / `meta` remain accurate; otherwise
 * we synthesise a minimal `DataSourceInstanceSettings` using the
 * caller's name/UID.
 */
function createFnDashboardStubDatasource(
  key: string,
  instanceSettings?: DataSourceInstanceSettings
): DataSourceApi {
  const settings = instanceSettings ?? synthesiseFnDashboardStubSettings(key);
  return new FnDashboardStubDatasource(settings);
}

function synthesiseFnDashboardStubSettings(key: string): DataSourceInstanceSettings {
  const meta: DataSourcePluginMeta = {
    id: 'coderabbit-fn-dashboard-stub',
    name: 'CodeRabbit MFE stub',
    type: PluginType.datasource,
    info: {
      author: { name: 'CodeRabbit' },
      description: 'Stub datasource used when Grafana runs as the CodeRabbit microfrontend.',
      links: [],
      logos: { small: '', large: '' },
      screenshots: [],
      updated: '',
      version: '',
    },
    module: '',
    baseUrl: '',
  };
  return {
    id: 0,
    uid: key,
    type: meta.id,
    name: key,
    meta,
    jsonData: {},
    readOnly: true,
    access: 'proxy',
  };
}

class FnDashboardStubDatasource extends DataSourceWithBackend {
  constructor(instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
  }
  async testDatasource() {
    return { status: 'success' as const, message: 'CodeRabbit MFE stub datasource — queries are proxied.' };
  }
}

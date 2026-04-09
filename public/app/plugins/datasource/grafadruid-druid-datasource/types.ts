import { DataQuery, DataSourceJsonData } from '@grafana/data';

import { ConnectionSettings } from './configuration/ConnectionSettings/types';
import { QuerySettings } from './configuration/QuerySettings/types';

//expr is a workaround: https://github.com/grafana/grafana/issues/30013
export interface DruidQuery extends DataQuery {
  builder: any;
  settings: QuerySettings;
  expr: string;
}

export interface DruidSettings extends DataSourceJsonData {
  connection?: ConnectionSettings;
  query?: QuerySettings;
}

export interface DruidSecureSettings {}

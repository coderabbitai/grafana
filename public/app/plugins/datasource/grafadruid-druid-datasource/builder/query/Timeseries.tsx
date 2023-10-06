import React from 'react';

import {
  useScopedQueryBuilderProps,
  useScopedQueryBuilderFieldProps,
  Multiple,
  Input,
  Checkbox,
  Row,
} from '../abstract';
import { Aggregation } from '../aggregation';
import { DataSource } from '../datasource';
import { Filter } from '../filter';
import { Granularity } from '../granularity';
import { PostAggregation } from '../postaggregation';
import { Intervals } from '../querysegmentspec';
import { QueryBuilderProps } from '../types';
import { VirtualColumn } from '../virtualcolumn';

export const Timeseries = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Timeseries);
  const scopedComponentProps = useScopedQueryBuilderProps(props, Timeseries);
  return (
    <>
      <Row>
        <DataSource {...scopedComponentProps('dataSource')} />
      </Row>
      <Row>
        <Intervals {...scopedComponentProps('intervals')} />
      </Row>
      <Row>
        <Granularity {...scopedComponentProps('granularity')} />
      </Row>
      <Row>
        <Filter {...scopedComponentProps('filter')} />
      </Row>
      <Row>
        <Multiple
          {...scopedProps('aggregations')}
          label="Aggregations"
          description="The aggregations"
          component={Aggregation}
          componentExtraProps={{
            label: 'Aggregation',
            description: 'An aggregation',
          }}
        />
      </Row>
      <Row>
        <Multiple
          {...scopedProps('postAggregations')}
          label="Post-aggregations"
          description="The post-aggregations"
          component={PostAggregation}
          componentExtraProps={{
            label: 'Post-aggregation',
            description: 'A post-aggregation',
          }}
        />
      </Row>
      <Row>
        <Input {...scopedProps('limit')} label="Limit" description="How many rows to return" type="number" />
      </Row>
      <Row>
        <Checkbox
          {...scopedProps('descending')}
          label="Descending"
          description="Whether to make descending ordered result"
        />
      </Row>
      <Row>
        <Multiple
          {...scopedProps('virtualColumns')}
          label="Virtual columns"
          description="The virtual columns"
          component={VirtualColumn}
          componentExtraProps={{
            label: 'Virtual column',
            description: 'A virtual column',
          }}
        />
      </Row>
    </>
  );
};
Timeseries.queryType = 'timeseries';
Timeseries.fields = [
  'dataSource',
  'descending',
  'intervals',
  'granularity',
  'filter',
  'aggregations',
  'postAggregations',
  'limit',
  'virtualColumns',
];

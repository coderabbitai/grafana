import { QueryBuilderComponentSelector } from '../abstract';
import { QueryBuilderProps } from '../types';

import { Intervals } from './';

export const QuerySegmentSpec = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector {...props} label="QuerySegmentSpec" components={{ Intervals: Intervals }} />
);

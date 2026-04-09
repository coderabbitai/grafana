import { QueryBuilderComponentSelector } from '../abstract';
import { QueryBuilderProps } from '../types';

import { Default } from './';

export const LimitSpec = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector {...props} label="LimitSpec" components={{ Default: Default }} />
);

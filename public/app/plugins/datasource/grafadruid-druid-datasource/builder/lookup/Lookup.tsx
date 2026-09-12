import { QueryBuilderComponentSelector } from '../abstract';
import { QueryBuilderProps } from '../types';

import { Map } from './';

export const Lookup = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector {...props} label="Lookup" components={{ Map: Map }} />
);

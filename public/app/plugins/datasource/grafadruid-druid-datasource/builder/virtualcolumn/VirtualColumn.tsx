import { QueryBuilderComponentSelector } from '../abstract';
import { QueryBuilderProps } from '../types';

import { Expression } from './';

export const VirtualColumn = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector {...props} label="VirtualColumn" components={{ Expression: Expression }} />
);

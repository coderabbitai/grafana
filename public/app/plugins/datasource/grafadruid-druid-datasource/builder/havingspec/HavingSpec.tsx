import { QueryBuilderComponentSelector } from '../abstract';
import { QueryBuilderProps } from '../types';

import { And, DimSelector, EqualTo, Filter, GreaterThan, LessThan, Not, Or } from './';

export const HavingSpec = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    {...props}
    label="HavingSpec"
    components={{
      And: And,
      DimSelector: DimSelector,
      EqualTo: EqualTo,
      Filter: Filter,
      GreaterThan: GreaterThan,
      LessThan: LessThan,
      Not: Not,
      Or: Or,
    }}
  />
);

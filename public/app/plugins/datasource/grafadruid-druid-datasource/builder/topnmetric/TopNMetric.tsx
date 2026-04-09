import { QueryBuilderComponentSelector } from '../abstract';
import { QueryBuilderProps } from '../types';

import { AlphaNumeric, Dimension, Inverted, Lexicographic, Numeric } from './';

export const TopNMetric = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    {...props}
    label="TopNMetric"
    components={{
      AlphaNumeric: AlphaNumeric,
      Dimension: Dimension,
      Inverted: Inverted,
      Lexicographic: Lexicographic,
      Numeric: Numeric,
    }}
  />
);

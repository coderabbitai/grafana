import { QueryBuilderComponentSelector } from '../abstract';
import { QueryBuilderProps } from '../types';

import { All, Contains, Fragment, InsensitiveContains, Regex } from './';

export const SearchQuerySpec = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    {...props}
    label="SearchQuerySpec"
    components={{
      All: All,
      Contains: Contains,
      Fragment: Fragment,
      InsensitiveContains: InsensitiveContains,
      Regex: Regex,
    }}
  />
);

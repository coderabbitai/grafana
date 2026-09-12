import { QueryBuilderComponentSelector } from '../abstract';
import { QueryBuilderProps } from '../types';

import { AlphaNumeric, Lexicographic, Numeric, StrLen, Version } from './';

export const SearchSortSpec = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    {...props}
    label="SearchSortSpec"
    components={{
      AlphaNumeric: AlphaNumeric,
      Lexicographic: Lexicographic,
      Numeric: Numeric,
      StrLen: StrLen,
      Version: Version,
    }}
  />
);

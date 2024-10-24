import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { ExtractionFn } from '../extractionfn';
import { SearchQuerySpec } from '../searchqueryspec';
import { QueryBuilderProps } from '../types';

import { FilterTuning } from '.';

export const Search = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Search);
  return (
    <>
      <Row>
        <Input {...scopedProps('dimension')} label="Dimension" description="the dimension name" type="text" />
      </Row>
      <Row>
        <SearchQuerySpec {...scopedProps('query')} />
      </Row>
      <Row>
        <ExtractionFn {...scopedProps('extractionFn')} />
      </Row>
      <Row>
        <FilterTuning {...scopedProps('filterTuning')} />
      </Row>
    </>
  );
};
Search.type = 'search';
Search.fields = ['dimension', 'query', 'extractionFn', 'filterTuning'];

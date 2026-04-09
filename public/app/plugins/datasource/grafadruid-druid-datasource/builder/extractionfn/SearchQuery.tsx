import { useScopedQueryBuilderProps, Row } from '../abstract';
import { SearchQuerySpec } from '../searchqueryspec';
import { QueryBuilderProps } from '../types';

export const SearchQuery = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderProps(props, SearchQuery);
  return (
    <Row>
      <SearchQuerySpec {...scopedProps('query')} />
    </Row>
  );
};
SearchQuery.type = 'searchQuery';
SearchQuery.fields = ['query'];

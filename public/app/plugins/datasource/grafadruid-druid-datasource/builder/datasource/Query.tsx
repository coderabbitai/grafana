import { useScopedQueryBuilderProps, Row } from '../abstract';
import { Query as QuerySelector } from '../query';
import { QueryBuilderProps } from '../types';

export const Query = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderProps(props, Query);
  return (
    <Row>
      <QuerySelector {...scopedProps('query')} />
    </Row>
  );
};
Query.type = 'query';
Query.fields = ['query'];

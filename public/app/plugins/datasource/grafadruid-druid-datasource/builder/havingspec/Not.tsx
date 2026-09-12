import { useScopedQueryBuilderFieldProps, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

import { HavingSpec } from './';

export const Not = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Not);
  return (
    <Row>
      <HavingSpec {...scopedProps('havingSpec')} />
    </Row>
  );
};
Not.type = 'not';
Not.fields = ['havingSpec'];

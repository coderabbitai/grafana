import { useScopedQueryBuilderFieldProps, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

import { Filter } from './';

export const Not = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Not);
  return (
    <Row>
      <Filter {...scopedProps('field')} />
    </Row>
  );
};
Not.type = 'not';
Not.fields = ['field'];

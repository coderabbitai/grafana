import { useScopedQueryBuilderFieldProps, Row } from '../abstract';
import { Filter as FilterField } from '../filter';
import { QueryBuilderProps } from '../types';

export const Filter = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Filter);
  return (
    <Row>
      <FilterField {...scopedProps('filter')} />
    </Row>
  );
};
Filter.type = 'filter';
Filter.fields = ['filter'];

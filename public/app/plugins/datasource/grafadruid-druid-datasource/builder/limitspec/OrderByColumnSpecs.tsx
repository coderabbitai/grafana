import { useScopedQueryBuilderFieldProps, Input, Select, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const OrderByColumnSpecs = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, OrderByColumnSpecs);
  return (
    <Row>
      <Input {...scopedProps('dimension')} label="Dimension" description="Any dimension or metric name" type="text" />
      <Select
        {...scopedProps('direction')}
        label="Direction"
        description="Specifies the sort direction"
        entries={{
          ascending: 'Ascending',
          descending: 'Descending',
        }}
      />
      <Select
        {...scopedProps('dimensionOrder')}
        label="Ordering"
        description="Specifies the sorting order to use"
        entries={{
          lexicographic: 'Lexicographic',
          alphanumeric: 'Alphanumeric',
          strlen: 'String len',
          numeric: 'Numeric',
          version: 'Version',
        }}
      />
    </Row>
  );
};
OrderByColumnSpecs.type = '';
OrderByColumnSpecs.fields = ['direction', 'dimensionOrder'];

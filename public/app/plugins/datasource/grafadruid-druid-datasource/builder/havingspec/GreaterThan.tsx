import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const GreaterThan = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, GreaterThan);
  return (
    <Row>
      <Input {...scopedProps('aggregation')} label="Aggregation" description="The metric column" type="text" />
      <Input {...scopedProps('value')} label="Value" description="The numeric value" type="number" />
    </Row>
  );
};
GreaterThan.type = 'greaterThan';
GreaterThan.fields = ['aggregation', 'value'];

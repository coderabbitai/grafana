import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const EqualTo = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, EqualTo);
  return (
    <Row>
      <Input {...scopedProps('aggregation')} label="Aggregation" description="The metric column" type="text" />
      <Input {...scopedProps('value')} label="Value" description="The numeric value" type="number" />
    </Row>
  );
};
EqualTo.type = 'equalTo';
EqualTo.fields = ['aggregation', 'value'];

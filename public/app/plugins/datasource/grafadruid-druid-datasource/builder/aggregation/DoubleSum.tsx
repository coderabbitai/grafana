import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const DoubleSum = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, DoubleSum);
  return (
    <Row>
      <Input {...scopedProps('name')} label="Name" description="Output name for the summed value" type="text" />
      <Input
        {...scopedProps('fieldName')}
        label="Field name"
        description="Name of the metric column to sum over"
        type="text"
      />
      <Input {...scopedProps('expression')} label="Expression" description="The expression" type="text" />
    </Row>
  );
};
DoubleSum.type = 'doubleSum';
DoubleSum.fields = ['name', 'fieldName', 'expression'];

import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const LongMax = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, LongMax);
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
LongMax.type = 'longMax';
LongMax.fields = ['name', 'fieldName', 'expression'];

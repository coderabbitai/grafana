import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const LongAny = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, LongAny);
  return (
    <Row>
      <Input {...scopedProps('name')} label="Name" description="Output name for the summed lue" type="text" />
      <Input
        {...scopedProps('fieldName')}
        label="Field name"
        description="Name of the metric column to sum over"
        type="text"
      />
    </Row>
  );
};
LongAny.type = 'longAny';
LongAny.fields = ['name', 'fieldName'];

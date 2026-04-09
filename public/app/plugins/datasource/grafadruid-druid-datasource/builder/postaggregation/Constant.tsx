import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Constant = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Constant);
  return (
    <Row>
      <Input {...scopedProps('name')} label="Name" description="Output name" type="text" />
      <Input {...scopedProps('value')} label="Value" description="The value to return" type="number" />
    </Row>
  );
};
Constant.type = 'constant';
Constant.fields = ['name', 'value'];

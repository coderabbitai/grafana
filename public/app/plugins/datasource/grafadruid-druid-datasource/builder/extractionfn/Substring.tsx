import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Substring = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Substring);
  return (
    <Row>
      <Input {...scopedProps('index')} label="Index" description="The starting index" type="number" />
      <Input {...scopedProps('length')} label="Length" description="The substring length" type="number" />
    </Row>
  );
};
Substring.type = 'substring';
Substring.fields = ['index', 'length'];

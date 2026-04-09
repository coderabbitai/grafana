import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Partial = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Partial);
  return (
    <Row>
      <Input {...scopedProps('expr')} label="Expression" description="The regular expression" type="text" />
    </Row>
  );
};
Partial.type = 'partial';
Partial.fields = ['expr'];

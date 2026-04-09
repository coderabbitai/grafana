import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const InsensitiveContains = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, InsensitiveContains);
  return (
    <Row>
      <Input {...scopedProps('value')} label="Value" description="The value that has to be contained" type="text" />
    </Row>
  );
};
InsensitiveContains.type = 'insensitive_contains';
InsensitiveContains.fields = ['value'];

import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Regex = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Regex);
  return (
    <Row>
      <Input {...scopedProps('pattern')} label="Pattern" description="The regex pattern" type="text" />
    </Row>
  );
};
Regex.type = 'regex';
Regex.fields = ['pattern'];

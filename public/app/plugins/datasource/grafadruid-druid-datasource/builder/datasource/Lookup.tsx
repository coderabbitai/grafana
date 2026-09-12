import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Lookup = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Lookup);
  return (
    <Row>
      <Input {...scopedProps('lookup')} label="Lookup" description="The lookup table name" type="text" />
    </Row>
  );
};
Lookup.type = 'lookup';
Lookup.fields = ['lookup'];

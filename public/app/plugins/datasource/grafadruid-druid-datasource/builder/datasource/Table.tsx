import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Table = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Table);
  return (
    <Row>
      <Input {...scopedProps('name')} label="Name" description="The table name" type="text" />
    </Row>
  );
};
Table.type = 'table';
Table.fields = ['name'];

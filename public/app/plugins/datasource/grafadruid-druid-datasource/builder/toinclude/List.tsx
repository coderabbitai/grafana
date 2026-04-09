import { useScopedQueryBuilderFieldProps, Input, Multiple, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const List = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, List);
  return (
    <Row>
      <Multiple
        {...scopedProps('columns')}
        label="Columns"
        description="The columns names"
        component={Input}
        componentExtraProps={{
          label: 'Column',
          description: 'The column name',
          type: 'text',
        }}
      />
    </Row>
  );
};
List.type = 'list';
List.fields = ['columns'];

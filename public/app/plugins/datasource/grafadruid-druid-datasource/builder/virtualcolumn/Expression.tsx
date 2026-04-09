import { useScopedQueryBuilderFieldProps, Input, Select, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Expression = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Expression);
  return (
    <Row>
      <Input {...scopedProps('name')} label="Name" description="The name of the virtual column" type="text" />
      <Input
        {...scopedProps('expression')}
        label="Expression"
        description="Expr. that takes a row as input, outputs a value"
        type="text"
      />
      <Select
        {...scopedProps('outputType')}
        label="Output type"
        description="Specifies the output type"
        entries={{
          LONG: 'Long',
          FLOAT: 'Float',
          DOUBLE: 'Double',
          STRING: 'String',
        }}
      />
    </Row>
  );
};
Expression.type = 'expression';
Expression.fields = ['name', 'expression', 'outputType'];

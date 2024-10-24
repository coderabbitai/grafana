import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Numeric = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Numeric);
  return (
    <Row>
      <Input
        {...scopedProps('metric')}
        label="Metric"
        description="The metric field in which results will be sorted by"
        type="text"
      />
    </Row>
  );
};
Numeric.type = 'numeric';
Numeric.fields = ['metric'];

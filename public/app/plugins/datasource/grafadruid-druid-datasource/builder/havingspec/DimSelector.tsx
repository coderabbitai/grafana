import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const DimSelector = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, DimSelector);
  return (
    <Row>
      <Input {...scopedProps('aggregation')} label="Aggregation" description="the metric column" type="text" />
      <Input {...scopedProps('value')} label="Value" description="the numeric value" type="number" />
    </Row>
  );
};
DimSelector.type = 'dimSelector';
DimSelector.fields = ['aggregation', 'value'];

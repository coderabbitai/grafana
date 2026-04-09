import { useScopedQueryBuilderFieldProps, KeyValue, Checkbox, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Map = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Map);
  return (
    <Row>
      <KeyValue {...scopedProps('map')} label="Map" description="The lookup inline map" />
      <Checkbox
        {...scopedProps('isOneToOne')}
        label="Is one to one?"
        description="Specifies if the map is one to one"
      />
    </Row>
  );
};
Map.type = 'map';
Map.fields = ['map', 'isOneToOne'];

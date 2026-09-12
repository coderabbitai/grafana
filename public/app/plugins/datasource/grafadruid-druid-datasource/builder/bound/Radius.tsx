import { useScopedQueryBuilderFieldProps, Input, Multiple, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Radius = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Radius);
  return (
    <>
      <Row>
        <Multiple
          {...scopedProps('coords')}
          label="Coordinates"
          description="Origin coordinates in the form [x, y, z, ...]"
          component={Input}
          componentExtraProps={{
            label: 'Coordinate',
            description: 'Coordinate. e.g: 10.0',
            type: 'number',
          }}
        />
      </Row>
      <Row>
        <Input {...scopedProps('radius')} label="Radius" description="The float radius value" type="number" />
      </Row>
    </>
  );
};
Radius.type = 'radius';
Radius.fields = ['coords', 'radius'];

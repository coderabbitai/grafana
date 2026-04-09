import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const AlphaNumeric = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, AlphaNumeric);
  return (
    <Row>
      <Input
        {...scopedProps('previousStop')}
        label="Previous stop"
        description="The starting point of the sort"
        type="text"
      />
    </Row>
  );
};
AlphaNumeric.type = 'alphaNumeric';
AlphaNumeric.fields = ['previousStop'];

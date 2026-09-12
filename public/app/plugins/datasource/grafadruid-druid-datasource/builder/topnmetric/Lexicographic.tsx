import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Lexicographic = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Lexicographic);
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
Lexicographic.type = 'lexicographic';
Lexicographic.fields = ['previousStop'];

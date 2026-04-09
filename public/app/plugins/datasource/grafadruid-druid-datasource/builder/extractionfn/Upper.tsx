import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Upper = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Upper);
  return (
    <Row>
      <Input
        {...scopedProps('locale')}
        label="Locale"
        description="The optionnal locale to use to perform the transformation. e.g: fr"
        type="text"
      />
    </Row>
  );
};
Upper.type = 'upper';
Upper.fields = ['locale'];

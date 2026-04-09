import { useScopedQueryBuilderFieldProps, Multiple, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

import { HavingSpec } from './';

export const Or = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Or);
  return (
    <Row>
      <Multiple
        {...scopedProps('havingSpecs')}
        label="Or"
        description="The having filters"
        component={HavingSpec}
        componentExtraProps={{}}
      />
    </Row>
  );
};
Or.type = 'or';
Or.fields = ['havingSpecs'];

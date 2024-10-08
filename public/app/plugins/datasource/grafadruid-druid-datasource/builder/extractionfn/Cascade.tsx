import { useScopedQueryBuilderFieldProps, Multiple, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

import { ExtractionFn } from './';

export const Cascade = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Cascade);
  return (
    <Row>
      <Multiple
        {...scopedProps('extractionFns')}
        label="Extraction functions"
        description="The extraction functions"
        component={ExtractionFn}
        componentExtraProps={{}}
      />
    </Row>
  );
};
Cascade.type = 'cascade';
Cascade.fields = ['extractionFns'];

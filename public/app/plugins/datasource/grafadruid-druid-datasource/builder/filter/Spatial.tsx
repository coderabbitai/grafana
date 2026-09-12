import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { Bound } from '../bound';
import { ExtractionFn } from '../extractionfn';
import { QueryBuilderProps } from '../types';

import { FilterTuning } from '.';

export const Spatial = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Spatial);
  return (
    <>
      <Row>
        <Input {...scopedProps('dimension')} label="Dimension" description="The dimension name" type="text" />
      </Row>
      <Row>
        <Bound {...scopedProps('bound')} />
      </Row>
      <Row>
        <ExtractionFn {...scopedProps('extractionFn')} />
      </Row>
      <Row>
        <FilterTuning {...scopedProps('filterTuning')} />
      </Row>
    </>
  );
};
Spatial.type = 'spatial';
Spatial.fields = ['dimension', 'bound', 'extractionFn', 'filterTuning'];

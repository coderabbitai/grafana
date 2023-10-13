import React from 'react';

import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const FieldAccess = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, FieldAccess);
  return (
    <Row>
      <Input {...scopedProps('name')} label="Name" description="Output name for the value" type="text" />
      <Input {...scopedProps('fieldName')} label="Field name" description="Name of the aggregator" type="text" />
    </Row>
  );
};
FieldAccess.type = 'fieldAccess';
FieldAccess.fields = ['name', 'fieldName'];

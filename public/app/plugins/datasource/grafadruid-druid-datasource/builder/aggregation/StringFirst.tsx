import React from 'react';

import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const StringFirst = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, StringFirst);
  return (
    <Row>
      <Input {...scopedProps('name')} label="Name" description="Output name for the summed value" type="text" />
      <Input
        {...scopedProps('fieldName')}
        label="Field name"
        description="Name of the metric column to sum over"
        type="text"
      />
      <Input {...scopedProps('maxStringBytes')} label="Max string bytes" description="Max string bytes" type="number" />
    </Row>
  );
};
StringFirst.type = 'stringFirst';
StringFirst.fields = ['name', 'fieldName', 'maxStringBytes'];

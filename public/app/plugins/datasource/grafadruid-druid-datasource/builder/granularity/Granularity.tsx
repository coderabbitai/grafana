import { QueryBuilderComponentSelector } from '../abstract';
import { QueryBuilderProps } from '../types';

import { Duration, Period, Simple } from './';

export const Granularity = (props: QueryBuilderProps) => {
  const defaultComponent = typeof props.options.builder === 'string' ? Simple : undefined;
  return (
    <QueryBuilderComponentSelector
      {...props}
      label="Granularity"
      components={{ Duration: Duration, Period: Period, Simple: Simple }}
      default={defaultComponent}
    />
  );
};

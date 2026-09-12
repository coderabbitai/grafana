import { useQueryBuilderAutoSubmit, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Numeric = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, Numeric);
  return <Row>Numeric.</Row>;
};
Numeric.type = 'numeric';
Numeric.fields = [] as string[];

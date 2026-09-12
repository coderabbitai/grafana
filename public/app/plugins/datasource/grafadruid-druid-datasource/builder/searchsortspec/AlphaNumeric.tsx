import { useQueryBuilderAutoSubmit, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const AlphaNumeric = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, AlphaNumeric);
  return <Row>AlphaNumeric.</Row>;
};
AlphaNumeric.type = 'alphanumeric';
AlphaNumeric.fields = [] as string[];

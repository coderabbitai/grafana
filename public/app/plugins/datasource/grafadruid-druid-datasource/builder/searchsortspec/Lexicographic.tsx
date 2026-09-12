import { useQueryBuilderAutoSubmit, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Lexicographic = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, Lexicographic);
  return <Row>Lexicographic.</Row>;
};
Lexicographic.type = 'lexicographic';
Lexicographic.fields = [] as string[];

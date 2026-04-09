import { useQueryBuilderAutoSubmit, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const StrLen = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, StrLen);
  return <Row>StrLen.</Row>;
};
StrLen.type = 'strlen';
StrLen.fields = [] as string[];

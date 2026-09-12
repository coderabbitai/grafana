import { useQueryBuilderAutoSubmit, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Version = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, Version);
  return <Row>Version.</Row>;
};
Version.type = 'version';
Version.fields = [] as string[];

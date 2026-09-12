import { useScopedQueryBuilderProps, Row } from '../abstract';
import { DataSource } from '../datasource';
import { QueryBuilderProps } from '../types';

export const DatasourceMetadata = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderProps(props, DatasourceMetadata);
  return (
    <Row>
      <DataSource {...scopedProps('dataSource')} />
    </Row>
  );
};
DatasourceMetadata.queryType = 'dataSourceMetadata';
DatasourceMetadata.fields = ['dataSource'];

import { Code, Row } from '../abstract';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';

export const Json = (props: QueryBuilderProps) => {
  const options: any = { builder: JSON.stringify(props.options.builder, null, '\t') };
  const onChange = (options: QueryBuilderOptions) => {
    let builder: any = {};
    try {
      builder = JSON.parse(options.builder);
    } catch {
      return;
    }
    props.onOptionsChange({ ...props.options, builder: builder });
  };
  return (
    <Row>
      <Code
        options={options}
        onOptionsChange={onChange}
        name="JSON"
        label={undefined}
        description="The rune query JSON specification"
        lang="hjson"
      />
    </Row>
  );
};
Json.queryType = 'json';
Json.fields = [] as string[];

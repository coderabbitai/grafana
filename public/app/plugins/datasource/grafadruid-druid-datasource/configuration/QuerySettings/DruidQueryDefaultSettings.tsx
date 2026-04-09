import { css, cx } from '@emotion/css';

import { FieldSet } from '@grafana/ui';

import { QuerySettingsProps } from './types';

import { DruidQueryRequestSettings, DruidQueryResponseSettings } from './';

export const DruidQueryDefaultSettings = (props: QuerySettingsProps) => {
  return (
    <>
      <FieldSet label="Request" className={cx(styles.fieldset)}>
        <DruidQueryRequestSettings {...props} />
      </FieldSet>
      <FieldSet label="Response" className={cx(styles.fieldset)}>
        <DruidQueryResponseSettings {...props} />
      </FieldSet>
    </>
  );
};

const styles = {
  fieldset: css`
    padding-left: 5px;
  `,
};

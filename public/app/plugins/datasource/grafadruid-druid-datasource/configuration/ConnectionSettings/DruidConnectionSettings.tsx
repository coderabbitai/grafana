import { ConnectionSettingsProps } from './types';

import { DruidHttpSettings, DruidAuthSettings } from './';

export const DruidConnectionSettings = (props: ConnectionSettingsProps) => {
  return (
    <>
      <DruidHttpSettings {...props} />
      <DruidAuthSettings {...props} />
    </>
  );
};

import { useState } from 'react';

import { InfoBox } from '@grafana/ui';

import { useQueryBuilderAutoSubmit, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const None = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, None);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <>
      {showInfo && (
        <Row>
          <InfoBox
            title="None"
            onDismiss={() => {
              setShowInfo(false);
            }}
          >
            <p>No column should be included in the result.</p>
          </InfoBox>
        </Row>
      )}
    </>
  );
};
None.type = 'none';
None.fields = [] as string[];

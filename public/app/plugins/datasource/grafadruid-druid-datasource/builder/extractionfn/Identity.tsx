import { useState } from 'react';

import { InfoBox } from '@grafana/ui';

import { useQueryBuilderAutoSubmit, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const Identity = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, Identity);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <>
      {showInfo && (
        <Row>
          <InfoBox
            title="Identity"
            onDismiss={() => {
              setShowInfo(false);
            }}
          >
            <p>Identity. Whatever it does.</p>
          </InfoBox>
        </Row>
      )}
    </>
  );
};
Identity.type = 'identity';
Identity.fields = [] as string[];

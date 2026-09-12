import { useState } from 'react';

import { InfoBox } from '@grafana/ui';

import { useQueryBuilderAutoSubmit, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const StrLen = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, StrLen);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <>
      {showInfo && (
        <Row>
          <InfoBox
            title="StrLen"
            onDismiss={() => {
              setShowInfo(false);
            }}
          >
            <p>Returns the length of dimension values (as if they were encoded in UTF-16)</p>
          </InfoBox>
        </Row>
      )}
    </>
  );
};
StrLen.type = 'strlen';
StrLen.fields = [] as string[];

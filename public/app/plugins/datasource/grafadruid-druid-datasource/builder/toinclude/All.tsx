import { useState } from 'react';

import { InfoBox } from '@grafana/ui';

import { useQueryBuilderAutoSubmit, Row } from '../abstract';
import { QueryBuilderProps } from '../types';

export const All = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, All);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <>
      {showInfo && (
        <Row>
          <InfoBox
            title="All"
            onDismiss={() => {
              setShowInfo(false);
            }}
          >
            <p>All columns should be included in the result.</p>
          </InfoBox>
        </Row>
      )}
    </>
  );
};
All.type = 'all';
All.fields = [] as string[];

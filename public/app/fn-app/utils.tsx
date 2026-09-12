import { Portal } from '@mui/material';
import { FC, PropsWithChildren } from 'react';

export interface RenderPortalProps {
  ID: string;
}

export const RenderPortal: FC<PropsWithChildren<RenderPortalProps>> = ({ ID, children }) => {
  const container = document.getElementById(ID);

  if (!container) {
    return null;
  }

  return <Portal container={container}>{children}</Portal>;
};

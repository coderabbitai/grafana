import { FC, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { MfeContainer } from './types';

export interface RenderPortalProps {
  ID: string;
  children: ReactNode | ((container: MfeContainer) => ReactNode);
}

export const RenderPortal: FC<RenderPortalProps> = ({ ID, children }) => {
  const container = document.getElementById(ID);

  if (!container) {
    return null;
  }

  const shadowRoot = container.shadowRoot || container.attachShadow({ mode: 'open' });
  const content = typeof children === 'function' ? children(shadowRoot) : children;

  return createPortal(content, shadowRoot);
};

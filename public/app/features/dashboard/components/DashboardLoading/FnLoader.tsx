import { type FC } from 'react';

import { CodeRabbitLogo } from './CodeRabbitLogo';

export type FnLoaderProps = {
  size?: 'small' | 'medium' | 'large';
  loadingMessage?: string;
};

export const FnLoader: FC<FnLoaderProps> = ({ size = 'medium', loadingMessage = 'Loading dashboard...' }) => {
  return (
    <div className="hide-theme-toggle relative">
      <div className="mx-auto flex w-10/12 flex-col items-center sm:w-full">
        {size === 'medium' && <CodeRabbitLogo width={200} className="" />}
        <div className="flex items-center justify-center gap-x-4">
          <p className="font-poppins text-shimmer from-muted via-secondary to-foreground -mt-2 ml-1 bg-gradient-to-r bg-clip-text text-lg tracking-wide text-transparent">
            {loadingMessage}
          </p>
        </div>
      </div>
    </div>
  );
};

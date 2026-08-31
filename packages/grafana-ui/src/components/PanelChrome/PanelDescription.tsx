import { css, cx } from '@emotion/css';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

import { GrafanaTheme2 } from '@grafana/data';

import { useStyles2 } from '../../themes';
import { Tooltip } from '../Tooltip';

import { TitleItem } from './TitleItem';

interface Props {
  description: string | (() => string);
  className?: string;
}

export function PanelDescription({ description, className }: Props) {
  const styles = useStyles2(getStyles);

  const getDescriptionContent = (): JSX.Element => {
    // description
    const panelDescription = typeof description === 'function' ? description() : description;

    return (
      <div className="panel-info-content markdown-html">
        <div dangerouslySetInnerHTML={{ __html: panelDescription }} />
      </div>
    );
  };

  return description !== '' ? (
    <Tooltip interactive content={getDescriptionContent}>
      <TitleItem className={cx(className, styles.description)}>
        {/* Heroicons is the icon set used by the CodeRabbit UI (Carrot UI) design system. */}
        <InformationCircleIcon className={styles.icon} aria-hidden />
      </TitleItem>
    </Tooltip>
  ) : null;
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    description: css({
      code: {
        whiteSpace: 'normal',
        wordWrap: 'break-word',
      },

      'pre > code': {
        display: 'block',
      },
    }),
    icon: css({
      width: 16,
      height: 16,
      flexShrink: 0,
      color: theme.colors.text.secondary,
      transition: theme.transitions.create('color', {
        duration: theme.transitions.duration.shortest,
      }),

      '&:hover': {
        color: theme.colors.text.primary,
      },
    }),
  };
};

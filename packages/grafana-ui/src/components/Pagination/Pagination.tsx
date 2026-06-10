import { css, cx } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';

import { useStyles2 } from '../../themes';
import { Button } from '../Button';
import { Icon } from '../Icon/Icon';

export interface Props {
  /** The current page index being shown. */
  currentPage: number;
  /** Number of total pages. */
  numberOfPages: number;
  /** Callback function for fetching the selected page.  */
  onNavigate: (toPage: number) => void;
  /** When set to true and the pagination result is only one page it will not render the pagination at all. */
  hideWhenSinglePage?: boolean;
  /** Small version only shows the current page and the navigation buttons. */
  showSmallVersion?: boolean;
  className?: string;
}

export const Pagination = ({ currentPage, numberOfPages, onNavigate, hideWhenSinglePage, className }: Props) => {
  const styles = useStyles2(getStyles);

  if (hideWhenSinglePage && numberOfPages <= 1) {
    return null;
  }

  return (
    <nav className={cx(styles.container, className)} aria-label="Pagination">
      <Button
        aria-label={`previous page`}
        size="sm"
        onClick={() => onNavigate(currentPage - 1)}
        disabled={currentPage === 1}
        fill="ghost"
        className={styles.navButton}
      >
        <Icon name="angle-left" />
      </Button>
      <span className={styles.pageSummary} aria-live="polite">
        {currentPage} / {numberOfPages}
      </span>
      <Button
        aria-label={`next page`}
        size="sm"
        fill="ghost"
        onClick={() => onNavigate(currentPage + 1)}
        disabled={currentPage === numberOfPages}
        className={styles.navButton}
      >
        <Icon name="angle-right" />
      </Button>
    </nav>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css({
      display: 'flex',
      minWidth: 0,
      alignItems: 'center',
      gap: theme.spacing(0.5),
    }),
    navButton: css({
      minWidth: theme.spacing(3.5),
      width: theme.spacing(3.5),
      height: theme.spacing(3.5),
      padding: 0,
      color: theme.colors.text.secondary,
      borderRadius: theme.shape.radius.default,

      '&:not(:disabled):hover': {
        color: theme.colors.text.primary,
        background: theme.colors.action.hover,
      },
    }),
    pageSummary: css({
      minWidth: theme.spacing(6),
      padding: theme.spacing(0, 0.75),
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      lineHeight: theme.spacing(3.5),
      textAlign: 'center',
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
    }),
  };
};

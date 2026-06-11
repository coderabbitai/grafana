import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';

/**
 * Get Styles
 */
export const getStyles = (theme: GrafanaTheme2) => {
  return {
    label: css`
      display: inline-flex;
      align-items: center;
      gap: ${theme.spacing(0.5)};
      min-width: max-content;
      white-space: nowrap;
    `,
    labelSortable: css`
      cursor: pointer;
      &:hover {
        color: ${theme.colors.text.primary};
      }
    `,
    actionHeader: css`
      margin: ${theme.spacing(0)};
      margin-left: ${theme.spacing(1)};
      white-space: nowrap;
    `,
    actions: css`
      display: flex;
    `,
    tooltip: css`
      margin-right: ${theme.spacing(0.5)};
      cursor: auto;
    `,
    sortingAvailable: css`
      margin-left: ${theme.spacing(0.5)};
      cursor: auto;
      color: ${theme.colors.text.secondary};
      opacity: 0;
      transition: opacity 100ms ease-out;
    `,
    filterButton: css`
      border: none;
      box-shadow: none;
      background-color: transparent;
      padding: 0;
      color: ${theme.colors.text.secondary};
    `,
    sortTag: css`
      padding: ${theme.spacing(0.25)};
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: ${theme.shape.radius.circle};
      margin-right: ${theme.spacing(0.5)};
      background: ${theme.colors.border.weak};
    `,
  };
};

import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';

/**
 * Get Styles
 */
export const getStyles = (theme: GrafanaTheme2) => {
  const borderColor = theme.colors.border.weak;
  const hoverBackground = theme.colors.action.hover;
  const hoverContrastColor = theme.colors.text.primary;

  return {
    row: css`
      display: flex;
      position: absolute;
      width: 100%;
      justify-content: space-between;
      background-color: ${theme.colors.background.primary};
      color: ${theme.colors.text.primary};
      transition: background-color 100ms ease-out;
      &:not(:last-child) {
        border-bottom: 1px solid ${borderColor};
      }
    `,
    highlightRow: css`
      &:hover td {
        background-color: ${hoverBackground}!important;
      }
      &:hover td span {
        color: ${hoverContrastColor} !important;
      }
    `,

    newRow: css`
      position: relative;
      border-bottom: 1px solid ${borderColor};
      background-color: ${theme.colors.background.primary};
    `,
    cell: css`
      display: flex;
      min-height: 37px;
      align-items: center;
      box-sizing: border-box;
      white-space: nowrap;
      padding: ${theme.spacing(1, 2)} !important;
      flex: 1 0 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      z-index: 0;
      background-color: inherit;
      color: inherit;
    `,
    cellEditable: css``,
    cellExpandable: css`
      cursor: pointer;
      border-right: none !important;
    `,
    expandButton: css`
      margin-right: ${theme.spacing(1)};
    `,
  };
};

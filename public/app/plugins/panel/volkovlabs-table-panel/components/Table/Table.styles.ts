import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';

/**
 * Get Styles
 */
export const getStyles = (theme: GrafanaTheme2) => {
  const borderColor = theme.colors.border.weak;
  const controlBackground = theme.colors.background.secondary;
  const controlBorder = theme.colors.border.medium;
  const controlHoverBackground = theme.colors.action.hover;

  return {
    root: css`
      position: relative;
      display: flex;
      flex-direction: column;
      min-width: 100%;
      width: 100%;
      height: 100%;
      min-height: 0;
      border: 1px solid ${borderColor};
      border-radius: ${theme.shape.radius.default};
      background: ${theme.colors.background.primary};
      scrollbar-gutter: stable;
      overflow: hidden;
    `,
    tableWrapper: css`
      flex: 0 1 auto;
      min-width: 0;
      min-height: 0;
      max-width: 100%;
      overflow: auto;
    `,
    table: css`
      display: grid;
      min-width: 100%;
      border-spacing: 0;
      border-collapse: separate;
      background: ${theme.colors.background.primary};
      color: ${theme.colors.text.primary};
      font-size: ${theme.typography.body.fontSize};
    `,
    header: css`
      border-bottom: 1px solid ${borderColor};
      position: sticky;
      z-index: 100;
      top: 0;
      background-color: ${theme.colors.background.primary};
    `,
    headerRow: css`
      display: flex;
      width: 100%;
      justify-content: space-between;
    `,
    headerCell: css`
      display: flex;
      min-height: 33px;
      align-items: center;
      box-sizing: border-box;
      padding: ${theme.spacing(1, 2)} !important;
      gap: ${theme.spacing(0.5)};
      flex-wrap: nowrap;
      flex: auto;
      overflow: visible;
      white-space: nowrap;
      color: ${theme.colors.text.secondary};
      font-size: ${theme.typography.bodySmall.fontSize};
      font-weight: ${theme.typography.fontWeightMedium};
      background: ${theme.colors.background.primary};
    `,
    sizeLg: css`
      font-size: ${theme.typography.pxToRem(18)};
      min-height: 33px;
      padding: ${theme.spacing(1, 2)} !important;
    `,
    sizeMd: css`
      font-size: ${theme.typography.pxToRem(14)};
      min-height: 33px;
      padding: ${theme.spacing(1, 2)} !important;
    `,
    sizeSm: css`
      font-size: ${theme.typography.pxToRem(12)};
      min-height: 33px;
    `,
    sizeXs: css`
      font-size: ${theme.typography.pxToRem(10)};
      min-height: 33px;
    `,
    body: css`
      display: grid;
      position: relative; //needed for absolute positioning of rows
      background: ${theme.colors.background.primary};
    `,
    footer: css`
      position: sticky;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-top: 1px solid ${borderColor};
      background: ${theme.colors.background.primary};
    `,
    footerRow: css`
      display: flex;
      width: 100%;
      justify-content: space-between;
      background-color: ${theme.colors.background.primary};
    `,
    footerCell: css`
      display: flex;
      min-height: 37px;
      align-items: center;
      box-sizing: border-box;
      padding: ${theme.spacing(1, 2)} !important;
      gap: ${theme.spacing(0.5)};
      flex-wrap: wrap;
      flex: auto;
      color: ${theme.colors.text.secondary};
      background: ${theme.colors.background.primary};
    `,
    paginationRow: css`
      z-index: 200;
      background-color: ${theme.colors.background.primary};
      position: sticky;
      bottom: 0;
      left: 0;
      display: flex;
      justify-content: flex-end;
      width: 100%;
      max-width: 100%;
      padding: ${theme.spacing(1)};
      align-items: center;
      border-top: 1px solid ${borderColor};
      min-height: ${theme.spacing(5.25)};
      box-sizing: border-box;
      overflow-x: hidden;
      overflow-y: hidden;
      border-right: 1px solid ${borderColor};
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    `,
    paginationControl: css`
      display: inline-flex;
      align-items: center;
      min-width: 0;
      height: 36px;
      border-radius: ${theme.shape.radius.default};
      border: 1px solid ${controlBorder};
      background: ${controlBackground};
      overflow: hidden;
    `,
    paginationPageSizeSection: css`
      display: flex;
      align-items: center;
      height: 36px;
      padding: 0 ${theme.spacing(1.5)};
      gap: ${theme.spacing(1)};
    `,
    paginationPageSize: css`
      display: inline-flex;
      align-items: center;
      gap: ${theme.spacing(0.5)};
      height: 24px;
      padding: 0 ${theme.spacing(0.75)};
      border: 0;
      border-radius: ${theme.shape.radius.default};
      background: transparent;
      color: ${theme.colors.text.primary};
      font-size: ${theme.typography.bodySmall.fontSize};
      font-weight: ${theme.typography.fontWeightRegular};
      font-variant-numeric: tabular-nums;
      line-height: 20px;
      cursor: pointer;

      &:hover,
      &[aria-expanded='true'] {
        background: ${controlHoverBackground};
      }
    `,
    paginationDivider: css`
      align-self: stretch;
      width: 1px;
      background: ${controlBorder};
    `,
    paginationNavigation: css`
      display: flex;
      align-items: center;
      height: 36px;
      gap: 2px;
      padding: 0 ${theme.spacing(0.75)};
    `,
    paginationButton: css`
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 0;
      border-radius: ${theme.shape.radius.default};
      background: transparent;
      color: ${theme.colors.text.secondary};
      cursor: pointer;
      transition:
        background-color 150ms ease,
        color 150ms ease;

      &:hover:not(:disabled) {
        background: ${controlHoverBackground};
        color: ${theme.colors.text.primary};
      }

      &:focus-visible {
        outline: 2px solid ${theme.colors.primary.border};
        outline-offset: 1px;
      }

      &:disabled {
        color: ${theme.colors.text.disabled};
        cursor: default;
        pointer-events: none;
      }
    `,
    paginationPageLabel: css`
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 ${theme.spacing(1)};
      color: ${theme.colors.text.secondary};
      font-size: ${theme.typography.bodySmall.fontSize};
      font-variant-numeric: tabular-nums;
      line-height: 20px;
      white-space: nowrap;
      user-select: none;
    `,
    drawerTitle: css`
      padding: ${theme.spacing(2, 2, 0, 2)};
      display: flex;
      gap: ${theme.spacing(2)};
    `,
  };
};

import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';

/**
 * Get Styles
 */
export const getStyles = (theme: GrafanaTheme2) => {
  const borderColor = theme.colors.border.weak;

  return {
    root: css`
      position: relative;
      display: flex;
      flex-direction: column;
      min-width: 100%;
      min-height: 100%;
      border: 1px solid ${borderColor};
      border-radius: ${theme.shape.radius.default};
      background: ${theme.colors.background.primary};
      scrollbar-gutter: stable;
      overflow: hidden;
    `,
    tableWrapper: css`
      min-width: 0;
      max-width: 100%;
      overflow-x: auto;
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
      overflow: hidden;
      text-overflow: ellipsis;
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
      padding: ${theme.spacing(0, 1)};
      gap: ${theme.spacing(1)};
      align-items: center;
      border-top: 1px solid ${borderColor};
      min-height: ${theme.spacing(4.75)};
      box-sizing: border-box;
      overflow-x: hidden;
      overflow-y: hidden;
      margin-top: auto;
      border-right: 1px solid ${borderColor};
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    `,
    pagination: css`
      float: none;
      li {
        margin-bottom: 0;
      }
    `,
    drawerTitle: css`
      padding: ${theme.spacing(2, 2, 0, 2)};
      display: flex;
      gap: ${theme.spacing(2)};
    `,
  };
};

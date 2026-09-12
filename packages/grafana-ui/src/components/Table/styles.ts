import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { TableCellHeight } from '@grafana/schema';

export function useTableStyles(theme: GrafanaTheme2, cellHeightOption: TableCellHeight) {
  const borderColor = theme.colors.border.weak;
  const resizerColor = theme.colors.primary.border;
  const cellPadding = 6;
  const cellPaddingHorizontal = theme.spacing(1.5);
  const cellHeight = getCellHeight(theme, cellHeightOption, cellPadding);
  const rowHeight = cellHeight + 2;
  const headerHeight = 34;

  const buildCellContainerStyle = (
    color?: string,
    background?: string,
    backgroundHover?: string,
    overflowOnHover?: boolean,
    asCellText?: boolean,
    textShouldWrap?: boolean,
    textWrapped?: boolean,
    rowStyled?: boolean,
    rowExpanded?: boolean
  ) => {
    return css({
      label: overflowOnHover ? 'cellContainerOverflow' : 'cellContainerNoOverflow',
      padding: theme.spacing(1, 1.5),
      width: '100%',
      // Cell height need to account for row border
      height: rowExpanded ? 'auto !important' : `${rowHeight - 1}px`,
      wordBreak: textWrapped ? 'break-all' : 'inherit',

      display: 'flex',

      ...(asCellText
        ? {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            userSelect: 'text',
            whiteSpace: 'nowrap',
          }
        : {}),

      alignItems: 'center',
      borderRight: 0,

      color: rowStyled ? 'inherit' : (color ?? undefined),
      background: rowStyled ? undefined : (background ?? undefined),
      backgroundClip: 'padding-box',

      '&:last-child:not(:only-child)': {
        borderRight: 'none',
      },

      '&:hover': {
        overflow: overflowOnHover && !textWrapped ? 'visible' : undefined,
        width: textShouldWrap || !overflowOnHover ? 'auto' : 'auto !important',
        height: (textShouldWrap || overflowOnHover) && !textWrapped ? 'auto !important' : `${rowHeight - 1}px`,
        minHeight: `${rowHeight - 1}px`,
        wordBreak: textShouldWrap ? 'break-word' : undefined,
        whiteSpace: textShouldWrap && overflowOnHover ? 'normal' : 'nowrap',
        //boxShadow: overflowOnHover ? `0 0 2px ${theme.colors.primary.main}` : undefined,
        // background: 'inherit', //: (backgroundHover ?? theme.colors.background.primary),
        zIndex: 1,
        '.cellActions': {
          color: '#FFF',
          visibility: 'visible',
          opacity: 1,
          width: 'auto',
          background: 'rgba(0, 0, 0, 0.6)',
        },
      },

      a: {
        color: 'inherit',
      },

      '.cellActions': {
        display: 'flex',
        position: overflowOnHover ? undefined : 'absolute',
        top: overflowOnHover ? undefined : '1px',
        right: overflowOnHover ? undefined : 0,
        margin: overflowOnHover ? theme.spacing(0, -0.5, 0, 0.5) : 'auto',
        visibility: 'hidden',
        opacity: 0,
        width: 0,
        alignItems: 'center',
        height: '100%',
        padding: theme.spacing(1, 0.5, 1, 1),
        background: background ? 'none' : 'rgba(0, 0, 0, 0.5)',

        svg: {
          color,
        },
      },

      '.cellActionsLeft': {
        right: 'auto !important',
        left: 0,
      },

      '.cellActionsTransparent': {
        background: 'none',
      },
    });
  };

  return {
    theme,
    cellHeight,
    buildCellContainerStyle,
    cellPadding,
    cellHeightInner: cellHeight - cellPadding * 2,
    rowHeight,
    table: css({
      height: '100%',
      width: '100%',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      border: `1px solid ${borderColor}`,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.background.primary,
    }),
    thead: css({
      label: 'thead',
      height: `${headerHeight}px`,
      overflowY: 'auto',
      overflowX: 'hidden',
      position: 'relative',
    }),
    tfoot: css({
      label: 'tfoot',
      height: `${headerHeight}px`,
      borderTop: `1px solid ${borderColor}`,
      background: theme.colors.background.primary,
      overflowY: 'auto',
      overflowX: 'hidden',
      position: 'relative',
    }),
    headerRow: css({
      label: 'row',
      borderBottom: `1px solid ${borderColor}`,
      background: theme.colors.background.primary,
    }),
    headerCell: css({
      height: '100%',
      padding: `0 ${cellPaddingHorizontal}`,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,

      '&:last-child': {
        borderRight: 'none',
      },
    }),
    headerCellLabel: css({
      border: 'none',
      padding: 0,
      background: 'inherit',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      fontWeight: theme.typography.fontWeightMedium,
      color: 'inherit',
      display: 'flex',
      alignItems: 'center',
      marginRight: theme.spacing(0.5),

      '&:hover': {
        textDecoration: 'none',
        color: theme.colors.text.primary,
      },
    }),
    cellContainerText: buildCellContainerStyle(undefined, undefined, undefined, true, true),
    cellContainerTextNoOverflow: buildCellContainerStyle(undefined, undefined, undefined, false, true),

    cellContainer: buildCellContainerStyle(undefined, undefined, undefined, true, false),
    cellContainerNoOverflow: buildCellContainerStyle(undefined, undefined, undefined, false, false),
    cellText: css({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      userSelect: 'text',
      whiteSpace: 'nowrap',
    }),
    sortIcon: css({
      marginLeft: theme.spacing(0.5),
    }),
    cellLink: css({
      cursor: 'pointer',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      userSelect: 'text',
      whiteSpace: 'nowrap',
      color: theme.colors.text.link,
      fontWeight: theme.typography.fontWeightMedium,
      paddingRight: theme.spacing(1.5),
      '&:hover': {
        textDecoration: 'none',
        color: theme.colors.text.primary,
      },
    }),
    cellLinkForColoredCell: css({
      cursor: 'pointer',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      userSelect: 'text',
      whiteSpace: 'nowrap',
      fontWeight: theme.typography.fontWeightMedium,
      textDecoration: 'underline',
    }),
    imageCellLink: css({
      cursor: 'pointer',
      overflow: 'hidden',
      height: '100%',
    }),
    headerFilter: css({
      background: 'transparent',
      border: 'none',
      label: 'headerFilter',
      padding: 0,
    }),
    paginationWrapper: css({
      display: 'flex',
      height: `${cellHeight}px`,
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: theme.spacing(1),
      width: '100%',
      boxSizing: 'border-box',
      padding: theme.spacing(0, 1),
      borderTop: `1px solid ${borderColor}`,
      background: theme.colors.background.primary,
      flexWrap: 'nowrap',
      overflow: 'hidden',
      li: {
        marginBottom: 0,
      },
    }),
    paginationSummary: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: theme.spacing(0, 0.5),
      whiteSpace: 'nowrap',
    }),

    tableContentWrapper: (totalColumnsWidth: number) => {
      const width = totalColumnsWidth !== undefined ? `${totalColumnsWidth}px` : '100%';

      return css({
        label: 'tableContentWrapper',
        width,
        minWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
      });
    },
    row: css({
      label: 'row',
      borderBottom: `1px solid ${borderColor}`,
      background: theme.colors.background.primary,

      '&:hover': {
        backgroundColor: theme.components.table.rowHoverBackground,
      },

      '&:last-child': {
        borderBottom: 0,
      },

      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        transition: 'background-color 100ms ease-out',
      },
    }),
    imageCell: css({
      height: '100%',
    }),
    resizeHandle: css({
      label: 'resizeHandle',
      cursor: 'col-resize !important',
      display: 'inline-block',
      background: resizerColor,
      opacity: 0,
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        transition: 'opacity 0.2s ease-in-out',
      },
      width: '8px',
      height: '100%',
      position: 'absolute',
      right: '-4px',
      borderRadius: theme.shape.radius.default,
      top: 0,
      touchAction: 'none',

      '&:hover': {
        opacity: 1,
      },
    }),
    typeIcon: css({
      marginRight: theme.spacing(1),
      color: theme.colors.text.secondary,
    }),
    noData: css({
      alignItems: 'center',
      display: 'flex',
      height: '100%',
      justifyContent: 'center',
      width: '100%',
    }),
    expanderCell: css({
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      height: `${rowHeight}px`,
      cursor: 'pointer',
    }),
  };
}

export type TableStyles = ReturnType<typeof useTableStyles>;

function getCellHeight(theme: GrafanaTheme2, cellHeightOption: TableCellHeight, cellPadding: number) {
  const bodyFontSize = theme.typography.fontSize;
  const lineHeight = theme.typography.body.lineHeight;

  switch (cellHeightOption) {
    case 'md':
      return 42;
    case 'lg':
      return 48;
    case 'sm':
    default:
      return cellPadding * 2 + bodyFontSize * lineHeight;
  }
}

import { ThemeColors } from './createColors';
import { ThemeShadows } from './createShadows';

/** @beta */
export interface ThemeComponents {
  /** Applies to normal buttons, inputs, radio buttons, etc */
  height: {
    sm: number;
    md: number;
    lg: number;
  };
  input: {
    background: string;
    borderColor: string;
    borderHover: string;
    text: string;
  };
  tooltip: {
    text: string;
    background: string;
  };
  panel: {
    padding: number;
    headerHeight: number;
    borderColor: string;
    boxShadow: string;
    background: string;
  };
  dropdown: {
    background: string;
  };
  overlay: {
    background: string;
  };
  dashboard: {
    background: string;
    padding: number;
  };
  textHighlight: {
    background: string;
    text: string;
  };
  sidemenu: {
    width: number;
  };
  menuTabs: {
    height: number;
  };
  horizontalDrawer: {
    defaultHeight: number;
  };
  table: {
    rowHoverBackground: string;
    rowSelected: string;
  };
}

export function createComponents(colors: ThemeColors, shadows: ThemeShadows): ThemeComponents {
  // Roomier panel chrome (12px gutters, 40px header) so charts breathe the way
  // they do in the Carrot UI / Vercel card language instead of hugging the border.
  const panel = {
    padding: 1.5,
    headerHeight: 5,
    background: colors.background.primary,
    borderColor: colors.border.weak,
    boxShadow: 'none',
  };

  const input = {
    borderColor: colors.border.medium,
    borderHover: colors.border.strong,
    text: colors.text.primary,
    background: colors.mode === 'dark' ? colors.background.canvas : colors.background.primary,
  };

  return {
    height: {
      sm: 3,
      md: 4,
      lg: 6,
    },
    input,
    panel,
    dropdown: {
      background: input.background,
    },
    tooltip: {
      background: colors.background.secondary,
      text: colors.text.primary,
    },
    dashboard: {
      background: colors.background.canvas,
      padding: 1,
    },
    overlay: {
      background: colors.mode === 'dark' ? 'rgba(63, 62, 62, 0.45)' : 'rgba(208, 209, 211, 0.24)',
    },
    sidemenu: {
      width: 57,
    },
    menuTabs: {
      height: 42,
    },
    textHighlight: {
      text: colors.warning.contrastText,
      background: colors.warning.main,
    },
    horizontalDrawer: {
      defaultHeight: 400,
    },
    table: {
      rowHoverBackground: colors.action.hover,
      rowSelected: colors.action.selected,
    },
  };
}

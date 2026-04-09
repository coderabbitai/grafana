import { merge } from 'lodash';

import { alpha, darken, emphasize, getContrastRatio, lighten } from './colorManipulator';
import { palette } from './palette';
import { DeepPartial, ThemeRichColor } from './types';

/** @internal */
export type ThemeColorsMode = 'light' | 'dark';

/** @internal */
export interface ThemeColorsBase<TColor> {
  mode: ThemeColorsMode;

  primary: TColor;
  secondary: TColor;
  info: TColor;
  error: TColor;
  success: TColor;
  warning: TColor;

  text: {
    primary: string;
    secondary: string;
    disabled: string;
    link: string;
    /** Used for auto white or dark text on colored backgrounds */
    maxContrast: string;
  };

  background: {
    /** Dashboard and body background */
    canvas: string;
    /** Primary content pane background (panels etc) */
    primary: string;
    /** Cards and elements that need to stand out on the primary background */
    secondary: string;
  };

  border: {
    weak: string;
    medium: string;
    strong: string;
  };

  gradients: {
    brandVertical: string;
    brandHorizontal: string;
  };

  action: {
    /** Used for selected menu item / select option */
    selected: string;
    /**
     * @alpha (Do not use from plugins)
     * Used for selected items when background only change is not enough (Currently only used for FilterPill)
     **/
    selectedBorder: string;
    /** Used for hovered menu item / select option */
    hover: string;
    /** Used for button/colored background hover opacity */
    hoverOpacity: number;
    /** Used focused menu item / select option */
    focus: string;
    /** Used for disabled buttons and inputs */
    disabledBackground: string;
    /** Disabled text */
    disabledText: string;
    /** Disablerd opacity */
    disabledOpacity: number;
  };

  hoverFactor: number;
  contrastThreshold: number;
  tonalOffset: number;
}

export interface ThemeHoverStrengh {}

/** @beta */
export interface ThemeColors extends ThemeColorsBase<ThemeRichColor> {
  /** Returns a text color for the background */
  getContrastText(background: string, threshold?: number): string;
  /* Brighten or darken a color by specified factor (0-1) */
  emphasize(color: string, amount?: number): string;
}

/** @internal */
export type ThemeColorsInput = DeepPartial<ThemeColorsBase<ThemeRichColor>>;

class DarkColors implements ThemeColorsBase<Partial<ThemeRichColor>> {
  mode: ThemeColorsMode = 'dark';

  whiteBase = '255, 255, 255';

  primary = {
    main: '#F04006',
    border: '#46404F',
    text: '#F5F4F6',
  };

  text = {
    primary: '#F5F4F6',
    secondary: '#D5D3DD',
    disabled: '#D5D3DA',
    link: '#F04006',
    maxContrast: palette.white,
  };

  border = {
    weak: `rgba(${this.whiteBase}, 0.12)`,
    medium: `rgba(${this.whiteBase}, 0.30)`,
    strong: `rgba(${this.whiteBase}, 0.40)`,
  };

  secondary = {
    main: '#F04006',
    shade: '#9E240E',
    contrastText: `rgba(${this.whiteBase},  1)`,
    text: this.text.primary,
    border: this.border.weak,
  };

  info = {
    main: '#51A2FF',
    text: palette.blueDarkText,
  };

  error = {
    main: '#FF6467',
    text: palette.redDarkText,
    border: palette.redDarkText,
  };

  success = {
    main: '#05DF72',
    text: palette.greenDarkText,
  };

  warning = {
    main: '#FDC700',
    text: palette.orangeDarkText,
  };

  background = {
    primary: '#141116',
    canvas: '#141116',
    secondary: '#211E25',
  };

  action = {
    hover: `rgba(${this.whiteBase}, 0.12)`,
    selected: '#F04006',
    selectedBorder: palette.orangeDarkMain,
    hoverOpacity: 0.08,
    focus: `rgba(${this.whiteBase}, 0.12)`,
    disabledBackground: `rgba(${this.whiteBase}, 0.04)`,
    disabledText: this.text.disabled,
    disabledOpacity: 0.38,
  };

  gradients = {
    brandHorizontal: 'linear-gradient(90deg, #FF570A 0%, #F04006 100%)',
    brandVertical: 'linear-gradient(0.01deg, #FF570A -31.2%, #F04006 113.07%)',
  };

  contrastThreshold = 3;

  hoverFactor = 0.03;

  tonalOffset = 0.2;
}

class LightColors implements ThemeColorsBase<Partial<ThemeRichColor>> {
  mode: ThemeColorsMode = 'light';

  blackBase = '45, 51, 62';

  primary = {
    main: '#F04006',
    border: '#D5D3DD',
    text: '#141116',
  };

  text = {
    primary: '#141116',
    secondary: '#3A3441',
    disabled: '#AFACB3',
    link: '#F04006',
    maxContrast: palette.black,
  };

  border = {
    weak: `rgba(${this.blackBase}, 0.12)`,
    medium: `rgba(${this.blackBase}, 0.30)`,
    strong: `rgba(${this.blackBase}, .4)`,
  };

  secondary = {
    main: '#F04006',
    shade: '#FFCFA8',
    contrastText: `rgba(${this.blackBase},  1)`,
    text: this.text.primary,
    border: this.border.weak,
  };

  info = {
    main: '#51A2FF',
    text: palette.blueLightText,
  };

  error = {
    main: '#FF6467',
    text: palette.redLightText,
    border: palette.redLightText,
  };

  success = {
    main: '#05DF72',
    text: palette.greenLightText,
  };

  warning = {
    main: '#FDC700',
    text: palette.orangeLightText,
  };

  background = {
    primary: '#FFFFFF',
    canvas: '#FFFFFF',
    secondary: '#F5F4F6',
  };

  action = {
    hover: `rgba(${this.blackBase}, 0.12)`,
    selected: '#F04006',
    selectedBorder: palette.orangeLightMain,
    hoverOpacity: 0.08,
    focus: `rgba(${this.blackBase}, 0.12)`,
    disabledBackground: `rgba(${this.blackBase}, 0.04)`,
    disabledText: this.text.disabled,
    disabledOpacity: 0.38,
  };

  gradients = {
    brandHorizontal: 'linear-gradient(90deg, #FF570A 0%, #F04006 100%)',
    brandVertical: 'linear-gradient(0.01deg, #FF570A -31.2%, #F04006 113.07%)',
  };

  contrastThreshold = 3;

  hoverFactor = 0.03;

  tonalOffset = 0.2;
}

export function createColors(colors: ThemeColorsInput): ThemeColors {
  const dark = new DarkColors();
  const light = new LightColors();

  const base = (colors.mode ?? 'dark') === 'dark' ? dark : light;

  const {
    primary = base.primary,
    secondary = base.secondary,
    info = base.info,
    warning = base.warning,
    success = base.success,
    error = base.error,
    tonalOffset = base.tonalOffset,
    hoverFactor = base.hoverFactor,
    contrastThreshold = base.contrastThreshold,
    ...other
  } = colors;

  function getContrastText(background: string, threshold: number = contrastThreshold) {
    const contrastText =
      getContrastRatio(dark.text.maxContrast, background, base.background.primary) >= threshold
        ? dark.text.maxContrast
        : light.text.maxContrast;
    // todo, need color framework
    return contrastText;
  }

  const getRichColor = ({ color, name }: GetRichColorProps): ThemeRichColor => {
    color = { ...color, name };
    if (!color.main) {
      throw new Error(`Missing main color for ${name}`);
    }
    if (!color.text) {
      color.text = color.main;
    }
    if (!color.border) {
      color.border = color.text;
    }
    if (!color.shade) {
      color.shade = base.mode === 'light' ? darken(color.main, tonalOffset) : lighten(color.main, tonalOffset);
    }
    if (!color.transparent) {
      color.transparent = alpha(color.main, 0.15);
    }
    if (!color.contrastText) {
      color.contrastText = getContrastText(color.main);
    }
    if (!color.borderTransparent) {
      color.borderTransparent = alpha(color.border, 0.25);
    }
    return color as ThemeRichColor;
  };

  return merge(
    {
      ...base,
      primary: getRichColor({ color: primary, name: 'primary' }),
      secondary: getRichColor({ color: secondary, name: 'secondary' }),
      info: getRichColor({ color: info, name: 'info' }),
      error: getRichColor({ color: error, name: 'error' }),
      success: getRichColor({ color: success, name: 'success' }),
      warning: getRichColor({ color: warning, name: 'warning' }),
      getContrastText,
      emphasize: (color: string, factor?: number) => {
        return emphasize(color, factor ?? hoverFactor);
      },
    },
    other
  );
}

interface GetRichColorProps {
  color: Partial<ThemeRichColor>;
  name: string;
}

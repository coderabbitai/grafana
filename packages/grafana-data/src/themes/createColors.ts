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
    main: '#ff570a',
    border: '#a35829',
    text: '#efedf0',
  };

  text = {
    primary: '#efedf0',
    secondary: '#b5b2b9',
    disabled: '#6f6b75',
    link: '#ffa057',
    maxContrast: palette.white,
  };

  border = {
    weak: '#322f37',
    medium: '#4a464f',
    strong: '#625e68',
  };

  secondary = {
    main: '#ff570a',
    shade: '#a35829',
    contrastText: `rgba(${this.whiteBase},  1)`,
    text: this.text.primary,
    border: this.border.weak,
  };

  info = {
    main: '#687ff5',
    text: '#95afff',
  };

  error = {
    main: '#e54d2e',
    text: '#ff977d',
    border: '#853a2d',
  };

  success = {
    main: '#46e1a5',
    text: '#85f9c5',
  };

  warning = {
    main: '#ffc53d',
    text: '#ffca16',
  };

  background = {
    primary: '#1a181d',
    canvas: '#121014',
    secondary: '#232127',
  };

  action = {
    hover: 'rgba(255, 255, 255, 0.06)',
    selected: '#ff570a',
    selectedBorder: palette.orangeDarkMain,
    hoverOpacity: 0.08,
    focus: `rgba(${this.whiteBase}, 0.12)`,
    disabledBackground: `rgba(${this.whiteBase}, 0.04)`,
    disabledText: this.text.disabled,
    disabledOpacity: 0.38,
  };

  gradients = {
    brandHorizontal: 'linear-gradient(90deg, #ff570a 0%, #ef4f00 100%)',
    brandVertical: 'linear-gradient(0.01deg, #ff570a -31.2%, #ef4f00 113.07%)',
  };

  contrastThreshold = 3;

  hoverFactor = 0.03;

  tonalOffset = 0.2;
}

class LightColors implements ThemeColorsBase<Partial<ThemeRichColor>> {
  mode: ThemeColorsMode = 'light';

  blackBase = '45, 51, 62';

  primary = {
    main: '#ff570a',
    border: '#d0ccd5',
    text: '#211f24',
  };

  text = {
    primary: '#211f24',
    secondary: '#65616a',
    disabled: '#8e8a94',
    link: '#cc4e00',
    maxContrast: palette.black,
  };

  border = {
    weak: '#e3e0e7',
    medium: '#d0ccd5',
    strong: '#bdb9c2',
  };

  secondary = {
    main: '#ff570a',
    shade: '#ffdcc3',
    contrastText: `rgba(${this.blackBase},  1)`,
    text: this.text.primary,
    border: this.border.weak,
  };

  info = {
    main: '#687ff5',
    text: '#4354c8',
  };

  error = {
    main: '#dd4425',
    text: '#d13415',
    border: '#d13415',
  };

  success = {
    main: '#46e1a5',
    text: '#00885b',
  };

  warning = {
    main: '#ffc53d',
    text: '#ab6400',
  };

  background = {
    primary: '#faf8fb',
    canvas: '#e9e7ed',
    secondary: '#fdfdfe',
  };

  action = {
    hover: 'rgba(0, 0, 0, 0.06)',
    selected: '#ff570a',
    selectedBorder: palette.orangeLightMain,
    hoverOpacity: 0.08,
    focus: `rgba(${this.blackBase}, 0.12)`,
    disabledBackground: `rgba(${this.blackBase}, 0.04)`,
    disabledText: this.text.disabled,
    disabledOpacity: 0.38,
  };

  gradients = {
    brandHorizontal: 'linear-gradient(90deg, #ff570a 0%, #ef4f00 100%)',
    brandVertical: 'linear-gradient(0.01deg, #ff570a -31.2%, #ef4f00 113.07%)',
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

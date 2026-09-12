// Code based on Material UI
// The MIT License (MIT)
// Copyright (c) 2014 Call-Em-All

import { ThemeColors } from './createColors';

/** @beta */
export interface ThemeTypography extends ThemeTypographyVariantTypes {
  fontFamily: string;
  fontFamilyMonospace: string;
  fontSize: number;
  fontWeightLight: number;
  fontWeightRegular: number;
  fontWeightMedium: number;
  fontWeightBold: number;

  // The font-size on the html element.
  htmlFontSize?: number;

  /**
   * @deprecated
   * from legacy old theme
   * */
  size: {
    base: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
  };

  pxToRem: (px: number) => string;
}

export interface ThemeTypographyVariant {
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  fontFamily: string;
  letterSpacing?: string;
}

export interface ThemeTypographyInput {
  fontFamily?: string;
  fontFamilyMonospace?: string;
  fontSize?: number;
  fontWeightLight?: number;
  fontWeightRegular?: number;
  fontWeightMedium?: number;
  fontWeightBold?: number;
  // hat's the font-size on the html element.
  // 16px is the default font-size used by browsers.
  htmlFontSize?: number;
}

// Carrot UI font stacks. Sans uses Geist Variable with system-ui fallbacks; mono uses
// Hack with ui-monospace fallbacks. These match the --font-cui-sans / --font-cui-mono
// custom properties published by the Carrot UI design system.
const defaultFontFamily =
  '"Geist Variable", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
const defaultFontFamilyMonospace =
  '"Hack", ui-monospace, "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace';

export function createTypography(colors: ThemeColors, typographyInput: ThemeTypographyInput = {}): ThemeTypography {
  const {
    fontFamily = defaultFontFamily,
    fontFamilyMonospace = defaultFontFamilyMonospace,
    // The default font size of the Material Specification.
    fontSize = 14, // px
    // Geist/Vercel-style weight ramp. The previous 200/300/400/500 ramp rendered
    // body copy as Light, which looked washed out against the Carrot UI palette.
    fontWeightLight = 300,
    fontWeightRegular = 400,
    fontWeightMedium = 500,
    fontWeightBold = 600,
    // Tell Grafana-UI what's the font-size on the html element.
    // 16px is the default font-size used by browsers.
    htmlFontSize = 16,
  } = typographyInput;

  if (process.env.NODE_ENV !== 'production') {
    if (typeof fontSize !== 'number') {
      console.error('Grafana-UI: `fontSize` is required to be a number.');
    }

    if (typeof htmlFontSize !== 'number') {
      console.error('Grafana-UI: `htmlFontSize` is required to be a number.');
    }
  }

  const coef = fontSize / 14;
  const pxToRem = (size: number) => `${(size / htmlFontSize) * coef}rem`;
  const buildVariant = (
    fontWeight: number,
    size: number,
    lineHeight: number,
    letterSpacing: number,
    casing?: object
  ): ThemeTypographyVariant => {
    if (lineHeight % 2 !== 0 || size % 2 !== 0) {
      throw new Error('Font size and line height should be integer multiples of 2 to prevent issues with alignment');
    }

    return {
      fontFamily,
      fontWeight,
      fontSize: pxToRem(size),
      lineHeight: lineHeight / size,
      ...(fontFamily === defaultFontFamily ? { letterSpacing: `${round(letterSpacing / size)}em` } : {}),
      ...casing,
    };
  };

  // All our fonts/line heights should be integer multiples of 2 to prevent issues with alignment
  const variants = {
    // Headings use negative tracking (Vercel/Geist convention) and a heavier weight
    // so panel titles and section headers read as deliberate UI chrome.
    h1: buildVariant(fontWeightBold, 28, 32, -0.6),
    h2: buildVariant(fontWeightBold, 24, 28, -0.5),
    h3: buildVariant(fontWeightMedium, 22, 24, -0.4),
    h4: buildVariant(fontWeightMedium, 18, 22, -0.3),
    h5: buildVariant(fontWeightMedium, 16, 22, -0.2),
    h6: buildVariant(fontWeightMedium, 14, 22, -0.1),
    body: buildVariant(fontWeightRegular, fontSize, 22, 0),
    bodySmall: buildVariant(fontWeightRegular, 12, 18, 0),
    code: { ...buildVariant(fontWeightRegular, 14, 16, 0.15), fontFamily: fontFamilyMonospace },
  };

  const size = {
    base: '14px',
    xs: '10px',
    sm: '12px',
    md: '14px',
    lg: '18px',
  };

  return {
    htmlFontSize,
    pxToRem,
    fontFamily,
    fontFamilyMonospace,
    fontSize,
    fontWeightLight,
    fontWeightRegular,
    fontWeightMedium,
    fontWeightBold,
    size,
    ...variants,
  };
}

function round(value: number) {
  return Math.round(value * 1e5) / 1e5;
}

export interface ThemeTypographyVariantTypes {
  h1: ThemeTypographyVariant;
  h2: ThemeTypographyVariant;
  h3: ThemeTypographyVariant;
  h4: ThemeTypographyVariant;
  h5: ThemeTypographyVariant;
  h6: ThemeTypographyVariant;
  body: ThemeTypographyVariant;
  bodySmall: ThemeTypographyVariant;
  code: ThemeTypographyVariant;
}

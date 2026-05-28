import { ThemeColors } from './createColors';

/** @beta */
export interface ThemeShadows {
  z1: string;
  z2: string;
  z3: string;
}

/** @alpha */
export function createShadows(colors: ThemeColors): ThemeShadows {
  // Shadow base colours are derived from the canvas background of each mode so
  // they harmonise with the mauve-tinted Carrot palette instead of using raw black.
  // Dark canvas #121014 → rgb(18, 16, 20)  |  Light text.primary #211f24 → rgb(33, 31, 36)
  if (colors.mode === 'dark') {
    return {
      z1: '0px 1px 2px rgba(18, 16, 20, 0.8)',
      z2: '0px 4px 8px rgba(18, 16, 20, 0.75)',
      z3: '0px 8px 24px rgba(18, 16, 20, 0.9)',
    };
  }

  return {
    z1: '0px 1px 2px rgba(33, 31, 36, 0.12)',
    z2: '0px 4px 8px rgba(33, 31, 36, 0.15)',
    z3: '0px 13px 20px 1px rgba(33, 31, 36, 0.12)',
  };
}

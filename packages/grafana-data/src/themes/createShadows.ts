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
  // Layered, low-opacity elevation in the Vercel/Geist style: a hairline contact
  // shadow stacked with a wider ambient shadow instead of one heavy blur.
  if (colors.mode === 'dark') {
    return {
      z1: '0px 1px 2px rgba(0, 0, 0, 0.45)',
      z2: '0px 2px 4px rgba(0, 0, 0, 0.35), 0px 8px 16px rgba(0, 0, 0, 0.4)',
      z3: '0px 4px 8px rgba(0, 0, 0, 0.4), 0px 16px 32px rgba(0, 0, 0, 0.5)',
    };
  }

  return {
    z1: '0px 1px 2px rgba(33, 31, 36, 0.06)',
    z2: '0px 1px 2px rgba(33, 31, 36, 0.06), 0px 4px 12px rgba(33, 31, 36, 0.08)',
    z3: '0px 2px 4px rgba(33, 31, 36, 0.06), 0px 12px 32px rgba(33, 31, 36, 0.12)',
  };
}

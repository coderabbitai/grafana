import { Global, CSSObject, css } from '@emotion/react';

import { useTheme2 } from '../ThemeContext';

import { getAccessibilityStyles } from './accessibility';
import { getAlertingStyles } from './alerting';
import { getAgularPanelStyles } from './angularPanelStyles';
import { getCardStyles } from './card';
import { getCodeStyles } from './code';
import { getDashboardGridStyles } from './dashboardGrid';
import { getDashDiffStyles } from './dashdiff';
import { getElementStyles } from './elements';
import { getExtraStyles } from './extra';
import { getFilterTableStyles } from './filterTable';
import { getFontStyles } from './fonts';
import { getFormElementStyles } from './forms';
import { getJsonFormatterStyles } from './jsonFormatter';
import { getLegacySelectStyles } from './legacySelect';
import { getMarkdownStyles } from './markdownStyles';
import { getPageStyles } from './page';
import { getQueryEditorStyles } from './queryEditor';
import { getRcTimePickerStyles } from './rcTimePicker';
import { getSkeletonStyles } from './skeletonStyles';
import { getSlateStyles } from './slate';
import { getUplotStyles } from './uPlot';
import { getUtilityClassStyles } from './utilityClasses';

interface GlobalStylesProps {
  prefix?: string;
}

/** @internal */
export function GlobalStyles(props: GlobalStylesProps) {
  const theme = useTheme2();

  const styles = [
    getAccessibilityStyles(theme),
    getAgularPanelStyles(theme),
    getAlertingStyles(theme),
    getCodeStyles(theme),
    getDashDiffStyles(theme),
    getDashboardGridStyles(theme),
    getElementStyles(theme),
    getExtraStyles(theme),
    getFilterTableStyles(theme),
    getFontStyles(theme),
    getFormElementStyles(theme),
    getJsonFormatterStyles(theme),
    getCardStyles(theme),
    getMarkdownStyles(theme),
    getPageStyles(theme),
    getQueryEditorStyles(theme),
    getRcTimePickerStyles(theme),
    getSkeletonStyles(theme),
    getSlateStyles(theme),
    getUplotStyles(theme),
    getUtilityClassStyles(theme),
    getLegacySelectStyles(theme),
  ].map((styles) => addPrefixFunc(styles, props.prefix));

  const additionalStyles = props.prefix
    ? css({
        [`${props.prefix}`]: {
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
          lineHeight: theme.typography.body.lineHeight,
          height: '100%',
          minHeight: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
          margin: 0,
        },
        [`${props.prefix} *, ${props.prefix} *::before, ${props.prefix} *::after`]: {
          boxSizing: 'inherit',
        },

        [`${props.prefix} input`]: {
          border: theme.components.input.borderColor,
        },
      })
    : undefined;

  if (additionalStyles) {
    styles.push(additionalStyles);
  }

  return <Global styles={styles} />;
}

function addPrefixFunc(styles: CSSObject | CSSObject[], prefix?: string) {
  if (prefix) {
    return css(addPrefixToStyles(prefix, styles));
  }
  return css(styles);
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function prefixSelectorList(prefix: string, selectorList: string) {
  return selectorList
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((sel) => {
      if (!prefix) {
        return sel;
      }

      // ⛔️ Do NOT rewrite these to prefix (it breaks Grafana layout + typography)
      // Also don't emit them at all, to avoid leaking into host.
      if (sel === 'html' || sel === 'body' || sel === ':root' || ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(sel)) {
        return ''; // skip
      }

      if (sel.startsWith(prefix)) {
        return sel;
      }
      return `${prefix} ${sel}`;
    })
    .filter(Boolean)
    .join(', ');
}

// Keys that are definitely selectors (not CSS properties)
function looksLikeSelector(key: string) {
  return (
    key.startsWith('&') ||
    key.startsWith('.') ||
    key.startsWith('#') ||
    key.startsWith('>') ||
    key.startsWith('+') ||
    key.startsWith('~') ||
    key.startsWith(':') ||
    key.startsWith('[') ||
    key.includes(' ') ||
    key.includes(',') ||
    key.includes('::') ||
    key.includes(':') // catches things like "a:hover" (at top-level too)
  );
}

const NO_SCOPE_AT_RULES = new Set(['@font-face']);
function isKeyframesRule(key: string) {
  return key.startsWith('@keyframes');
}

/**
 * Prefix selectors where needed without breaking declaration blocks.
 * - Top-level: treat keys as selectors/at-rules.
 * - Nested inside selector blocks: only prefix keys that look like selectors.
 */
export function addPrefixToStyles(prefix: string, styles: CSSObject | CSSObject[]): CSSObject {
  if (Array.isArray(styles)) {
    return styles.reduce<CSSObject>((acc, s) => Object.assign(acc, addPrefixToStyles(prefix, s)), {});
  }

  const out: CSSObject = {};

  for (const [key, value] of Object.entries(styles)) {
    // ---- At-rules at this level ----
    if (key.startsWith('@')) {
      // Never scope these (fonts & animations must remain global definitions)
      if (NO_SCOPE_AT_RULES.has(key) || isKeyframesRule(key)) {
        out[key] = value as any;
        continue;
      }

      // @media/@supports: value is another rules map (selectors -> blocks)
      out[key] = isPlainObject(value) ? addPrefixToStyles(prefix, value as CSSObject) : (value as any);
      continue;
    }

    // ---- This level: key is a selector (Global styles map) ----
    const prefixedKey = prefixSelectorList(prefix, key);
    if (!prefixedKey) {
      continue; // html/body/:root were skipped
    }

    // If value is a declarations block, we must NOT treat its keys as selectors,
    // except for nested selectors / nested @rules.
    if (!isPlainObject(value)) {
      out[prefixedKey] = value as any;
      continue;
    }

    const decls = value as CSSObject;
    const nextDecls: CSSObject = {};

    for (const [dk, dv] of Object.entries(decls)) {
      // nested @media etc inside a selector block → declarations block inside
      if (dk.startsWith('@')) {
        if (NO_SCOPE_AT_RULES.has(dk) || isKeyframesRule(dk)) {
          nextDecls[dk] = dv as any;
        } else {
          nextDecls[dk] = isPlainObject(dv) ? addPrefixToStyles(prefix, dv as CSSObject) : (dv as any);
        }
        continue;
      }

      // nested selector inside selector block
      if (looksLikeSelector(dk)) {
        // IMPORTANT:
        // Do NOT add the global prefix here. The parent selector is already prefixed.
        // Keep nested selectors relative to parent.
        nextDecls[dk] = isPlainObject(dv) ? addPrefixToStyles('', dv as CSSObject) : (dv as any);
        continue;
      }

      // plain CSS property → keep untouched
      nextDecls[dk] = dv as any;
    }

    out[prefixedKey] = nextDecls;
  }

  return out;
}

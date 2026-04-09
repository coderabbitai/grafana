import { css, cx } from '@emotion/css';
import * as React from 'react';
import SVG from 'react-inlinesvg';

import { GrafanaTheme2, isIconName } from '@grafana/data';

import { useStyles2 } from '../../themes/ThemeContext';
import { IconName, IconType, IconSize } from '../../types/icon';
import { spin } from '../../utils/keyframes';

import { getIconRoot, getIconSubDir, getSvgSize } from './utils';

export interface IconProps extends Omit<React.SVGProps<SVGElement>, 'onLoad' | 'onError' | 'ref'> {
  name: IconName;
  size?: IconSize;
  type?: IconType;
  /**
   * Give your icon a semantic meaning. The icon will be hidden from screen readers, unless this prop or an aria-label is provided.
   */
  title?: string;
}

const getIconStyles = (theme: GrafanaTheme2) => {
  return {
    icon: css({
      display: 'inline-block',
      fill: 'currentColor',
      flexShrink: 0,
      label: 'Icon',
      // line-height: 0; is needed for correct icon alignment in Safari
      lineHeight: 0,
      verticalAlign: 'middle',
    }),
    orange: css({
      fill: theme.v1.palette.orange,
    }),
    spin: css({
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animation: `${spin} 2s infinite linear`,
      },
    }),
  };
};

const cachedIcon = new Map<string, string>();
export const Icon = React.forwardRef<SVGElement, IconProps>(
  ({ size = 'md', type = 'default', name, className, style, title = '', ...rest }, ref) => {
    const styles = useStyles2(getIconStyles);

    if (!isIconName(name)) {
      console.warn('Icon component passed an invalid icon name', name);
    }

    // handle the deprecated 'fa fa-spinner'
    const iconName: IconName = name === 'fa fa-spinner' ? 'spinner' : name;

    const iconRoot = getIconRoot();
    const svgSize = getSvgSize(size);
    const svgHgt = svgSize;
    const svgWid = name.startsWith('gf-bar-align') ? 16 : name.startsWith('gf-interp') ? 30 : svgSize;
    const subDir = getIconSubDir(iconName, type);
    const [svgPath, setSvgPath] = React.useState<string | null | undefined>(null);

    React.useEffect(() => {
      const iconPath = `${iconRoot}${subDir}/${iconName}.svg`;
      if (cachedIcon.has(iconPath)) {
        setSvgPath(cachedIcon.get(iconPath));
        return;
      }
      /**
       * For microfrontend, all the Grafana routes are behind the proxy, so we need to fetch the icon from the proxy.
       * When we use fetch request get intercepted and url is changed to the proxy url.
       */
      fetch(iconPath).then(async (response) => {
        if (response.ok) {
          const icon = await response.text();
          cachedIcon.set(iconPath, icon);
          setSvgPath(icon);
        } else {
          console.error(`Icon ${iconName} not found`);
        }
      });
    }, [iconName, iconRoot, subDir]);

    const composedClassName = cx(
      styles.icon,
      className,
      type === 'mono' ? { [styles.orange]: name === 'favorite' } : '',
      {
        [styles.spin]: iconName === 'spinner',
      }
    );

    return (
      <>
        {svgPath && (
          <SVG
            aria-hidden={
              rest.tabIndex === undefined &&
              !title &&
              !rest['aria-label'] &&
              !rest['aria-labelledby'] &&
              !rest['aria-describedby']
            }
            innerRef={ref}
            src={svgPath}
            width={svgWid}
            height={svgHgt}
            title={title}
            className={composedClassName}
            style={style}
            {...rest}
          />
        )}
      </>
    );
  }
);

Icon.displayName = 'Icon';

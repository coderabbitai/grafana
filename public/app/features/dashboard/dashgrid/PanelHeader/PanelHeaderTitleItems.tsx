import { css, cx } from '@emotion/css';

import { PanelData, GrafanaTheme2, PanelModel, LinkModel, AlertState, DataLink } from '@grafana/data';
import { Icon, PanelChrome, Tooltip, useStyles2, TimePickerTooltip } from '@grafana/ui';

import { PanelLinks } from '../PanelLinks';

import { PanelHeaderNotices } from './PanelHeaderNotices';

export interface AngularNotice {
  show: boolean;
  isAngularPanel: boolean;
  isAngularDatasource: boolean;
}

export interface Props {
  alertState?: string;
  data: PanelData;
  panelId: number;
  /**
   * Set only when the embedding host has opted into panel editing. Rendering the
   * affordance is driven entirely by this callback's presence.
   */
  onEditPanel?: () => void;
  onShowPanelLinks?: () => Array<LinkModel<PanelModel>>;
  panelLinks?: DataLink[];
  angularNotice?: AngularNotice;
}

export function PanelHeaderTitleItems(props: Props) {
  const { alertState, data, panelId, onEditPanel, onShowPanelLinks, panelLinks, angularNotice } = props;
  const styles = useStyles2(getStyles);

  const editItem = (
    <Tooltip content="Edit panel">
      <PanelChrome.TitleItem
        className={styles.editPanel}
        data-testid="fn-edit-panel"
        aria-label="Edit panel"
        onClick={(e) => {
          // The header doubles as the drag handle, so keep the click local.
          e.preventDefault();
          e.stopPropagation();
          onEditPanel?.();
        }}
      >
        <Icon name="pen" size="md" />
      </PanelChrome.TitleItem>
    </Tooltip>
  );

  // panel health
  const alertStateItem = (
    <Tooltip content={alertState ?? 'unknown'}>
      <PanelChrome.TitleItem
        className={cx({
          [styles.ok]: alertState === AlertState.OK,
          [styles.pending]: alertState === AlertState.Pending,
          [styles.alerting]: alertState === AlertState.Alerting,
        })}
      >
        <Icon name={alertState === 'alerting' ? 'heart-break' : 'heart'} size="md" />
      </PanelChrome.TitleItem>
    </Tooltip>
  );

  const timeshift = (
    <>
      {data.request && data.request.timeInfo && (
        <Tooltip content={<TimePickerTooltip timeRange={data.request?.range} timeZone={data.request?.timezone} />}>
          <PanelChrome.TitleItem className={styles.timeshift}>
            <Icon name="clock-nine" size="md" /> {data.request?.timeInfo}
          </PanelChrome.TitleItem>
        </Tooltip>
      )}
    </>
  );

  const message = `This ${pluginType(angularNotice)} requires Angular (deprecated).`;
  const angularNoticeTooltip = (
    <Tooltip content={message}>
      <PanelChrome.TitleItem className={styles.angularNotice} data-testid="angular-deprecation-icon">
        <Icon name="exclamation-triangle" size="md" />
      </PanelChrome.TitleItem>
    </Tooltip>
  );

  return (
    <>
      {panelLinks && panelLinks.length > 0 && onShowPanelLinks && (
        <PanelLinks onShowPanelLinks={onShowPanelLinks} panelLinks={panelLinks} />
      )}

      {<PanelHeaderNotices panelId={panelId} frames={data.series} />}
      {timeshift}
      {alertState && alertStateItem}
      {angularNotice?.show && angularNoticeTooltip}
      {onEditPanel && editItem}
    </>
  );
}

const pluginType = (angularNotice?: AngularNotice): string => {
  if (angularNotice?.isAngularPanel) {
    return 'panel';
  }
  if (angularNotice?.isAngularDatasource) {
    return 'data source';
  }
  return 'panel or data source';
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    ok: css({
      color: theme.colors.success.text,
      '&:hover': {
        color: theme.colors.emphasize(theme.colors.success.text, 0.03),
      },
    }),
    pending: css({
      color: theme.colors.warning.text,
      '&:hover': {
        color: theme.colors.emphasize(theme.colors.warning.text, 0.03),
      },
    }),
    alerting: css({
      color: theme.colors.error.text,
      '&:hover': {
        color: theme.colors.emphasize(theme.colors.error.text, 0.03),
      },
    }),
    timeshift: css({
      color: theme.colors.text.link,
      gap: theme.spacing(0.5),
      whiteSpace: 'nowrap',

      '&:hover': {
        color: theme.colors.emphasize(theme.colors.text.link, 0.03),
      },
    }),
    angularNotice: css({
      color: theme.colors.warning.text,
    }),
    editPanel: css({
      color: theme.colors.text.secondary,
      cursor: 'pointer',
      '&:hover': {
        color: theme.colors.text.primary,
      },
    }),
  };
};

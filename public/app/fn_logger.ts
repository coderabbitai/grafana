import log from 'loglevel';

const SHOULD_LOG = window.location.hostname === 'localhost';

const FnLoggerService = log.getLogger('[FN Grafana]');

FnLoggerService.setLevel(SHOULD_LOG ? log.levels.DEBUG : log.levels.ERROR);

export { FnLoggerService };

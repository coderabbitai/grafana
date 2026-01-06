import log from 'loglevel';

const SHOULD_LOG = false;

const FnLoggerService = log.getLogger('[FN Grafana]');

FnLoggerService.setLevel(SHOULD_LOG ? log.levels.DEBUG : log.levels.ERROR);

export { FnLoggerService };

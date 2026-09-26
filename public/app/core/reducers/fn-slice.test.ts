import { fnStateProps, INITIAL_FN_STATE } from './fn-slice';

describe('fn-slice', () => {
  it('includes the host portal container id in copied microfrontend state props', () => {
    expect(fnStateProps).toContain('portalContainerID');
  });

  it('copies the explicit panel preload opt-in and leaves it disabled by default', () => {
    expect(fnStateProps).toContain('preloadPanels');
    expect(INITIAL_FN_STATE.preloadPanels).toBe(false);
  });
});

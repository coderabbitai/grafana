import { fnStateProps } from './fn-slice';

describe('fn-slice', () => {
  it('includes the host portal container id in copied microfrontend state props', () => {
    expect(fnStateProps).toContain('portalContainerID');
  });
});

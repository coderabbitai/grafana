import { act, render, screen } from '@testing-library/react';

import { LazyLoader } from './LazyLoader';

describe('LazyLoader preload', () => {
  beforeEach(() => {
    jest.spyOn(LazyLoader.observer, 'observe').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('accepts a later host opt-in without repeating the load or losing visibility', () => {
    const onLoad = jest.fn();
    const child = ({ isInView }: { isInView: boolean }) => <span>{isInView ? 'visible' : 'off-screen'}</span>;
    const { rerender } = render(<LazyLoader onLoad={onLoad}>{child}</LazyLoader>);
    expect(onLoad).not.toHaveBeenCalled();
    rerender(
      <LazyLoader onLoad={onLoad} preload>
        {child}
      </LazyLoader>
    );
    expect(screen.getByText('off-screen')).toBeInTheDocument();
    expect(onLoad).toHaveBeenCalledTimes(1);
    rerender(
      <LazyLoader onLoad={onLoad} preload={false}>
        {child}
      </LazyLoader>
    );
    rerender(
      <LazyLoader onLoad={onLoad} preload>
        {child}
      </LazyLoader>
    );
    expect(screen.getByText('off-screen')).toBeInTheDocument();
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('keeps actual visibility and loads only once with preload=%s', (preload) => {
    const onLoad = jest.fn();
    const onChange = jest.fn();
    const unobserve = jest.spyOn(LazyLoader.observer, 'unobserve');
    const { container, unmount } = render(
      <LazyLoader preload={preload} onLoad={onLoad} onChange={onChange}>
        {({ isInView }) => <span>{isInView ? 'visible panel' : 'off-screen panel'}</span>}
      </LazyLoader>
    );
    expect(onLoad).toHaveBeenCalledTimes(preload ? 1 : 0);
    expect(screen.queryByText('off-screen panel') !== null).toBe(preload);
    const element = container.firstElementChild!;
    const changeVisibility = (isIntersecting: boolean) => {
      act(() => LazyLoader.callbacks[element.id]({ target: element, isIntersecting } as IntersectionObserverEntry));
    };
    changeVisibility(true);
    expect(screen.getByText('visible panel')).toBeInTheDocument();
    changeVisibility(false);
    expect(screen.getByText('off-screen panel')).toBeInTheDocument();
    changeVisibility(true);
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls).toEqual([[true], [false], [true]]);
    unmount();
    expect(unobserve).toHaveBeenCalledWith(element);
    expect(LazyLoader.callbacks[element.id]).toBeUndefined();
  });
});

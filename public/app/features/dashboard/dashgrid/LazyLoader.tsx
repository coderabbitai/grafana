import { useEffect, useId, useRef, useState } from 'react';
import { useEffectOnce } from 'react-use';

export interface Props {
  children: React.ReactNode | (({ isInView }: { isInView: boolean }) => React.ReactNode);
  width?: number;
  height?: number;
  onLoad?: () => void;
  onChange?: (isInView: boolean) => void;
  /** Mount initially, while retaining actual viewport visibility for refreshes. */
  preload?: boolean;
}

export function LazyLoader({ children, width, height, onLoad, onChange, preload = false }: Props) {
  const id = useId();
  const [loaded, setLoaded] = useState(false);
  const hasLoaded = useRef(false);
  const [isInView, setIsInView] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffectOnce(() => {
    LazyLoader.addCallback(id, (entry) => {
      if (!hasLoaded.current && entry.isIntersecting) {
        hasLoaded.current = true;
        setLoaded(true);
        onLoad?.();
      }

      setIsInView(entry.isIntersecting);
      onChange?.(entry.isIntersecting);
    });

    const wrapperEl = wrapperRef.current;

    if (wrapperEl) {
      LazyLoader.observer.observe(wrapperEl);
    }

    return () => {
      delete LazyLoader.callbacks[id];
      wrapperEl && LazyLoader.observer.unobserve(wrapperEl);
      if (Object.keys(LazyLoader.callbacks).length === 0) {
        LazyLoader.observer.disconnect();
      }
    };
  });

  useEffect(() => {
    // Host settings may reach an existing dashboard store after its first render.
    // Do not remount or reload panels that already entered the viewport.
    if (preload && !hasLoaded.current) {
      hasLoaded.current = true;
      setLoaded(true);
      onLoad?.();
    }
  }, [preload, onLoad]);

  return (
    <div id={id} ref={wrapperRef} style={{ width, height }}>
      {loaded && (typeof children === 'function' ? children({ isInView }) : children)}
    </div>
  );
}

const callbacks: Record<string, (e: IntersectionObserverEntry) => void> = {};
LazyLoader.callbacks = callbacks;
LazyLoader.addCallback = (id: string, c: (e: IntersectionObserverEntry) => void) => (LazyLoader.callbacks[id] = c);
LazyLoader.observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (LazyLoader.callbacks[entry.target.id]) {
        LazyLoader.callbacks[entry.target.id](entry);
      }
    }
  },
  { rootMargin: '100px' }
);

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Top-of-viewport progress bar that animates on every route change. Inspired
 * by the "zoom progress" UI on brainit.es — a tiny visual handshake that
 * makes navigations feel intentional. No deps; pure transform animation.
 *
 * Strategy: when `pathname` changes (= navigation completed), pulse the bar
 * from 0 → 100% over ~500 ms, then fade out. We don't try to track real
 * loading progress (Next pre-renders most route trees on the server, so the
 * meaningful work is data fetching inside client components which we can't
 * generically observe).
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const lastPath = useRef(pathname);
  const timersRef = useRef(/** @type {ReturnType<typeof setTimeout>[]} */ ([]));

  useEffect(() => {
    if (lastPath.current === pathname) return undefined;
    lastPath.current = pathname;

    // Cancel any in-flight pulse from the previous navigation.
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // 0 → 80% over 380 ms (the "racing ahead" feel), then 100% to settle.
    setProgress(0);
    setOpacity(1);
    const t1 = setTimeout(() => setProgress(80), 16);
    const t2 = setTimeout(() => setProgress(100), 420);
    const t3 = setTimeout(() => setOpacity(0), 620);
    const t4 = setTimeout(() => setProgress(0), 900);
    timersRef.current = [t1, t2, t3, t4];

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [pathname]);

  return (
    <div
      className="route-progress"
      style={{
        transform: `scaleX(${progress / 100})`,
        opacity,
      }}
      aria-hidden
    />
  );
}

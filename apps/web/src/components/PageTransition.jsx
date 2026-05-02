'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Smooth dissolve between routes.
 *
 * A full-viewport overlay fades in using the page's own background color
 * (white in light mode, dark navy in dark mode), briefly blanks the swap,
 * then fades back out as the new page's entrance animation runs.
 *
 * Using the background color means zero visual "color intrusion" — it
 * reads as a natural breath between pages, not a branded wipe.
 *
 * Total cycle ≈ 300ms. Respects prefers-reduced-motion.
 */
export default function PageTransition() {
  const pathname = usePathname();
  const overlayRef = useRef(null);
  const lastPath = useRef(pathname);
  const tlRef = useRef(null);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    (async () => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const { gsap } = await import('gsap');
      const el = overlayRef.current;
      if (!el) return;

      tlRef.current?.kill();

      tlRef.current = gsap
        .timeline()
        // Snap to fully opaque instantly (masks the old-content disappearance)
        .set(el, { opacity: 1, pointerEvents: 'auto' })
        // Fade out gently as the new page's entrance animation begins
        .to(el, { opacity: 0, duration: 0.28, ease: 'power1.inOut', delay: 0.04 })
        .set(el, { pointerEvents: 'none' });
    })();

    return () => {
      tlRef.current?.kill();
    };
  }, [pathname]);

  return (
    <div
      ref={overlayRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        backgroundColor: 'var(--color-background)',
        pointerEvents: 'none',
        opacity: 0,
      }}
    />
  );
}

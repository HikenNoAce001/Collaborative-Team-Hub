'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Page transition overlay with a mini hopping bunny.
 *
 * On every route change: the overlay snaps to opaque (covering the old
 * page's disappearance), a small bunny hops once, then the overlay fades
 * out as the new page slides in.
 *
 * Total cycle ≈ 620ms. Respects prefers-reduced-motion (just a fast fade).
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

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const { gsap } = await import('gsap');
      const el = overlayRef.current;
      if (!el) return;

      tlRef.current?.kill();

      if (reduced) {
        tlRef.current = gsap.timeline()
          .set(el, { opacity: 1, pointerEvents: 'auto' })
          .to(el, { opacity: 0, duration: 0.18, ease: 'power1.out', delay: 0.02 })
          .set(el, { pointerEvents: 'none' });
      } else {
        tlRef.current = gsap.timeline()
          // Snap opaque so the old content's removal is invisible
          .set(el, { opacity: 1, pointerEvents: 'auto' })
          // Hold while the bunny hops, then fade as the new page slides in
          .to(el, { opacity: 0, duration: 0.22, ease: 'power1.inOut', delay: 0.42 })
          .set(el, { pointerEvents: 'none' });
      }
    })();

    return () => { tlRef.current?.kill(); };
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
      }}
    >
      {/* Mini bunny — same SVG as the preloader, smaller scale */}
      <div className="nav-bunny-hop">
        <svg
          width="40"
          height="50"
          viewBox="0 0 56 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ color: 'var(--color-primary)' }}
        >
          <rect className="bunny-ear-l" x="8" y="0" width="10" height="28" rx="5" fill="currentColor" />
          <rect x="10.5" y="3" width="5" height="20" rx="2.5" fill="#fca5a5" opacity="0.75" />
          <rect className="bunny-ear-r" x="24" y="0" width="10" height="28" rx="5" fill="currentColor" />
          <rect x="26.5" y="3" width="5" height="20" rx="2.5" fill="#fca5a5" opacity="0.75" />
          <circle cx="27" cy="36" r="16" fill="currentColor" />
          <ellipse cx="27" cy="57" rx="17" ry="14" fill="currentColor" />
          <ellipse cx="27" cy="58" rx="10" ry="9" fill="white" opacity="0.22" />
          <circle cx="22" cy="34" r="3" fill="white" />
          <circle cx="32" cy="34" r="3" fill="white" />
          <circle cx="23" cy="35" r="1.5" fill="#111827" />
          <circle cx="33" cy="35" r="1.5" fill="#111827" />
          <circle cx="24" cy="33" r="0.8" fill="white" />
          <circle cx="34" cy="33" r="0.8" fill="white" />
          <ellipse cx="27" cy="39.5" rx="2.5" ry="1.8" fill="#fca5a5" />
          <circle cx="42" cy="52" r="5.5" fill="white" opacity="0.5" />
        </svg>
      </div>
      <div className="nav-bunny-shadow" />
    </div>
  );
}

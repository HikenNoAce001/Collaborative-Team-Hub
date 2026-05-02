'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * GSAP-powered page transition curtain.
 *
 * On every route change a gradient curtain drops from the top edge,
 * briefly covers the viewport (masking the old content's disappearance),
 * then retracts upward to reveal the already-rendered new page.
 *
 * Total cycle ≈ 420 ms — fast enough to feel snappy, slow enough to read
 * as intentional. Respects prefers-reduced-motion.
 */
export default function PageTransition() {
  const pathname = usePathname();
  const curtainRef = useRef(null);
  const lastPath = useRef(pathname);
  const tlRef = useRef(null);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    (async () => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const { gsap } = await import('gsap');
      const el = curtainRef.current;
      if (!el) return;

      tlRef.current?.kill();

      tlRef.current = gsap
        .timeline()
        // Reset: collapsed at top edge, pointer-events blocked so clicks pass through
        .set(el, { scaleY: 0, transformOrigin: '50% 0%', pointerEvents: 'auto', opacity: 1 })
        // Drop curtain down (covers viewport)
        .to(el, { scaleY: 1, duration: 0.17, ease: 'power2.in' })
        // Switch anchor to bottom so the retract goes upward
        .set(el, { transformOrigin: '50% 100%' })
        // Retract curtain upward (reveals new page from bottom)
        .to(el, { scaleY: 0, duration: 0.27, ease: 'power2.out', delay: 0.03 })
        .set(el, { pointerEvents: 'none' });
    })();

    return () => {
      tlRef.current?.kill();
    };
  }, [pathname]);

  return (
    <div
      ref={curtainRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        backgroundImage: 'var(--gradient-primary)',
        pointerEvents: 'none',
        transform: 'scaleY(0)',
        transformOrigin: '50% 0%',
      }}
    />
  );
}

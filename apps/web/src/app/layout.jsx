import './globals.css';
import Providers from './providers';
import RouteProgress from '@/components/RouteProgress';
import PageTransition from '@/components/PageTransition';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Team Hub', template: '%s — Team Hub' },
  description: 'Collaborative workspace for goals, action items, and announcements.',
  applicationName: 'Team Hub',
};

// Inline boot script — runs synchronously before React hydrates so we can
// flip <html data-app-ready="true"> the moment the first frame is painted,
// fading the preloader without waiting for the full app bundle.
const PRELOADER_BOOT = `
  (function(){
    var ready = function(){
      requestAnimationFrame(function(){
        document.documentElement.setAttribute('data-app-ready', 'true');
      });
    };
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(ready, 60);
    } else {
      window.addEventListener('DOMContentLoaded', ready);
    }
  })();
`;

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen text-foreground antialiased">
        <div className="preloader" aria-hidden="true">
          <div className="preloader__bunny-scene">
            <div className="preloader__bunny-hop">
              <svg width="56" height="70" viewBox="0 0 56 70" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--color-primary)' }}>
                {/* Left ear */}
                <rect className="bunny-ear-l" x="8" y="0" width="10" height="28" rx="5" fill="currentColor" />
                <rect x="10.5" y="3" width="5" height="20" rx="2.5" fill="#fca5a5" opacity="0.75" />
                {/* Right ear */}
                <rect className="bunny-ear-r" x="24" y="0" width="10" height="28" rx="5" fill="currentColor" />
                <rect x="26.5" y="3" width="5" height="20" rx="2.5" fill="#fca5a5" opacity="0.75" />
                {/* Head */}
                <circle cx="27" cy="36" r="16" fill="currentColor" />
                {/* Body */}
                <ellipse cx="27" cy="57" rx="17" ry="14" fill="currentColor" />
                {/* Belly highlight */}
                <ellipse cx="27" cy="58" rx="10" ry="9" fill="white" opacity="0.22" />
                {/* Eyes */}
                <circle cx="22" cy="34" r="3" fill="white" />
                <circle cx="32" cy="34" r="3" fill="white" />
                {/* Pupils */}
                <circle cx="23" cy="35" r="1.5" fill="#111827" />
                <circle cx="33" cy="35" r="1.5" fill="#111827" />
                {/* Eye sparkle */}
                <circle cx="24" cy="33" r="0.8" fill="white" />
                <circle cx="34" cy="33" r="0.8" fill="white" />
                {/* Nose */}
                <ellipse cx="27" cy="39.5" rx="2.5" ry="1.8" fill="#fca5a5" />
                {/* Tail */}
                <circle cx="42" cy="52" r="5.5" fill="white" opacity="0.5" />
              </svg>
            </div>
            <div className="preloader__bunny-shadow" />
          </div>
          <span className="preloader__label">Hopping in…</span>
        </div>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: PRELOADER_BOOT }}
        />
        <Providers>
          <RouteProgress />
          <PageTransition />
          {children}
        </Providers>
      </body>
    </html>
  );
}

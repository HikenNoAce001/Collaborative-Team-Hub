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
          <div className="preloader__mark" />
          <div className="preloader__bar" />
          <span className="preloader__label">Loading</span>
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

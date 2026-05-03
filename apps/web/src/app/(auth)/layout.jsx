import AuroraBackground from '@/components/AuroraBackground';
import ThemeToggle from '@/components/ThemeToggle';

/**
 * Auth route group layout — drops the aurora background behind login/register
 * so both auth pages share the same animated backdrop in light + dark mode.
 *
 * @param {{ children: import('react').ReactNode }} props
 */
export default function AuthLayout({ children }) {
  return (
    <>
      <AuroraBackground />
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </>
  );
}

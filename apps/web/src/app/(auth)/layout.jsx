import AuroraBackground from '@/components/AuroraBackground';

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
      {children}
    </>
  );
}

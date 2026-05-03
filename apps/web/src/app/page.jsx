import LandingPage from '@/features/landing/LandingPage';
import AuroraBackground from '@/components/AuroraBackground';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <>
      <AuroraBackground />
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <LandingPage />
    </>
  );
}

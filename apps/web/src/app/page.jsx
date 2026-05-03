import LandingPage from '@/features/landing/LandingPage';
import AuroraBackground from '@/components/AuroraBackground';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <>
      <AuroraBackground />
      <div className="relative z-10 flex justify-end px-4 pt-4 sm:px-6">
        <ThemeToggle />
      </div>
      <LandingPage />
    </>
  );
}

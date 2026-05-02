'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckSquare,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  ScrollText,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

const FEATURES = [
  { icon: Megaphone, title: 'Announcements', desc: 'Rich-text posts, reactions, threaded comments.' },
  { icon: ClipboardList, title: 'Goals', desc: 'Milestones, activity feed, owner accountability.' },
  { icon: CheckSquare, title: 'Action Items', desc: 'Kanban board with optimistic drag-and-drop.' },
  { icon: LayoutDashboard, title: 'Analytics', desc: 'Live dashboard, charts, CSV export.' },
  { icon: Users, title: 'Members', desc: 'Roles, presence dots, email invitations.' },
  { icon: ScrollText, title: 'Audit log', desc: 'Immutable trail with filters and CSV export.' },
];

const HIGHLIGHTS = [
  { icon: Zap, label: 'Realtime' },
  { icon: Sparkles, label: 'Optimistic UI' },
  { icon: ScrollText, label: 'Audit log' },
];

export default function LandingPage() {
  const rootRef = useRef(null);

  // GSAP only loads on this route (dynamic import) so the rest of the app
  // doesn't pay the bundle cost. Imported on mount, cleaned up on unmount.
  useEffect(() => {
    let ctx;
    let cancelled = false;

    (async () => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const { gsap } = await import('gsap');
      if (cancelled) return;

      ctx = gsap.context(() => {
        gsap.set('[data-anim]', { opacity: 0, y: 20 });

        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .to('[data-anim="logo"]', { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.6)' }, 0)
          .to('[data-anim="title"]', { opacity: 1, y: 0, duration: 0.8 }, 0.15)
          .to('[data-anim="subtitle"]', { opacity: 1, y: 0, duration: 0.7 }, 0.35)
          .to('[data-anim="cta"]', { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.55)
          .to('[data-anim="highlight"]', { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 }, 0.7)
          .to('[data-anim="feature"]', { opacity: 1, y: 0, duration: 0.6, stagger: 0.07 }, 0.85);
      }, rootRef);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10 sm:py-16">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-7 w-7 rounded-lg bg-gradient-primary shadow-elevated" />
          <span className="text-sm font-semibold tracking-tight">Team Hub</span>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 font-medium text-white shadow-soft transition-transform hover:scale-[1.02]"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <div
          data-anim="logo"
          className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-elevated"
          style={{ transform: 'scale(0.8)' }}
        >
          <Sparkles className="h-6 w-6 text-white" />
        </div>

        <h1
          data-anim="title"
          className="text-balance text-4xl font-bold tracking-tight sm:text-6xl"
        >
          The hub where your{' '}
          <span className="text-gradient-primary">team actually ships</span>.
        </h1>

        <p
          data-anim="subtitle"
          className="mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg"
        >
          Goals, action items, announcements, and audit — wired together with realtime presence,
          optimistic updates, and an immutable trail of every change.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            data-anim="cta"
            href="/register"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-primary px-5 text-sm font-semibold text-white shadow-elevated transition-transform hover:scale-[1.03]"
          >
            Create your workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            data-anim="cta"
            href="/login"
            className="inline-flex h-11 items-center gap-2 rounded-xl border bg-card/80 px-5 text-sm font-semibold backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              data-anim="highlight"
              className="inline-flex items-center gap-1.5 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium backdrop-blur"
            >
              <Icon className="h-3 w-3 text-primary" />
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            data-anim="feature"
            className="group rounded-xl border bg-card/70 p-4 shadow-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-elevated"
          >
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-white shadow-soft">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="mt-3 text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>

      <footer className="mt-12 text-center text-xs text-muted-foreground">
        Built for the FredoCloud assessment · Real-time, optimistic, audited.
      </footer>
    </div>
  );
}

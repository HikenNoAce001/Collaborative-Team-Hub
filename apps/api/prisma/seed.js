// Database seed — Phase 1.x will populate the demo workspace per REQUIREMENTS.md §N.
// Until then this is a no-op so `pnpm db:seed` and `prisma migrate dev` (which
// invokes seed when configured) don't error.

async function seed() {
  // eslint-disable-next-line no-console
  console.info('[seed] no-op until Phase 1.x — see ROADMAP.md §1.1+');
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed:', err);
  process.exit(1);
});

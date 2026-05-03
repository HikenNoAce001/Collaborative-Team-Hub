// Dev seed — denser data for stress-testing kanban, list pagination, and notifications.
// Includes everything from the prod demo plus a second workspace, more users, more items.
// Idempotent.

import {
  prisma,
  log,
  days,
  hours,
  upsertUser,
  upsertWorkspace,
  upsertMember,
  upsertGoal,
  upsertMilestone,
  upsertItem,
  upsertAnnouncement,
  upsertReaction,
  upsertComment,
  upsertNotification,
  withSeed,
} from './seed-helpers.js';

const PRIMARY_USERS = [
  { email: 'demo@team-hub.test', name: 'Maya Chen', password: 'Demo1234' },
  { email: 'sarah.designer@team-hub.test', name: 'Sarah Blackwood', password: 'Demo1234' },
  { email: 'jamie.dev@team-hub.test', name: 'Jamie Park', password: 'Demo1234' },
  { email: 'alex.pm@team-hub.test', name: 'Alex Rivera', password: 'Demo1234' },
  { email: 'noah.eng@team-hub.test', name: 'Noah Kim', password: 'Demo1234' },
  { email: 'leah.qa@team-hub.test', name: 'Leah Sato', password: 'Demo1234' },
];

const SECONDARY_USERS = [
  { email: 'ria.research@team-hub.test', name: 'Ria Mendes', password: 'Demo1234' },
  { email: 'theo.support@team-hub.test', name: 'Theo Larsen', password: 'Demo1234' },
];

const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function pick(arr, i) {
  return arr[i % arr.length];
}

await withSeed(async () => {
  log('starting (dev — rich data)');

  const primary = await Promise.all(PRIMARY_USERS.map(upsertUser));
  const secondary = await Promise.all(SECONDARY_USERS.map(upsertUser));
  const [maya, sarah, jamie, alex, noah, leah] = primary;
  const [ria, theo] = secondary;
  log(`users: ${primary.length + secondary.length}`);

  // ── Primary workspace: Pulse Studio ────────────────────────────────────────
  const studio = await upsertWorkspace({
    name: 'Pulse Studio',
    description: 'Cross-functional product team — design, engineering, and PM working in lockstep.',
    accentColor: '#3B82F6',
  });

  await upsertMember(studio.id, maya.id, 'ADMIN');
  for (const u of [sarah, jamie, alex, noah, leah]) {
    await upsertMember(studio.id, u.id, 'MEMBER');
  }

  // 5 goals — covers all statuses + an extra ON_TRACK for kanban grouping
  const gLaunch = await upsertGoal(studio.id, maya.id, {
    title: 'Ship Q3 product launch',
    description: 'Cross-team launch of dashboard, marketing site, onboarding flow.',
    status: 'ON_TRACK', dueDate: days(45),
  });
  const gDesign = await upsertGoal(studio.id, sarah.id, {
    title: 'Refresh design system to v4',
    description: 'Migrate every component to Tailwind v4 tokens.',
    status: 'AT_RISK', dueDate: days(18),
  });
  const gQuality = await upsertGoal(studio.id, jamie.id, {
    title: 'Cut error budget by 60%',
    description: 'Tighten observability and add e2e regressions.',
    status: 'DRAFT', dueDate: days(75),
  });
  const gOnboarding = await upsertGoal(studio.id, alex.id, {
    title: 'Onboarding redesign',
    description: 'Cut activation time-to-first-value from 3 days to 30 minutes.',
    status: 'COMPLETED', dueDate: days(-10),
  });
  const gPlatform = await upsertGoal(studio.id, noah.id, {
    title: 'Platform reliability sprint',
    description: 'Burn down P1 incidents and harden the deploy pipeline.',
    status: 'ON_TRACK', dueDate: days(30),
  });

  for (const m of [
    { goalId: gLaunch.id, title: 'Beta release', progress: 100 },
    { goalId: gLaunch.id, title: 'Marketing site live', progress: 65 },
    { goalId: gLaunch.id, title: 'GA rollout', progress: 20 },
    { goalId: gDesign.id, title: 'Token audit', progress: 85 },
    { goalId: gDesign.id, title: 'Component migration', progress: 40 },
    { goalId: gDesign.id, title: 'Docs refresh', progress: 15 },
    { goalId: gQuality.id, title: 'Sentry triage', progress: 0 },
    { goalId: gQuality.id, title: 'Top 5 fixes', progress: 0 },
    { goalId: gOnboarding.id, title: 'User research', progress: 100 },
    { goalId: gOnboarding.id, title: 'Prototype + test', progress: 100 },
    { goalId: gOnboarding.id, title: 'Ship + measure', progress: 100 },
    { goalId: gPlatform.id, title: 'Incident triage', progress: 70 },
    { goalId: gPlatform.id, title: 'Deploy pipeline hardening', progress: 45 },
  ]) {
    await upsertMilestone(m.goalId, { title: m.title, progress: m.progress });
  }

  log('goals: 5, milestones: 13');

  // 32 action items — 8 in each status, mixed priorities + assignees
  const itemTitles = [
    // TODO (8)
    ['Fix focus-ring regression in dark mode', gDesign.id, jamie.id, 'URGENT', -2],
    ['Wire up Sentry source map upload in CI', gQuality.id, jamie.id, 'HIGH', 7],
    ['Schedule launch retro', gLaunch.id, alex.id, 'LOW', 50],
    ['Audit empty-state illustrations', null, sarah.id, 'MEDIUM', 14],
    ['Define SLOs for the public API', gPlatform.id, noah.id, 'MEDIUM', 21],
    ['Write changelog automation', gPlatform.id, jamie.id, 'LOW', 35],
    ['Compile beta feedback into themes', gLaunch.id, alex.id, 'MEDIUM', 9],
    ['Re-test signup flow on mobile Safari', null, leah.id, 'HIGH', 4],
    // IN_PROGRESS (8)
    ['Write launch announcement copy', gLaunch.id, jamie.id, 'HIGH', 5],
    ['Migrate Button + Card to v4 tokens', gDesign.id, sarah.id, 'HIGH', 3],
    ['Backfill Sentry source maps for v1', gQuality.id, maya.id, 'MEDIUM', -7],
    ['Prep launch-week customer interviews', gLaunch.id, alex.id, 'MEDIUM', 10],
    ['Roll out feature flag for new editor', gLaunch.id, noah.id, 'HIGH', 2],
    ['Refactor presence channel hub', gPlatform.id, jamie.id, 'MEDIUM', 8],
    ['Onboarding tour copy pass', gOnboarding.id, alex.id, 'LOW', 12],
    ['Q3 OKR check-in deck', null, maya.id, 'MEDIUM', 6],
    // REVIEW (8)
    ['Final hero illustration', gLaunch.id, sarah.id, 'MEDIUM', 2],
    ['Pricing page copy review', gLaunch.id, maya.id, 'HIGH', 4],
    ['Storybook upgrade PR', gDesign.id, jamie.id, 'LOW', 8],
    ['Press kit assets', gLaunch.id, alex.id, 'LOW', 6],
    ['QA pass on new dashboard widgets', gLaunch.id, leah.id, 'HIGH', 3],
    ['DB index review for analytics queries', gPlatform.id, noah.id, 'MEDIUM', 5],
    ['Accessibility audit — top 10 pages', gDesign.id, sarah.id, 'MEDIUM', 9],
    ['Marketing site SEO checklist', gLaunch.id, alex.id, 'LOW', 11],
    // DONE (8)
    ['Color token migration', gDesign.id, sarah.id, 'MEDIUM', -3],
    ['Ship redesigned welcome flow', gOnboarding.id, alex.id, 'HIGH', -12],
    ['Beta feedback synthesis', gLaunch.id, maya.id, 'MEDIUM', -5],
    ['Activation funnel instrumentation', gOnboarding.id, jamie.id, 'HIGH', -15],
    ['Cut staging deploy time by 50%', gPlatform.id, noah.id, 'HIGH', -8],
    ['Migrate auth to refresh-token rotation', gPlatform.id, noah.id, 'URGENT', -20],
    ['Onboarding research synthesis', gOnboarding.id, alex.id, 'MEDIUM', -25],
    ['Replace legacy avatar upload', null, leah.id, 'LOW', -6],
  ];

  for (let i = 0; i < itemTitles.length; i++) {
    const [title, goalId, assigneeId, priority, dueOffset] = itemTitles[i];
    const status = pick(STATUSES, Math.floor(i / 8));
    await upsertItem(studio.id, {
      goalId, assigneeId, title, priority, status,
      dueDate: days(dueOffset),
    });
  }

  log('action items: 32 (8 per status)');

  // 5 announcements (1 pinned)
  const annPinned = await upsertAnnouncement(studio.id, maya.id, {
    title: 'Welcome to Pulse Studio',
    bodyHtml: '<p>Welcome! Pinned post for the dev workspace. Drag cards, react to posts, mention teammates with @.</p>',
    pinned: true,
  });
  const annDesign = await upsertAnnouncement(studio.id, sarah.id, {
    title: 'Design system migration — week 3 update',
    bodyHtml: '<p>Token audit at <strong>85%</strong>. Component migration accelerating.</p>',
    pinned: false,
  });
  const annLaunch = await upsertAnnouncement(studio.id, alex.id, {
    title: 'Q3 launch — marketing kickoff next Tuesday',
    bodyHtml: '<p>Marketing kickoff <strong>Tuesday 10am PT</strong>.</p>',
    pinned: false,
  });
  const annPlatform = await upsertAnnouncement(studio.id, noah.id, {
    title: 'Platform incident postmortem — 2 weeks ago',
    bodyHtml: '<p>The auth token rotation incident is fully resolved. Postmortem doc linked in #incidents.</p>',
    pinned: false,
  });
  const annQA = await upsertAnnouncement(studio.id, leah.id, {
    title: 'QA hand-off process is changing',
    bodyHtml: '<p>Starting next sprint, QA picks up tickets from the <strong>Review</strong> column instead of being assigned. Drop them back to <strong>In Progress</strong> if they fail.</p>',
    pinned: false,
  });

  log('announcements: 5 (1 pinned)');

  // Reactions
  for (const u of primary) {
    await upsertReaction(annPinned.id, u.id, '🚀');
  }
  await upsertReaction(annDesign.id, maya.id, '👍');
  await upsertReaction(annDesign.id, jamie.id, '🔥');
  await upsertReaction(annLaunch.id, sarah.id, '🎉');
  await upsertReaction(annLaunch.id, jamie.id, '🚀');
  await upsertReaction(annPlatform.id, jamie.id, '👀');
  await upsertReaction(annQA.id, alex.id, '👍');

  // Comments + mentions
  const c1 = await upsertComment(
    annPinned.id, sarah.id,
    `@${maya.name} can you double-check the rollout date in the post above?`,
    [maya.id],
  );
  await upsertComment(
    annPinned.id, jamie.id,
    'Looks great. The kanban + presence combo is genuinely useful.',
  );
  const c3 = await upsertComment(
    annDesign.id, jamie.id,
    `Happy to pair on the focus-ring fix tomorrow @${sarah.name}.`,
    [sarah.id],
  );
  await upsertComment(annLaunch.id, maya.id, 'Adding analytics review at the end.');
  await upsertComment(annPlatform.id, maya.id, 'Thanks Noah — really appreciate the writeup.');
  await upsertComment(
    annQA.id, jamie.id,
    `@${leah.name} sounds good. Want me to add a Slack reminder when items hit Review?`,
    [leah.id],
  );

  // Notifications — mix of read + unread for the demo admin
  await upsertNotification(maya.id, 'mention', {
    workspaceId: studio.id,
    announcementId: annPinned.id,
    commentId: c1.id,
    actor: { id: sarah.id, name: sarah.name, avatarUrl: sarah.avatarUrl },
    preview: 'can you double-check the rollout date…',
  });
  await upsertNotification(sarah.id, 'mention', {
    workspaceId: studio.id,
    announcementId: annDesign.id,
    commentId: c3.id,
    actor: { id: jamie.id, name: jamie.name, avatarUrl: jamie.avatarUrl },
    preview: 'Happy to pair on the focus-ring fix…',
  });
  await upsertNotification(maya.id, 'reaction', {
    workspaceId: studio.id,
    announcementId: annPinned.id,
    emoji: '🚀',
    actor: { id: jamie.id, name: jamie.name, avatarUrl: jamie.avatarUrl },
    preview: '🚀 on "Welcome to Pulse Studio"',
  });

  // Mark one as read so the bell shows mixed state
  const oldNotif = await prisma.notification.findFirst({
    where: { recipientId: maya.id, kind: 'reaction' },
  });
  if (oldNotif) {
    await prisma.notification.update({
      where: { id: oldNotif.id },
      data: { readAt: hours(-2) },
    });
  }

  log('reactions, comments, notifications written');

  // ── Secondary workspace — for testing workspace switching ──────────────────
  const research = await upsertWorkspace({
    name: 'Research Lab',
    description: 'Side workspace for user research and discovery work.',
    accentColor: '#10B981',
  });
  await upsertMember(research.id, maya.id, 'ADMIN');
  await upsertMember(research.id, ria.id, 'MEMBER');
  await upsertMember(research.id, theo.id, 'MEMBER');
  await upsertMember(research.id, alex.id, 'MEMBER');

  const gResearch = await upsertGoal(research.id, ria.id, {
    title: 'Q3 user interviews — power users',
    description: 'Recruit 12 power users, run discovery interviews, ship a synthesis doc.',
    status: 'ON_TRACK', dueDate: days(28),
  });
  await upsertMilestone(gResearch.id, { title: 'Recruit participants', progress: 75 });
  await upsertMilestone(gResearch.id, { title: 'Run interviews', progress: 30 });
  await upsertMilestone(gResearch.id, { title: 'Synthesis doc', progress: 0 });

  await upsertItem(research.id, {
    goalId: gResearch.id, assigneeId: ria.id,
    title: 'Schedule 4 more interviews',
    priority: 'HIGH', status: 'IN_PROGRESS', dueDate: days(5),
  });
  await upsertItem(research.id, {
    goalId: gResearch.id, assigneeId: theo.id,
    title: 'Transcribe last week\'s sessions',
    priority: 'MEDIUM', status: 'TODO', dueDate: days(3),
  });
  await upsertItem(research.id, {
    assigneeId: alex.id,
    title: 'Sync findings into the launch retro deck',
    priority: 'LOW', status: 'TODO', dueDate: days(20),
  });

  await upsertAnnouncement(research.id, ria.id, {
    title: 'Recruiting update — 9 of 12 booked',
    bodyHtml: '<p>9 of 12 power users booked. 3 more slots to fill by end of week.</p>',
    pinned: true,
  });

  log('secondary workspace: Research Lab');
  log('done — login: demo@team-hub.test / Demo1234 (admin in both workspaces)');
});

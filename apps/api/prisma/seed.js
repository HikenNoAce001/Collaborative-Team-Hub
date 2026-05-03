// Production demo seed — what the recruiter sees on first login.
// Polished, realistic, every feature surfaced visually. Idempotent.

import {
  prisma,
  log,
  days,
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

const USERS = [
  { email: 'demo@team-hub.test', name: 'Maya Chen', password: 'Demo1234' },
  { email: 'sarah.designer@team-hub.test', name: 'Sarah Blackwood', password: 'Demo1234' },
  { email: 'jamie.dev@team-hub.test', name: 'Jamie Park', password: 'Demo1234' },
  { email: 'alex.pm@team-hub.test', name: 'Alex Rivera', password: 'Demo1234' },
];

await withSeed(async () => {
  log('starting (production demo)');

  const [maya, sarah, jamie, alex] = await Promise.all(USERS.map(upsertUser));
  log(`users: ${USERS.length}`);

  const workspace = await upsertWorkspace({
    name: 'Pulse Studio',
    description: 'Cross-functional product team — design, engineering, and PM working in lockstep.',
    accentColor: '#3B82F6',
  });
  log(`workspace: ${workspace.name}`);

  await upsertMember(workspace.id, maya.id, 'ADMIN');
  await upsertMember(workspace.id, sarah.id, 'MEMBER');
  await upsertMember(workspace.id, jamie.id, 'MEMBER');
  await upsertMember(workspace.id, alex.id, 'MEMBER');
  log('memberships: 4');

  // ── Goals (4) — covers every status ────────────────────────────────────────
  const goalLaunch = await upsertGoal(workspace.id, maya.id, {
    title: 'Ship Q3 product launch',
    description: 'Cross-team launch of the new dashboard, marketing site, and onboarding flow.',
    status: 'ON_TRACK',
    dueDate: days(45),
  });
  await upsertMilestone(goalLaunch.id, { title: 'Beta release', progress: 100 });
  await upsertMilestone(goalLaunch.id, { title: 'Marketing site live', progress: 65 });
  await upsertMilestone(goalLaunch.id, { title: 'GA rollout', progress: 20 });

  const goalDesign = await upsertGoal(workspace.id, sarah.id, {
    title: 'Refresh design system to v4',
    description: 'Migrate every component to Tailwind v4 tokens and re-document patterns.',
    status: 'AT_RISK',
    dueDate: days(18),
  });
  await upsertMilestone(goalDesign.id, { title: 'Token audit', progress: 85 });
  await upsertMilestone(goalDesign.id, { title: 'Component migration', progress: 40 });
  await upsertMilestone(goalDesign.id, { title: 'Docs refresh', progress: 15 });

  const goalQuality = await upsertGoal(workspace.id, jamie.id, {
    title: 'Cut error budget by 60%',
    description: 'Tighten observability, fix the top noisy errors, add e2e regression tests.',
    status: 'DRAFT',
    dueDate: days(75),
  });
  await upsertMilestone(goalQuality.id, { title: 'Sentry triage', progress: 0 });
  await upsertMilestone(goalQuality.id, { title: 'Top 5 fixes', progress: 0 });

  const goalOnboarding = await upsertGoal(workspace.id, alex.id, {
    title: 'Onboarding redesign',
    description: 'Cut activation time-to-first-value from 3 days to 30 minutes.',
    status: 'COMPLETED',
    dueDate: days(-10),
  });
  await upsertMilestone(goalOnboarding.id, { title: 'User research', progress: 100 });
  await upsertMilestone(goalOnboarding.id, { title: 'Prototype + test', progress: 100 });
  await upsertMilestone(goalOnboarding.id, { title: 'Ship + measure', progress: 100 });

  log('goals: 4 (4 statuses), milestones: 11');

  // ── Action items (16) — 4 in each status, mixed priorities + assignees ─────
  // TODO
  await upsertItem(workspace.id, {
    goalId: goalDesign.id, assigneeId: jamie.id,
    title: 'Fix focus-ring regression in dark mode',
    description: 'Outline disappears on Card on Safari — flagged by QA last sprint.',
    priority: 'URGENT', status: 'TODO', dueDate: days(-2),
  });
  await upsertItem(workspace.id, {
    goalId: goalQuality.id, assigneeId: jamie.id,
    title: 'Wire up Sentry source map upload in CI',
    priority: 'HIGH', status: 'TODO', dueDate: days(7),
  });
  await upsertItem(workspace.id, {
    goalId: goalLaunch.id, assigneeId: alex.id,
    title: 'Schedule launch retro',
    priority: 'LOW', status: 'TODO', dueDate: days(50),
  });
  await upsertItem(workspace.id, {
    assigneeId: sarah.id,
    title: 'Audit empty-state illustrations',
    priority: 'MEDIUM', status: 'TODO', dueDate: days(14),
  });

  // IN_PROGRESS
  await upsertItem(workspace.id, {
    goalId: goalLaunch.id, assigneeId: jamie.id,
    title: 'Write launch announcement copy',
    description: 'Draft for the marketing blog + social posts.',
    priority: 'HIGH', status: 'IN_PROGRESS', dueDate: days(5),
  });
  await upsertItem(workspace.id, {
    goalId: goalDesign.id, assigneeId: sarah.id,
    title: 'Migrate Button + Card to v4 tokens',
    priority: 'HIGH', status: 'IN_PROGRESS', dueDate: days(3),
  });
  await upsertItem(workspace.id, {
    goalId: goalQuality.id, assigneeId: maya.id,
    title: 'Backfill Sentry source maps for v1',
    priority: 'MEDIUM', status: 'IN_PROGRESS', dueDate: days(-7),
  });
  await upsertItem(workspace.id, {
    goalId: goalLaunch.id, assigneeId: alex.id,
    title: 'Prep launch-week customer interviews',
    priority: 'MEDIUM', status: 'IN_PROGRESS', dueDate: days(10),
  });

  // REVIEW
  await upsertItem(workspace.id, {
    goalId: goalLaunch.id, assigneeId: sarah.id,
    title: 'Final hero illustration',
    priority: 'MEDIUM', status: 'REVIEW', dueDate: days(2),
  });
  await upsertItem(workspace.id, {
    goalId: goalLaunch.id, assigneeId: maya.id,
    title: 'Pricing page copy review',
    priority: 'HIGH', status: 'REVIEW', dueDate: days(4),
  });
  await upsertItem(workspace.id, {
    goalId: goalDesign.id, assigneeId: jamie.id,
    title: 'Storybook upgrade PR',
    priority: 'LOW', status: 'REVIEW', dueDate: days(8),
  });
  await upsertItem(workspace.id, {
    goalId: goalLaunch.id, assigneeId: alex.id,
    title: 'Press kit assets',
    priority: 'LOW', status: 'REVIEW', dueDate: days(6),
  });

  // DONE
  await upsertItem(workspace.id, {
    goalId: goalDesign.id, assigneeId: sarah.id,
    title: 'Color token migration',
    priority: 'MEDIUM', status: 'DONE', dueDate: days(-3),
  });
  await upsertItem(workspace.id, {
    goalId: goalOnboarding.id, assigneeId: alex.id,
    title: 'Ship redesigned welcome flow',
    priority: 'HIGH', status: 'DONE', dueDate: days(-12),
  });
  await upsertItem(workspace.id, {
    goalId: goalLaunch.id, assigneeId: maya.id,
    title: 'Beta feedback synthesis',
    priority: 'MEDIUM', status: 'DONE', dueDate: days(-5),
  });
  await upsertItem(workspace.id, {
    goalId: goalOnboarding.id, assigneeId: jamie.id,
    title: 'Activation funnel instrumentation',
    priority: 'HIGH', status: 'DONE', dueDate: days(-15),
  });

  log('action items: 16 (4 per status)');

  // ── Announcements (3) ──────────────────────────────────────────────────────
  const annPinned = await upsertAnnouncement(workspace.id, maya.id, {
    title: 'Welcome to Pulse Studio',
    bodyHtml: [
      '<p>Welcome to the demo workspace. This is the pinned post that shows on every login.</p>',
      '<p>Try these to see Team Hub in action:</p>',
      '<ul>',
      '<li>Open the <strong>Goals</strong> tab and click any goal to see milestones.</li>',
      '<li>Drag cards on the <strong>Action Items</strong> kanban — moves are real-time across tabs.</li>',
      '<li>Click an announcement, react with an emoji, leave a comment, mention a teammate with <code>@</code>.</li>',
      '<li>Open <strong>Members</strong> to see online presence dots update live.</li>',
      '</ul>',
      '<p>Drop a 🚀 below if everything looks good.</p>',
    ].join(''),
    pinned: true,
  });

  const annDesign = await upsertAnnouncement(workspace.id, sarah.id, {
    title: 'Design system migration — week 3 update',
    bodyHtml: [
      '<p>Token audit landed at <strong>85%</strong> — finishing color + radius this week.</p>',
      '<p>Component migration is at 40% and starting to accelerate now that the audit is mostly done. Tracking it under <em>Refresh design system to v4</em>.</p>',
      '<p>Let me know if you hit anything weird in dark mode — I owe Jamie a fix on the focus ring.</p>',
    ].join(''),
    pinned: false,
  });

  const annLaunch = await upsertAnnouncement(workspace.id, alex.id, {
    title: 'Q3 launch — marketing kickoff next Tuesday',
    bodyHtml: [
      '<p>Pulling everyone in for the launch marketing kickoff <strong>next Tuesday at 10am PT</strong>.</p>',
      '<p>Agenda:</p>',
      '<ul>',
      '<li>Final positioning + messaging review (Maya)</li>',
      '<li>Launch-day asset checklist (Sarah)</li>',
      '<li>Press + analyst outreach plan (Alex)</li>',
      '</ul>',
    ].join(''),
    pinned: false,
  });

  log('announcements: 3 (1 pinned)');

  // ── Reactions (10) ─────────────────────────────────────────────────────────
  await Promise.all([
    upsertReaction(annPinned.id, maya.id, '🚀'),
    upsertReaction(annPinned.id, sarah.id, '🚀'),
    upsertReaction(annPinned.id, jamie.id, '❤️'),
    upsertReaction(annPinned.id, alex.id, '🎉'),
    upsertReaction(annDesign.id, maya.id, '👍'),
    upsertReaction(annDesign.id, jamie.id, '👍'),
    upsertReaction(annDesign.id, alex.id, '🔥'),
    upsertReaction(annLaunch.id, maya.id, '🎉'),
    upsertReaction(annLaunch.id, sarah.id, '👍'),
    upsertReaction(annLaunch.id, jamie.id, '🚀'),
  ]);
  log('reactions: 10');

  // ── Comments + mentions ────────────────────────────────────────────────────
  const mentionComment = await upsertComment(
    annPinned.id,
    sarah.id,
    `@${maya.name} can you double-check the rollout date in the post above? Want to make sure it lines up with marketing.`,
    [maya.id],
  );
  await upsertComment(
    annPinned.id,
    jamie.id,
    'Looks great. The kanban + presence combo is genuinely useful, not gimmicky.',
  );
  await upsertComment(
    annDesign.id,
    jamie.id,
    `Thanks @${sarah.name} — happy to pair on the focus-ring fix tomorrow morning if you have time.`,
    [sarah.id],
  );
  await upsertComment(
    annLaunch.id,
    maya.id,
    'Adding a slot for analytics review at the end. Will send a calendar update.',
  );

  log('comments: 4 (2 with mentions)');

  // ── Notifications (mention + reaction) ─────────────────────────────────────
  await upsertNotification(maya.id, 'mention', {
    workspaceId: workspace.id,
    announcementId: annPinned.id,
    commentId: mentionComment.id,
    actor: { id: sarah.id, name: sarah.name, avatarUrl: sarah.avatarUrl },
    preview: 'can you double-check the rollout date…',
  });
  await upsertNotification(sarah.id, 'reaction', {
    workspaceId: workspace.id,
    announcementId: annDesign.id,
    emoji: '🔥',
    actor: { id: alex.id, name: alex.name, avatarUrl: alex.avatarUrl },
    preview: '🔥 on "Design system migration — week 3 update"',
  });

  log('notifications: 2');

  log('done — login: demo@team-hub.test / Demo1234');
});

// Dev seed — distinct from the production demo so local work doesn't get
// confused with prod data. Clearly dev-flavored names, two workspaces,
// edge-case rows (long titles, no due date, no assignee, fully completed
// goals) for visual regression testing. Idempotent.

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
  { email: 'dev@team-hub.local', name: 'Devin Admin', password: 'Dev12345' },
  { email: 'alex.dev@team-hub.local', name: 'Alex Carter', password: 'Dev12345' },
  { email: 'sam.dev@team-hub.local', name: 'Sam Iqbal', password: 'Dev12345' },
  { email: 'jordan.dev@team-hub.local', name: 'Jordan Reyes', password: 'Dev12345' },
  { email: 'taylor.dev@team-hub.local', name: 'Taylor Brooks', password: 'Dev12345' },
  { email: 'morgan.dev@team-hub.local', name: 'Morgan Lee', password: 'Dev12345' },
];

const SECONDARY_USERS = [
  { email: 'qa.lead@team-hub.local', name: 'Quinn QA-Lead', password: 'Dev12345' },
  { email: 'qa.bot@team-hub.local', name: 'Bot Tester', password: 'Dev12345' },
];

const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

function pick(arr, i) {
  return arr[i % arr.length];
}

await withSeed(async () => {
  log('starting (dev — distinct from prod)');

  const primary = await Promise.all(PRIMARY_USERS.map(upsertUser));
  const secondary = await Promise.all(SECONDARY_USERS.map(upsertUser));
  const [devin, alex, sam, jordan, taylor, morgan] = primary;
  const [quinn, bot] = secondary;
  log(`users: ${primary.length + secondary.length}`);

  // ── Primary workspace: Dev Sandbox ─────────────────────────────────────────
  const sandbox = await upsertWorkspace({
    name: 'Dev Sandbox',
    description: 'Local development workspace — feel free to break things.',
    accentColor: '#8b5cf6',
  });

  await upsertMember(sandbox.id, devin.id, 'ADMIN');
  for (const u of [alex, sam, jordan, taylor, morgan]) {
    await upsertMember(sandbox.id, u.id, 'MEMBER');
  }

  // 6 goals — all four statuses + edge cases
  const gShip = await upsertGoal(sandbox.id, devin.id, {
    title: 'Ship the dev sandbox',
    description: 'Get every feature visible on a single seeded workspace.',
    status: 'ON_TRACK', dueDate: days(30),
  });
  const gDesign = await upsertGoal(sandbox.id, alex.id, {
    title: 'Wire up dark-mode tokens across every surface',
    description: 'Cross-check contrast ratios at every accent color.',
    status: 'AT_RISK', dueDate: days(12),
  });
  const gPerf = await upsertGoal(sandbox.id, sam.id, {
    title: 'Trim the API response payloads',
    description: 'Strip unused includes; verify with the slow-query log.',
    status: 'DRAFT', dueDate: days(60),
  });
  const gDone = await upsertGoal(sandbox.id, jordan.id, {
    title: 'Migrate avatar storage to Cloudinary',
    description: 'Done — kept here as a fully-completed example.',
    status: 'COMPLETED', dueDate: days(-7),
  });
  // Edge case: no due date
  const gOpen = await upsertGoal(sandbox.id, taylor.id, {
    title: 'Long-running discovery — no fixed deadline yet',
    description: 'Research goal without a due date; renders the empty-state pill.',
    status: 'ON_TRACK', dueDate: null,
  });
  // Edge case: long title
  const gLong = await upsertGoal(sandbox.id, morgan.id, {
    title: 'A deliberately overly long goal title to test how wrapping behaves across the kanban card the list view the goal detail page and the activity feed pill',
    description: 'Truncation + wrapping smoke test.',
    status: 'DRAFT', dueDate: days(90),
  });

  for (const m of [
    { goalId: gShip.id, title: 'Auth surface', progress: 100 },
    { goalId: gShip.id, title: 'Goals + milestones', progress: 100 },
    { goalId: gShip.id, title: 'Action items kanban', progress: 80 },
    { goalId: gShip.id, title: 'Announcements + comments', progress: 60 },
    { goalId: gShip.id, title: 'Analytics + audit log', progress: 35 },
    { goalId: gDesign.id, title: 'Token audit', progress: 70 },
    { goalId: gDesign.id, title: 'Component pass', progress: 30 },
    { goalId: gPerf.id, title: 'Identify slow endpoints', progress: 0 },
    { goalId: gDone.id, title: 'Cloudinary signup + keys', progress: 100 },
    { goalId: gDone.id, title: 'Upload pipeline', progress: 100 },
    { goalId: gDone.id, title: 'Backfill existing users', progress: 100 },
    // Edge case: milestone at 0 on an ON_TRACK goal
    { goalId: gOpen.id, title: 'Stakeholder interviews', progress: 0 },
  ]) {
    await upsertMilestone(m.goalId, { title: m.title, progress: m.progress });
  }

  log('goals: 6, milestones: 12');

  // 36 action items — 9 in each status, edge-case mix
  const itemDefs = [
    // TODO (9)
    ['Reproduce the kanban flash-of-old-state bug', gShip.id, sam.id, 'URGENT', -1],
    ['Add empty-state to the goals list', gShip.id, alex.id, 'HIGH', 3],
    ['Verify @mention dropdown on mobile', gDesign.id, jordan.id, 'HIGH', 5],
    ['Audit error toasts for consistent copy', gDesign.id, taylor.id, 'MEDIUM', 9],
    ['Cache /auth/me on the client for 5 min', gPerf.id, sam.id, 'MEDIUM', 14],
    ['Add e2e smoke test for the login flow', null, morgan.id, 'LOW', 21],
    ['Edge case: no assignee — unassigned card', gShip.id, null, 'LOW', 7],
    ['Edge case: no due date pill', gShip.id, alex.id, 'MEDIUM', null],
    ['Wire up the websocket reconnect toast', gShip.id, jordan.id, 'MEDIUM', 4],
    // IN_PROGRESS (9)
    ['Bump pnpm hoist-pattern for prisma runtime', gPerf.id, sam.id, 'HIGH', 2],
    ['Migrate Card + Button to v4 tokens', gDesign.id, alex.id, 'HIGH', 1],
    ['Rate-limit /auth/login per IP', null, sam.id, 'URGENT', 0],
    ['Audit log timeline polish', gShip.id, devin.id, 'MEDIUM', 6],
    ['Refactor presence broadcast', gShip.id, jordan.id, 'MEDIUM', 8],
    ['Stress test announcement rendering with 100+ comments', gShip.id, taylor.id, 'LOW', 11],
    ['Add CSV export to action items', null, morgan.id, 'MEDIUM', 13],
    ['Fix focus ring on Tab', gDesign.id, alex.id, 'LOW', 15],
    ['Edge case: 0-progress milestone bar styling', gDesign.id, alex.id, 'LOW', 17],
    // REVIEW (9)
    ['QA pass on workspace switching', gShip.id, quinn.id, 'HIGH', 1],
    ['Review Tiptap toolbar accessibility', gShip.id, alex.id, 'MEDIUM', 3],
    ['Index audit on AuditLog table', gPerf.id, sam.id, 'MEDIUM', 5],
    ['Verify dark-mode contrast on charts', gDesign.id, alex.id, 'LOW', 4],
    ['Mobile pass at 375px wide', gDesign.id, taylor.id, 'HIGH', 2],
    ['Sanitize-html allowlist review', null, devin.id, 'HIGH', 6],
    ['Pagination edge cases', gShip.id, morgan.id, 'MEDIUM', 9],
    ['Notification bell unread badge logic', gShip.id, devin.id, 'LOW', 12],
    ['Edge case: assignee removed from workspace', gShip.id, bot.id, 'LOW', 18],
    // DONE (9)
    ['Wire Prisma client through pnpm hoist', gPerf.id, sam.id, 'HIGH', -3],
    ['Add tooltips to status pills', gDesign.id, alex.id, 'LOW', -5],
    ['Migrate avatar uploads to Cloudinary', gDone.id, jordan.id, 'HIGH', -10],
    ['Seed dev workspace', gShip.id, devin.id, 'MEDIUM', -1],
    ['Add proxy rewrites for socket.io', gShip.id, sam.id, 'URGENT', -8],
    ['Auth gate on (app) layout', gShip.id, devin.id, 'HIGH', -14],
    ['Activity feed cursor pagination', gShip.id, morgan.id, 'MEDIUM', -20],
    ['Sonner toast wiring', gDesign.id, alex.id, 'LOW', -25],
    ['Per-workspace accent color CSS variable', gDesign.id, alex.id, 'MEDIUM', -30],
  ];

  for (let i = 0; i < itemDefs.length; i++) {
    const [title, goalId, assigneeId, priority, dueOffset] = itemDefs[i];
    const status = pick(STATUSES, Math.floor(i / 9));
    await upsertItem(sandbox.id, {
      goalId,
      assigneeId,
      title,
      priority,
      status,
      dueDate: dueOffset === null ? null : days(dueOffset),
    });
  }

  log('action items: 36 (9 per status + edge cases)');

  // 6 announcements (1 pinned, mix of authors, varied content lengths)
  const annPinned = await upsertAnnouncement(sandbox.id, devin.id, {
    title: 'Dev Sandbox — read me first',
    bodyHtml: [
      '<p>Welcome to the <strong>dev</strong> sandbox. Everything in here is fake data — break it freely.</p>',
      '<p>If you need the polished demo data the recruiter sees, run <code>pnpm db:reset</code> from <code>apps/api</code>.</p>',
    ].join(''),
    pinned: true,
  });
  const annLong = await upsertAnnouncement(sandbox.id, alex.id, {
    title: 'Long-form announcement for rendering test',
    bodyHtml: [
      '<h2>Heading two</h2>',
      '<p>Tiptap sends this back as HTML; the API runs it through <code>sanitize-html</code> before persisting.</p>',
      '<p>An unordered list:</p>',
      '<ul><li>One</li><li>Two</li><li>Three with a <a href="https://example.com">link</a></li></ul>',
      '<p>An ordered list:</p>',
      '<ol><li>Step</li><li>Another step</li></ol>',
      '<blockquote><p>Block quote for the curious.</p></blockquote>',
      '<p><strong>Bold</strong>, <em>italic</em>, <u>underline</u>, and <s>strikethrough</s> all survive sanitization.</p>',
    ].join(''),
    pinned: false,
  });
  const annShort = await upsertAnnouncement(sandbox.id, sam.id, {
    title: 'Short post',
    bodyHtml: '<p>One line.</p>',
    pinned: false,
  });
  const annPerf = await upsertAnnouncement(sandbox.id, sam.id, {
    title: 'Performance findings — week 1',
    bodyHtml: [
      '<p>The slow-query log surfaced three offenders:</p>',
      '<ol><li>Announcements list — N+1 on reactions (fixed via <code>groupBy</code>).</li>',
      '<li>Members presence — fetching all users instead of just members.</li>',
      '<li>Audit log — missing index on <code>workspaceId + createdAt</code>.</li></ol>',
    ].join(''),
    pinned: false,
  });
  const annMeta = await upsertAnnouncement(sandbox.id, jordan.id, {
    title: 'Sprint retro notes',
    bodyHtml: '<p>Three keep / two stop / two start. Doc linked in the action items.</p>',
    pinned: false,
  });
  const annNewbie = await upsertAnnouncement(sandbox.id, taylor.id, {
    title: 'Onboarding new hires',
    bodyHtml: '<p>Two new devs starting next sprint. Pair-programming pairings in #onboarding.</p>',
    pinned: false,
  });

  log('announcements: 6 (1 pinned)');

  // Reactions
  for (const u of primary) await upsertReaction(annPinned.id, u.id, '👋');
  await upsertReaction(annPinned.id, quinn.id, '🚀');
  await upsertReaction(annLong.id, devin.id, '🔥');
  await upsertReaction(annLong.id, sam.id, '👍');
  await upsertReaction(annPerf.id, devin.id, '👍');
  await upsertReaction(annPerf.id, alex.id, '🔥');
  await upsertReaction(annMeta.id, taylor.id, '🎉');
  await upsertReaction(annNewbie.id, devin.id, '🎉');
  await upsertReaction(annNewbie.id, alex.id, '👋');

  // Comments + mentions
  const c1 = await upsertComment(
    annPinned.id, alex.id,
    `Welcome aboard everyone — feel free to break things in this sandbox. @${devin.name} can hand out admin if you need elevated permissions.`,
    [devin.id],
  );
  await upsertComment(
    annPinned.id, sam.id,
    'A reminder that the dev seed is idempotent — re-running won\'t duplicate rows.',
  );
  const c3 = await upsertComment(
    annLong.id, devin.id,
    `Nice rendering test @${alex.name}. Can you also test code blocks?`,
    [alex.id],
  );
  await upsertComment(
    annPerf.id, devin.id,
    'Great writeup. The audit log index fix alone was a 40% speedup.',
  );
  await upsertComment(
    annMeta.id, alex.id,
    'Adding context: the keep list included the new optimistic UI patterns.',
  );

  // Notifications — mix of read + unread for the dev admin
  await upsertNotification(devin.id, 'mention', {
    workspaceId: sandbox.id,
    announcementId: annPinned.id,
    commentId: c1.id,
    actor: { id: alex.id, name: alex.name, avatarUrl: alex.avatarUrl },
    preview: 'Welcome aboard everyone — feel free to break things…',
  });
  await upsertNotification(alex.id, 'mention', {
    workspaceId: sandbox.id,
    announcementId: annLong.id,
    commentId: c3.id,
    actor: { id: devin.id, name: devin.name, avatarUrl: devin.avatarUrl },
    preview: 'Can you also test code blocks?',
  });
  await upsertNotification(devin.id, 'reaction', {
    workspaceId: sandbox.id,
    announcementId: annPinned.id,
    emoji: '👋',
    actor: { id: morgan.id, name: morgan.name, avatarUrl: morgan.avatarUrl },
    preview: '👋 on "Dev Sandbox — read me first"',
  });

  // Mark one as read
  const oldNotif = await prisma.notification.findFirst({
    where: { recipientId: devin.id, kind: 'reaction' },
  });
  if (oldNotif) {
    await prisma.notification.update({
      where: { id: oldNotif.id },
      data: { readAt: hours(-2) },
    });
  }

  log('reactions, comments, notifications written');

  // ── Secondary workspace: QA Playground ─────────────────────────────────────
  const qa = await upsertWorkspace({
    name: 'QA Playground',
    description: 'Workspace for testing flows that touch second-workspace logic.',
    accentColor: '#f97316',
  });
  await upsertMember(qa.id, devin.id, 'ADMIN');
  await upsertMember(qa.id, quinn.id, 'ADMIN');
  await upsertMember(qa.id, bot.id, 'MEMBER');
  await upsertMember(qa.id, alex.id, 'MEMBER');

  const gQA = await upsertGoal(qa.id, quinn.id, {
    title: 'Cover every feature with a manual QA pass',
    description: 'Two-browser coverage for real-time, mobile pass at 375px.',
    status: 'ON_TRACK', dueDate: days(21),
  });
  await upsertMilestone(gQA.id, { title: 'Auth flows', progress: 100 });
  await upsertMilestone(gQA.id, { title: 'Kanban DnD + optimistic UI', progress: 80 });
  await upsertMilestone(gQA.id, { title: 'Audit log filters', progress: 50 });
  await upsertMilestone(gQA.id, { title: 'Mobile pass', progress: 20 });

  await upsertItem(qa.id, {
    goalId: gQA.id, assigneeId: quinn.id,
    title: 'Two-browser presence smoke test',
    priority: 'HIGH', status: 'IN_PROGRESS', dueDate: days(3),
  });
  await upsertItem(qa.id, {
    goalId: gQA.id, assigneeId: bot.id,
    title: 'Bot script: spam the comment endpoint',
    priority: 'LOW', status: 'TODO', dueDate: days(7),
  });
  await upsertItem(qa.id, {
    assigneeId: alex.id,
    title: 'Mobile a11y audit',
    priority: 'MEDIUM', status: 'TODO', dueDate: days(10),
  });

  await upsertAnnouncement(qa.id, quinn.id, {
    title: 'QA Playground — what to test',
    bodyHtml: '<p>This workspace exists so you can exercise the workspace switcher. Don\'t expect polished copy here.</p>',
    pinned: true,
  });

  log('secondary workspace: QA Playground');
  log('done — dev login: dev@team-hub.local / Dev12345 (admin in both workspaces)');
});

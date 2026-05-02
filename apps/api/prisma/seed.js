// Demo workspace seed — REQUIREMENTS.md §N. Idempotent: every record is keyed
// by a stable natural identifier (email, composite unique, or title-within-workspace)
// so re-running this script converges instead of duplicating.

import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const log = (...args) => console.info('[seed]', ...args);

const DEMO_WORKSPACE_NAME = 'Acme Product Launch';
const DEMO_WORKSPACE_DESC = 'Demo workspace for the Team Hub assessment.';
const DEMO_ACCENT = '#6366F1';

const USERS = [
  { email: 'demo@team-hub.test', name: 'Demo Admin', password: 'Demo1234', role: 'ADMIN' },
  { email: 'sarah.designer@team-hub.test', name: 'Sarah Designer', password: 'Demo1234', role: 'MEMBER' },
  { email: 'jamie.dev@team-hub.test', name: 'Jamie Developer', password: 'Demo1234', role: 'MEMBER' },
];

const days = (n) => new Date(Date.now() + n * 86_400_000);

async function upsertUser({ email, name, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: { name }, // password rotation on re-seed is intentional — keeps demo creds stable
    create: { email, name, passwordHash },
  });
}

async function upsertWorkspace() {
  const existing = await prisma.workspace.findFirst({
    where: { name: DEMO_WORKSPACE_NAME, description: DEMO_WORKSPACE_DESC },
  });
  if (existing) return existing;
  return prisma.workspace.create({
    data: {
      name: DEMO_WORKSPACE_NAME,
      description: DEMO_WORKSPACE_DESC,
      accentColor: DEMO_ACCENT,
    },
  });
}

async function upsertMember(workspaceId, userId, role) {
  return prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId } },
    update: { role },
    create: { workspaceId, userId, role },
  });
}

async function findOrCreateGoal(workspaceId, ownerId, body) {
  const existing = await prisma.goal.findFirst({
    where: { workspaceId, title: body.title },
  });
  if (existing) {
    return prisma.goal.update({
      where: { id: existing.id },
      data: { description: body.description, dueDate: body.dueDate, status: body.status, ownerId },
    });
  }
  return prisma.goal.create({
    data: { workspaceId, ownerId, ...body },
  });
}

async function findOrCreateMilestone(goalId, body) {
  const existing = await prisma.milestone.findFirst({
    where: { goalId, title: body.title },
  });
  if (existing) {
    return prisma.milestone.update({
      where: { id: existing.id },
      data: { progress: body.progress },
    });
  }
  return prisma.milestone.create({
    data: { goalId, ...body },
  });
}

async function findOrCreateItem(workspaceId, body) {
  const existing = await prisma.actionItem.findFirst({
    where: { workspaceId, title: body.title },
  });
  if (existing) {
    return prisma.actionItem.update({
      where: { id: existing.id },
      data: body,
    });
  }
  return prisma.actionItem.create({
    data: { workspaceId, ...body },
  });
}

async function findOrCreateAnnouncement(workspaceId, authorId, body) {
  const existing = await prisma.announcement.findFirst({
    where: { workspaceId, title: body.title },
  });
  if (existing) {
    return prisma.announcement.update({
      where: { id: existing.id },
      data: {
        bodyHtml: body.bodyHtml,
        pinned: body.pinned,
        authorId,
      },
    });
  }
  return prisma.announcement.create({
    data: { workspaceId, authorId, ...body },
  });
}

async function upsertReaction(announcementId, userId, emoji) {
  return prisma.reaction.upsert({
    where: { announcementId_userId_emoji: { announcementId, userId, emoji } },
    update: {},
    create: { announcementId, userId, emoji },
  });
}

async function findOrCreateComment(announcementId, authorId, body, mentionUserIds = []) {
  const existing = await prisma.comment.findFirst({
    where: { announcementId, authorId, body },
  });
  if (existing) {
    return prisma.comment.update({
      where: { id: existing.id },
      data: { mentionUserIds },
    });
  }
  return prisma.comment.create({
    data: { announcementId, authorId, body, mentionUserIds },
  });
}

async function findOrCreateNotification(recipientId, kind, payload) {
  // Match on recipient + kind + payload-keys to keep idempotency without a unique constraint.
  const candidates = await prisma.notification.findMany({
    where: { recipientId, kind },
  });
  const match = candidates.find(
    (n) =>
      n.payload?.commentId === payload.commentId &&
      n.payload?.announcementId === payload.announcementId,
  );
  if (match) return match;
  return prisma.notification.create({
    data: { recipientId, kind, payload },
  });
}

async function seed() {
  log('starting');

  const [admin, sarah, jamie] = await Promise.all(USERS.map(upsertUser));
  log(`users: ${admin.email}, ${sarah.email}, ${jamie.email}`);

  const workspace = await upsertWorkspace();
  log(`workspace: ${workspace.name} (${workspace.id})`);

  await upsertMember(workspace.id, admin.id, 'ADMIN');
  await upsertMember(workspace.id, sarah.id, 'MEMBER');
  await upsertMember(workspace.id, jamie.id, 'MEMBER');
  log('memberships: 3');

  // ── Goals (3) with milestones ───────────────────────────────────────────────
  const goalLaunch = await findOrCreateGoal(workspace.id, admin.id, {
    title: 'Ship v2 product launch',
    description: 'End-to-end launch of the new dashboard, marketing site, and onboarding flow.',
    status: 'ON_TRACK',
    dueDate: days(45),
  });
  await findOrCreateMilestone(goalLaunch.id, { title: 'Beta release', progress: 100 });
  await findOrCreateMilestone(goalLaunch.id, { title: 'Marketing site live', progress: 60 });
  await findOrCreateMilestone(goalLaunch.id, { title: 'GA rollout', progress: 15 });

  const goalDesign = await findOrCreateGoal(workspace.id, sarah.id, {
    title: 'Refresh design system',
    description: 'Migrate components to Tailwind v4 tokens and re-document patterns.',
    status: 'AT_RISK',
    dueDate: days(20),
  });
  await findOrCreateMilestone(goalDesign.id, { title: 'Token audit', progress: 80 });
  await findOrCreateMilestone(goalDesign.id, { title: 'Component migration', progress: 35 });

  const goalQuality = await findOrCreateGoal(workspace.id, jamie.id, {
    title: 'Cut error rate by 50%',
    description: 'Tighten observability, fix top 5 noisy errors, and add e2e regressions.',
    status: 'DRAFT',
    dueDate: days(75),
  });
  await findOrCreateMilestone(goalQuality.id, { title: 'Sentry triage', progress: 0 });

  log('goals: 3 with milestones');

  // ── Action items (6, two overdue) ──────────────────────────────────────────
  await findOrCreateItem(workspace.id, {
    goalId: goalLaunch.id,
    assigneeId: jamie.id,
    title: 'Write launch announcement copy',
    description: 'Draft for the marketing blog + social posts.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    dueDate: days(5),
  });

  await findOrCreateItem(workspace.id, {
    goalId: goalLaunch.id,
    assigneeId: sarah.id,
    title: 'Final hero illustration',
    priority: 'MEDIUM',
    status: 'REVIEW',
    dueDate: days(2),
  });

  await findOrCreateItem(workspace.id, {
    goalId: goalDesign.id,
    assigneeId: sarah.id,
    title: 'Migrate Button + Card to v4 tokens',
    priority: 'MEDIUM',
    status: 'DONE',
    dueDate: days(-3),
  });

  // Two overdue items — past due date, not DONE.
  await findOrCreateItem(workspace.id, {
    goalId: goalDesign.id,
    assigneeId: jamie.id,
    title: 'Fix focus-ring regression in dark mode',
    description: 'Reported by QA last sprint — outline disappears on Card on Safari.',
    priority: 'URGENT',
    status: 'TODO',
    dueDate: days(-2),
  });
  await findOrCreateItem(workspace.id, {
    goalId: goalQuality.id,
    assigneeId: admin.id,
    title: 'Backfill Sentry source maps for v1',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    dueDate: days(-7),
  });

  await findOrCreateItem(workspace.id, {
    assigneeId: jamie.id,
    title: 'Schedule the launch retro',
    priority: 'LOW',
    status: 'TODO',
    dueDate: days(60),
  });

  log('action items: 6');

  // ── Announcements (2, 1 pinned) ────────────────────────────────────────────
  const annPinned = await findOrCreateAnnouncement(workspace.id, admin.id, {
    title: 'Welcome to Acme Product Launch',
    bodyHtml: [
      '<p>Welcome to the demo workspace! This is a pinned announcement to show off the layout.</p>',
      '<p>Things you can do here:</p>',
      '<ul>',
      '<li>Check the <strong>Goals</strong> tab for our quarterly objectives.</li>',
      '<li>Drag cards around the <strong>Action Items</strong> kanban — moves are live.</li>',
      '<li>Click an announcement to react and comment.</li>',
      '</ul>',
      '<p>Look for the 🚀 reaction below.</p>',
    ].join(''),
    pinned: true,
  });

  const annPost = await findOrCreateAnnouncement(workspace.id, sarah.id, {
    title: 'Design system migration update',
    bodyHtml: [
      '<p>Token audit is at <strong>80%</strong> — finishing color + radius next.</p>',
      '<p>Component migration starts Monday. Tracking it under <em>Refresh design system</em>.</p>',
    ].join(''),
    pinned: false,
  });

  log('announcements: 2 (1 pinned)');

  // ── Reactions ──────────────────────────────────────────────────────────────
  await Promise.all([
    upsertReaction(annPinned.id, admin.id, '🚀'),
    upsertReaction(annPinned.id, sarah.id, '🚀'),
    upsertReaction(annPinned.id, jamie.id, '❤️'),
    upsertReaction(annPost.id, admin.id, '👍'),
    upsertReaction(annPost.id, jamie.id, '👍'),
  ]);
  log('reactions: 5');

  // ── Mention comment + notification ─────────────────────────────────────────
  const mentionComment = await findOrCreateComment(
    annPinned.id,
    sarah.id,
    `@${admin.name} can you double-check the rollout date in the post above? Want to make sure it lines up with marketing.`,
    [admin.id],
  );

  await findOrCreateNotification(admin.id, 'mention', {
    workspaceId: workspace.id,
    announcementId: annPinned.id,
    commentId: mentionComment.id,
    actor: { id: sarah.id, name: sarah.name, avatarUrl: null },
    preview: 'can you double-check the rollout date…',
  });
  log('mention comment + notification');

  log('done — login: demo@team-hub.test / Demo1234');
}

seed()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

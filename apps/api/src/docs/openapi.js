// Hand-rolled OpenAPI 3.0 spec for the Team Hub API. Single source over the
// alternative of scattering @swagger JSDoc across every router file.
// Mounted at /api/docs (Swagger UI) and /api/openapi.json.

const errorEnvelope = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: {},
      },
    },
  },
};

const cuid = { type: 'string', minLength: 20, example: 'cmon67xup0000log91trxsqwd' };

const User = {
  type: 'object',
  properties: {
    id: cuid,
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    avatarUrl: { type: 'string', format: 'uri', nullable: true },
  },
};

const Workspace = {
  type: 'object',
  properties: {
    id: cuid,
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    accentColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    myRole: { type: 'string', enum: ['ADMIN', 'MEMBER'], nullable: true },
  },
};

const Goal = {
  type: 'object',
  properties: {
    id: cuid,
    workspaceId: cuid,
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['DRAFT', 'ON_TRACK', 'AT_RISK', 'COMPLETED'] },
    dueDate: { type: 'string', format: 'date-time', nullable: true },
    ownerId: cuid,
    owner: User,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const ActionItem = {
  type: 'object',
  properties: {
    id: cuid,
    workspaceId: cuid,
    goalId: { ...cuid, nullable: true },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
    status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] },
    dueDate: { type: 'string', format: 'date-time', nullable: true },
    assigneeId: { ...cuid, nullable: true },
    assignee: { ...User, nullable: true },
  },
};

const Announcement = {
  type: 'object',
  properties: {
    id: cuid,
    workspaceId: cuid,
    authorId: cuid,
    title: { type: 'string' },
    bodyHtml: { type: 'string' },
    pinned: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const Notification = {
  type: 'object',
  properties: {
    id: cuid,
    recipientId: cuid,
    kind: { type: 'string', example: 'mention' },
    payload: { type: 'object' },
    readAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const AuditLog = {
  type: 'object',
  properties: {
    id: cuid,
    workspaceId: cuid,
    actorId: cuid,
    actor: User,
    action: {
      type: 'string',
      enum: [
        'CREATE', 'UPDATE', 'DELETE',
        'PIN', 'UNPIN',
        'INVITE', 'ACCEPT_INVITE', 'REVOKE_INVITE',
        'ROLE_CHANGE', 'REMOVE_MEMBER',
      ],
    },
    entityType: { type: 'string' },
    entityId: cuid,
    before: { type: 'object', nullable: true },
    after: { type: 'object', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const errorResponse = (code, description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const jsonRequest = (schemaRef) => ({
  required: true,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaRef}` } } },
});

const jsonResponse = (description, schema) => ({
  description,
  content: { 'application/json': { schema } },
});

const idParam = (name = 'id', desc = 'cuid identifier') => ({
  in: 'path',
  name,
  required: true,
  schema: cuid,
  description: desc,
});

const paginatedListMeta = {
  type: 'object',
  properties: {
    page: { type: 'integer' },
    pageSize: { type: 'integer' },
    total: { type: 'integer' },
  },
};

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Team Hub API',
    version: '0.1.0',
    description:
      'Collaborative workspace API — goals, action items, announcements, real-time presence, '
      + 'mention notifications, audit log, and analytics. JWT auth via httpOnly cookies; refresh '
      + 'tokens rotate on every use.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'local dev' }],
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Workspaces' },
    { name: 'Members' },
    { name: 'Invitations' },
    { name: 'Goals' },
    { name: 'Milestones' },
    { name: 'Action Items' },
    { name: 'Announcements' },
    { name: 'Reactions' },
    { name: 'Comments' },
    { name: 'Notifications' },
    { name: 'Analytics' },
    { name: 'Audit' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'at',
        description: 'JWT access token in httpOnly cookie. Issued by /auth/login or /auth/register.',
      },
    },
    schemas: {
      Error: errorEnvelope,
      User,
      Workspace,
      Goal,
      ActionItem,
      Announcement,
      Notification,
      AuditLog,
      AuthCredentials: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      RegisterPayload: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 1, maxLength: 80 },
        },
      },
      WorkspaceCreate: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 80 },
          description: { type: 'string', maxLength: 500 },
          accentColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        },
      },
      GoalCreate: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 2000 },
          ownerId: cuid,
          dueDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['DRAFT', 'ON_TRACK', 'AT_RISK', 'COMPLETED'] },
        },
      },
      ActionItemCreate: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string' },
          assigneeId: cuid,
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] },
          dueDate: { type: 'string', format: 'date-time' },
          goalId: cuid,
        },
      },
      AnnouncementCreate: {
        type: 'object',
        required: ['title', 'body'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          body: { type: 'string', description: 'Tiptap HTML — sanitized server-side.' },
          pinned: { type: 'boolean', default: false },
        },
      },
      CommentCreate: {
        type: 'object',
        required: ['body'],
        properties: {
          body: { type: 'string', minLength: 1, maxLength: 2000 },
          mentionUserIds: { type: 'array', items: cuid, default: [] },
        },
      },
      ReactionCreate: {
        type: 'object',
        required: ['emoji'],
        properties: { emoji: { type: 'string', minLength: 1, maxLength: 8 } },
      },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user; sets at + rt cookies.',
        security: [],
        requestBody: jsonRequest('RegisterPayload'),
        responses: {
          201: jsonResponse('Created', { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } }),
          409: errorResponse(409, 'Email already registered'),
          422: errorResponse(422, 'Validation error'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange credentials for at + rt cookies.',
        security: [],
        requestBody: jsonRequest('AuthCredentials'),
        responses: {
          200: jsonResponse('OK', { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } }),
          401: errorResponse(401, 'Invalid credentials'),
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate the refresh token cookie.',
        responses: { 200: { description: 'New cookies set' }, 401: errorResponse(401, 'Refresh token invalid') },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke refresh token and clear cookies.',
        responses: { 204: { description: 'Logged out' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current authenticated user.',
        responses: {
          200: jsonResponse('OK', { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } }),
          401: errorResponse(401, 'Unauthorized'),
        },
      },
    },

    '/users/me': {
      patch: {
        tags: ['Users'],
        summary: 'Update profile (name, avatarUrl).',
        requestBody: jsonRequest('User'),
        responses: { 200: jsonResponse('Updated', { $ref: '#/components/schemas/User' }) },
      },
    },

    '/workspaces': {
      get: {
        tags: ['Workspaces'],
        summary: 'List workspaces the current user belongs to.',
        responses: {
          200: jsonResponse('OK', {
            type: 'object',
            properties: { workspaces: { type: 'array', items: { $ref: '#/components/schemas/Workspace' } } },
          }),
        },
      },
      post: {
        tags: ['Workspaces'],
        summary: 'Create a workspace; creator becomes ADMIN.',
        requestBody: jsonRequest('WorkspaceCreate'),
        responses: { 201: jsonResponse('Created', { $ref: '#/components/schemas/Workspace' }) },
      },
    },
    '/workspaces/{id}': {
      parameters: [idParam('id', 'workspaceId')],
      get: {
        tags: ['Workspaces'],
        summary: 'Workspace detail with member/goal/item/announcement counts.',
        responses: { 200: jsonResponse('OK', { $ref: '#/components/schemas/Workspace' }) },
      },
      patch: {
        tags: ['Workspaces'],
        summary: 'Update workspace (admin only).',
        requestBody: jsonRequest('WorkspaceCreate'),
        responses: { 200: jsonResponse('OK', { $ref: '#/components/schemas/Workspace' }) },
      },
      delete: {
        tags: ['Workspaces'],
        summary: 'Delete workspace (admin only). Cascades all child rows.',
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/workspaces/{id}/members': {
      parameters: [idParam('id', 'workspaceId')],
      get: { tags: ['Members'], summary: 'List members (any member).', responses: { 200: { description: 'OK' } } },
    },
    '/workspaces/{id}/members/{userId}': {
      parameters: [idParam('id', 'workspaceId'), idParam('userId')],
      patch: {
        tags: ['Members'],
        summary: 'Change member role (admin only). Last-admin guard prevents demotion of the only admin.',
        responses: { 200: { description: 'OK' }, 409: errorResponse(409, 'Last admin') },
      },
      delete: { tags: ['Members'], summary: 'Remove member (admin only).', responses: { 204: { description: 'Removed' } } },
    },
    '/workspaces/{id}/invitations': {
      parameters: [idParam('id', 'workspaceId')],
      get: { tags: ['Invitations'], summary: 'List pending invitations (admin).', responses: { 200: { description: 'OK' } } },
      post: {
        tags: ['Invitations'],
        summary: 'Issue an invitation (admin). Returns the raw token ONCE.',
        responses: { 201: { description: 'Created — token is in invitation.token' } },
      },
    },
    '/invitations/accept': {
      post: {
        tags: ['Invitations'],
        summary: 'Accept an invitation token; creates membership atomically with token deletion.',
        responses: { 201: { description: 'Joined' }, 410: errorResponse(410, 'Token expired') },
      },
    },
    '/invitations/{id}': {
      parameters: [idParam('id', 'invitationId')],
      delete: { tags: ['Invitations'], summary: 'Revoke invitation (admin).', responses: { 204: { description: 'Revoked' } } },
    },

    '/workspaces/{id}/goals': {
      parameters: [idParam('id', 'workspaceId')],
      get: {
        tags: ['Goals'],
        summary: 'List goals (paginated, filterable by status/owner/q).',
        parameters: [
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['DRAFT', 'ON_TRACK', 'AT_RISK', 'COMPLETED'] } },
          { in: 'query', name: 'ownerId', schema: cuid },
          { in: 'query', name: 'q', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          200: jsonResponse('OK', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Goal' } },
              meta: paginatedListMeta,
            },
          }),
        },
      },
      post: {
        tags: ['Goals'],
        summary: 'Create a goal. Owner defaults to creator if omitted.',
        requestBody: jsonRequest('GoalCreate'),
        responses: { 201: jsonResponse('Created', { $ref: '#/components/schemas/Goal' }) },
      },
    },
    '/goals/{id}': {
      parameters: [idParam('id', 'goalId')],
      get: {
        tags: ['Goals'],
        summary: 'Goal with milestones and last 20 updates.',
        responses: { 200: jsonResponse('OK', { $ref: '#/components/schemas/Goal' }) },
      },
      patch: {
        tags: ['Goals'],
        summary: 'Update goal (owner OR admin). Status changes auto-create a status_change update row.',
        requestBody: jsonRequest('GoalCreate'),
        responses: { 200: jsonResponse('OK', { $ref: '#/components/schemas/Goal' }) },
      },
      delete: { tags: ['Goals'], summary: 'Delete goal (owner OR admin).', responses: { 204: { description: 'Deleted' } } },
    },
    '/goals/{id}/updates': {
      parameters: [idParam('id', 'goalId')],
      get: {
        tags: ['Goals'],
        summary: 'Cursor-paginated activity feed (newest first).',
        parameters: [
          { in: 'query', name: 'before', schema: cuid, description: 'Cursor: id of an update; returns rows with createdAt < cursor.createdAt.' },
          { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'OK' } },
      },
      post: { tags: ['Goals'], summary: 'Post a manual update (kind=post).', responses: { 201: { description: 'Created' } } },
    },
    '/goals/{id}/milestones': {
      parameters: [idParam('id', 'goalId')],
      post: {
        tags: ['Milestones'],
        summary: 'Create a milestone. Progress > 0 auto-creates a milestone_progress update.',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/milestones/{id}': {
      parameters: [idParam('id', 'milestoneId')],
      patch: { tags: ['Milestones'], summary: 'Update milestone (owner OR admin). Progress changes auto-log.', responses: { 200: { description: 'OK' } } },
      delete: { tags: ['Milestones'], summary: 'Delete milestone (owner OR admin).', responses: { 204: { description: 'Deleted' } } },
    },

    '/workspaces/{id}/action-items': {
      parameters: [idParam('id', 'workspaceId')],
      get: {
        tags: ['Action Items'],
        summary: 'List items (kanban-friendly: filter by status/assignee/priority/goal/q).',
        responses: {
          200: jsonResponse('OK', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/ActionItem' } },
              meta: paginatedListMeta,
            },
          }),
        },
      },
      post: {
        tags: ['Action Items'],
        summary: 'Create an action item.',
        requestBody: jsonRequest('ActionItemCreate'),
        responses: { 201: jsonResponse('Created', { $ref: '#/components/schemas/ActionItem' }) },
      },
    },
    '/action-items/{id}': {
      parameters: [idParam('id', 'actionItemId')],
      get: { tags: ['Action Items'], summary: 'Get one item.', responses: { 200: { description: 'OK' } } },
      patch: { tags: ['Action Items'], summary: 'Update item (any member).', responses: { 200: { description: 'OK' } } },
      delete: { tags: ['Action Items'], summary: 'Delete item (any member).', responses: { 204: { description: 'Deleted' } } },
    },

    '/workspaces/{id}/announcements': {
      parameters: [idParam('id', 'workspaceId')],
      get: {
        tags: ['Announcements'],
        summary: 'List announcements pinned-first, newest, with reaction/comment counts.',
        responses: { 200: { description: 'OK' } },
      },
      post: {
        tags: ['Announcements'],
        summary: 'Create announcement (admin only). Body sanitized server-side.',
        requestBody: jsonRequest('AnnouncementCreate'),
        responses: { 201: jsonResponse('Created', { $ref: '#/components/schemas/Announcement' }) },
      },
    },
    '/announcements/{id}': {
      parameters: [idParam('id', 'announcementId')],
      get: { tags: ['Announcements'], summary: 'Get announcement with reactions list.', responses: { 200: { description: 'OK' } } },
      patch: { tags: ['Announcements'], summary: 'Update announcement (admin). Pin toggle gets PIN/UNPIN audit action.', responses: { 200: { description: 'OK' } } },
      delete: { tags: ['Announcements'], summary: 'Delete announcement (admin).', responses: { 204: { description: 'Deleted' } } },
    },
    '/announcements/{id}/reactions': {
      parameters: [idParam('id', 'announcementId')],
      post: {
        tags: ['Reactions'],
        summary: 'Add reaction. Idempotent on (announcement, user, emoji).',
        requestBody: jsonRequest('ReactionCreate'),
        responses: { 201: { description: 'OK' } },
      },
    },
    '/announcements/{id}/reactions/{emoji}': {
      parameters: [
        idParam('id', 'announcementId'),
        { in: 'path', name: 'emoji', required: true, schema: { type: 'string' } },
      ],
      delete: { tags: ['Reactions'], summary: 'Remove reaction (idempotent — 204 even if not present).', responses: { 204: { description: 'Removed' } } },
    },
    '/announcements/{id}/comments': {
      parameters: [idParam('id', 'announcementId')],
      get: {
        tags: ['Comments'],
        summary: 'Cursor-paginated comments (newest first).',
        responses: { 200: { description: 'OK' } },
      },
      post: {
        tags: ['Comments'],
        summary:
          'Post a comment. mentionUserIds[] is filtered to actual workspace members and self-mentions are stripped; '
          + 'a Notification row is written per remaining mention in the same transaction.',
        requestBody: jsonRequest('CommentCreate'),
        responses: { 201: { description: 'Created' } },
      },
    },

    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Cursor-paginated notifications for the authenticated user. meta.unreadCount included.',
        parameters: [
          { in: 'query', name: 'unreadOnly', schema: { type: 'boolean' } },
          { in: 'query', name: 'before', schema: cuid },
          { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: jsonResponse('OK', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
              meta: { type: 'object', properties: { nextCursor: { ...cuid, nullable: true }, unreadCount: { type: 'integer' } } },
            },
          }),
        },
      },
    },
    '/notifications/{id}/read': {
      parameters: [idParam('id', 'notificationId')],
      post: { tags: ['Notifications'], summary: 'Mark one notification read.', responses: { 200: { description: 'OK' } } },
    },
    '/notifications/read-all': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark all unread notifications read for the current user.',
        responses: { 200: jsonResponse('OK', { type: 'object', properties: { updated: { type: 'integer' } } }) },
      },
    },

    '/workspaces/{id}/analytics': {
      parameters: [idParam('id', 'workspaceId')],
      get: {
        tags: ['Analytics'],
        summary: 'Dashboard aggregates: counts by status/priority, overdue, completed-by-week, top contributors.',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/workspaces/{id}/export/goals.csv': {
      parameters: [idParam('id', 'workspaceId')],
      get: { tags: ['Analytics'], summary: 'Goals CSV export (any member).', responses: { 200: { description: 'text/csv' } } },
    },
    '/workspaces/{id}/export/action-items.csv': {
      parameters: [idParam('id', 'workspaceId')],
      get: { tags: ['Analytics'], summary: 'Action items CSV export (any member).', responses: { 200: { description: 'text/csv' } } },
    },
    '/workspaces/{id}/export/audit.csv': {
      parameters: [idParam('id', 'workspaceId')],
      get: { tags: ['Analytics'], summary: 'Audit log CSV export (admin only).', responses: { 200: { description: 'text/csv' } } },
    },

    '/workspaces/{id}/audit-logs': {
      parameters: [idParam('id', 'workspaceId')],
      get: {
        tags: ['Audit'],
        summary: 'Cursor-paginated audit feed (admin only). Filter by action / entityType / actorId.',
        parameters: [
          { in: 'query', name: 'action', schema: { type: 'string' } },
          { in: 'query', name: 'entityType', schema: { type: 'string' } },
          { in: 'query', name: 'actorId', schema: cuid },
          { in: 'query', name: 'before', schema: cuid },
          { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: jsonResponse('OK', {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
              meta: { type: 'object', properties: { nextCursor: { ...cuid, nullable: true } } },
            },
          }),
        },
      },
    },
  },
};

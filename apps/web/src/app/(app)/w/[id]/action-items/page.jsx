import Placeholder from '@/components/workspace/Placeholder';

export default function ActionItemsPage() {
  return (
    <Placeholder
      title="Action Items"
      description="Kanban board (4 columns) and list view of tasks across the workspace."
      endpoints={[
        'GET    /workspaces/:id/action-items?status=&assigneeId=&priority=&goalId=&q=',
        'POST   /workspaces/:id/action-items',
        'PATCH  /action-items/:id',
        'DELETE /action-items/:id',
      ]}
      criteria={[
        'Kanban: 4 columns (TODO, IN_PROGRESS, REVIEW, DONE) via dnd-kit',
        'Optimistic status update on drop, server reconciles via action-item:updated',
        'List view: sortable by dueDate, priority, assignee, status',
        'View toggle persists per workspace in Zustand',
        'Filter combinations sync to the URL query string (shareable)',
      ]}
    />
  );
}

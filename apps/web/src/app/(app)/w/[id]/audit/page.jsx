import Placeholder from '@/components/workspace/Placeholder';

export default function AuditPage() {
  return (
    <Placeholder
      title="Audit Log"
      description="Admin-only timeline of every state-changing action."
      endpoints={[
        'GET    /workspaces/:id/audit-logs?action=&entityType=&actorId=&before=  (admin)',
        'GET    /workspaces/:id/export/audit.csv                                  (admin)',
      ]}
      criteria={[
        'Timeline list, newest first; cursor pagination via ?before=<id>',
        'Filter by action / entityType / actor',
        'Each row shows actor, action, entity, and a collapsible diff of before/after',
        'CSV export button',
      ]}
    />
  );
}

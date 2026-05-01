import Placeholder from '@/components/workspace/Placeholder';

export default function MembersPage() {
  return (
    <Placeholder
      title="Members"
      description="Workspace member list with role management and pending invitations."
      endpoints={[
        'GET    /workspaces/:id/members',
        'PATCH  /workspaces/:id/members/:userId       (admin)',
        'DELETE /workspaces/:id/members/:userId       (admin)',
        'GET    /workspaces/:id/invitations           (admin)',
        'POST   /workspaces/:id/invitations           (admin)',
        'DELETE /invitations/:id                      (admin)',
      ]}
      criteria={[
        'Member list with role + green-dot online state from socket presence',
        'Admin can promote/demote and remove (last-admin guard enforced server-side)',
        'Admin invite dialog shows the raw token ONCE (copy-link-to-clipboard)',
        'Pending invitations list with revoke action',
      ]}
    />
  );
}

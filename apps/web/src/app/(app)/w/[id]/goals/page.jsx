import Placeholder from '@/components/workspace/Placeholder';

export default function GoalsPage() {
  return (
    <Placeholder
      title="Goals"
      description="Team goals with milestones and per-goal activity feed."
      endpoints={[
        'GET    /workspaces/:id/goals?status=&ownerId=&q=',
        'POST   /workspaces/:id/goals',
        'GET    /goals/:id           (with milestones + last 20 updates)',
        'PATCH  /goals/:id           (owner OR admin)',
        'POST   /goals/:id/milestones',
        'GET    /goals/:id/updates?before=',
      ]}
      criteria={[
        'Goal detail renders title, owner avatar, due date, status pill',
        'Milestone list with progress bars',
        'Activity feed (cursor pagination, "Load older")',
        'Editing milestone progress updates overall progress in realtime for everyone',
        'Status transitions emit goal:updated over socket',
      ]}
    />
  );
}

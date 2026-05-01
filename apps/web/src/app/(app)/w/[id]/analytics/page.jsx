import Placeholder from '@/components/workspace/Placeholder';

export default function AnalyticsPage() {
  return (
    <Placeholder
      title="Analytics"
      description="Dashboard widgets + completion chart + CSV exports."
      endpoints={[
        'GET    /workspaces/:id/analytics',
        'GET    /workspaces/:id/export/goals.csv',
        'GET    /workspaces/:id/export/action-items.csv',
        'GET    /workspaces/:id/export/audit.csv     (admin)',
      ]}
      criteria={[
        'Stat cards: active goals, completed-this-week, overdue count',
        'Recharts LineChart of completedByWeek with workspace accent color',
        'Top contributors list',
        'CSV download buttons (any member: goals/items; admin: audit)',
      ]}
    />
  );
}

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckSquare, Download, Target, TrendingUp, Users } from 'lucide-react';

import api from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const STATUS_COLORS = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#0ea5e9',
  REVIEW: '#f59e0b',
  DONE: '#10b981',
};

const PRIORITY_COLORS = {
  LOW: '#94a3b8',
  MEDIUM: '#0ea5e9',
  HIGH: '#f59e0b',
  URGENT: '#ef4444',
};

const GOAL_STATUS_COLORS = {
  DRAFT: '#94a3b8',
  ON_TRACK: '#10b981',
  AT_RISK: '#f59e0b',
  COMPLETED: '#6366f1',
};

function formatWeek(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

async function downloadCsv(workspaceId, kind) {
  const res = await api.get(`/workspaces/${workspaceId}/export/${kind}.csv`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${kind}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AnalyticsView() {
  const { workspace, isAdmin } = useWorkspace();

  const dashboardQuery = useQuery({
    queryKey: ['analytics', workspace.id],
    queryFn: () => api.get(`/workspaces/${workspace.id}/analytics`).then((r) => r.data),
  });

  const data = dashboardQuery.data;

  const goalsByStatus = useMemo(
    () =>
      Object.entries(data?.goalsByStatus ?? {}).map(([name, value]) => ({
        name: name.replace('_', ' ').toLowerCase(),
        value,
        key: name,
      })),
    [data],
  );

  const itemsByStatus = useMemo(
    () =>
      Object.entries(data?.itemsByStatus ?? {}).map(([name, value]) => ({
        name: name.replace('_', ' ').toLowerCase(),
        value,
        key: name,
      })),
    [data],
  );

  const itemsByPriority = useMemo(
    () =>
      Object.entries(data?.itemsByPriority ?? {}).map(([name, value]) => ({
        name: name.toLowerCase(),
        value,
        key: name,
      })),
    [data],
  );

  const completedByWeek = useMemo(
    () =>
      (data?.completedByWeek ?? []).map((row) => ({
        week: formatWeek(row.week),
        count: row.count,
      })),
    [data],
  );

  const totalItems = itemsByStatus.reduce((s, r) => s + r.value, 0);
  const doneItems = data?.itemsByStatus?.DONE ?? 0;
  const totalGoals = goalsByStatus.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace activity at a glance — refreshes when you reload.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => downloadCsv(workspace.id, 'goals')}>
            <Download className="h-3.5 w-3.5" />
            Goals CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadCsv(workspace.id, 'action-items')}
          >
            <Download className="h-3.5 w-3.5" />
            Items CSV
          </Button>
          {isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => downloadCsv(workspace.id, 'audit')}>
              <Download className="h-3.5 w-3.5" />
              Audit CSV
            </Button>
          )}
        </div>
      </header>

      {dashboardQuery.isLoading ? (
        <SkeletonGrid />
      ) : dashboardQuery.isError ? (
        <p className="text-sm text-destructive">Failed to load analytics.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Target} label="Goals" value={totalGoals} />
            <Stat icon={CheckSquare} label="Action items" value={totalItems} />
            <Stat
              icon={TrendingUp}
              label="Completed"
              value={`${doneItems}${totalItems ? ` (${Math.round((doneItems / totalItems) * 100)}%)` : ''}`}
            />
            <Stat
              icon={AlertTriangle}
              label="Overdue"
              value={data?.overdueCount ?? 0}
              tone={data?.overdueCount ? 'danger' : 'neutral'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Items by status">
              {itemsByStatus.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={itemsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <Tooltip
                      cursor={{ fill: 'var(--color-muted)' }}
                      contentStyle={{
                        background: 'var(--color-popover)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {itemsByStatus.map((row) => (
                        <Cell key={row.key} fill={STATUS_COLORS[row.key]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Items by priority">
              {itemsByPriority.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={itemsByPriority} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={70} />
                    <Tooltip
                      cursor={{ fill: 'var(--color-muted)' }}
                      contentStyle={{
                        background: 'var(--color-popover)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {itemsByPriority.map((row) => (
                        <Cell key={row.key} fill={PRIORITY_COLORS[row.key]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Goals by status">
              {goalsByStatus.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={goalsByStatus}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {goalsByStatus.map((row) => (
                        <Cell key={row.key} fill={GOAL_STATUS_COLORS[row.key]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-popover)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Completed items per week (last 12)">
              {completedByWeek.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={completedByWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-popover)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Top contributors
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {(data?.topContributors ?? []).length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y">
                  {data.topContributors.map((c, i) => (
                    <li key={c.user.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-6 text-center text-xs font-semibold text-muted-foreground">
                        #{i + 1}
                      </span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                        {c.user.name?.[0] ?? '?'}
                      </div>
                      <p className="flex-1 truncate text-sm">{c.user.name}</p>
                      <span className="text-xs text-muted-foreground">{c.actions} actions</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-md ${
            tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty() {
  return <p className="py-10 text-center text-xs text-muted-foreground">No data yet.</p>;
}

function SkeletonGrid() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    </>
  );
}

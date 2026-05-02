'use client';

import { Calendar } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/cn';
import { PRIORITY_TONE, STATUS_TONE } from './constants';

function formatDue(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isOverdue(iso, status) {
  if (!iso || status === 'DONE') return false;
  return new Date(iso).getTime() < Date.now();
}

/**
 * @param {{ items: any[], onClick: (item: any) => void }} props
 */
export default function ListView({ items, onClick }) {
  if (items.length === 0) {
    return <EmptyState title="No items" description="Create one to get started." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="min-w-full divide-y text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Title</th>
            <th className="hidden px-3 py-2 sm:table-cell">Status</th>
            <th className="hidden px-3 py-2 sm:table-cell">Priority</th>
            <th className="hidden px-3 py-2 md:table-cell">Assignee</th>
            <th className="hidden px-3 py-2 md:table-cell">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => {
            const overdue = isOverdue(item.dueDate, item.status);
            return (
              <tr
                key={item.id}
                onClick={() => onClick(item)}
                className="cursor-pointer hover:bg-muted/40"
              >
                <td className="px-3 py-2.5">
                  <p className="line-clamp-1 font-medium">{item.title}</p>
                  {item.goal && (
                    <p className="mt-0.5 text-xs text-muted-foreground">↳ {item.goal.title}</p>
                  )}
                </td>
                <td className="hidden px-3 py-2.5 sm:table-cell">
                  <Badge tone={STATUS_TONE[item.status]}>
                    {item.status.replace('_', ' ').toLowerCase()}
                  </Badge>
                </td>
                <td className="hidden px-3 py-2.5 sm:table-cell">
                  <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority.toLowerCase()}</Badge>
                </td>
                <td className="hidden px-3 py-2.5 text-xs md:table-cell">
                  {item.assignee?.name ?? <span className="text-muted-foreground">unassigned</span>}
                </td>
                <td
                  className={cn(
                    'hidden px-3 py-2.5 text-xs md:table-cell',
                    overdue ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {item.dueDate ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDue(item.dueDate)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

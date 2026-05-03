'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/cn';
import { PRIORITY_TONE, STATUS_COLUMNS } from './constants';

function formatDue(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isOverdue(iso, status) {
  if (!iso || status === 'DONE') return false;
  return new Date(iso).getTime() < Date.now();
}

/**
 * @param {{
 *   items: any[],
 *   onClick: (item: any) => void,
 *   onStatusChange?: (itemId: string, toStatus: string) => void,
 * }} props
 */
export default function ListView({ items, onClick, onStatusChange }) {
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
                  <StatusPicker
                    status={item.status}
                    onChange={(next) => onStatusChange?.(item.id, next)}
                  />
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

/**
 * Click the status pill to swap status without opening the edit dialog.
 * Stops row-click propagation so the dropdown doesn't fight the row's onClick.
 *
 * @param {{ status: string, onChange: (next: string) => void }} props
 */
function StatusPicker({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const current = STATUS_COLUMNS.find((c) => c.key === status) ?? STATUS_COLUMNS[0];

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-90',
          current.columnCls,
          current.headerCls,
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', current.dotCls)} aria-hidden />
        {current.label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-elevated">
          {STATUS_COLUMNS.map((opt) => {
            const active = opt.key === status;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (opt.key !== status) onChange(opt.key);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent"
              >
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', opt.dotCls)} aria-hidden />
                <span className="flex-1 text-left">{opt.label}</span>
                {active && <Check className="h-3 w-3 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Target } from 'lucide-react';
import { cn } from '@/lib/cn';
import Badge from '@/components/ui/Badge';
import { PRIORITY_TONE } from './constants';

function formatDue(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isOverdue(iso, status) {
  if (!iso || status === 'DONE') return false;
  return new Date(iso).getTime() < Date.now();
}

/**
 * @param {{
 *   item: any,
 *   onClick: () => void,
 *   draggable?: boolean,
 * }} props
 */
export default function ItemCard({ item, onClick, draggable = true }) {
  const sortable = useSortable({ id: item.id, disabled: !draggable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const overdue = isOverdue(item.dueDate, item.status);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      style={draggable ? style : undefined}
      className={cn(
        'group rounded-md border bg-card p-3 text-left text-sm shadow-sm transition-shadow',
        isDragging && 'opacity-50',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
    >
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onClick}
        className="block w-full text-left"
      >
        <p className="line-clamp-2 font-medium">{item.title}</p>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        )}
      </button>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority.toLowerCase()}</Badge>
        {item.dueDate && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
              overdue ? 'bg-destructive/10 text-destructive' : 'bg-muted',
            )}
          >
            <Calendar className="h-3 w-3" />
            {formatDue(item.dueDate)}
          </span>
        )}
        {item.goal && (
          <span className="inline-flex max-w-[8rem] items-center gap-1 truncate rounded-full bg-muted px-2 py-0.5">
            <Target className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.goal.title}</span>
          </span>
        )}
        {item.assignee ? (
          <span
            className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold uppercase text-primary"
            title={item.assignee.name}
          >
            {item.assignee.name?.[0] ?? '?'}
          </span>
        ) : (
          <span className="ml-auto text-[10px] text-muted-foreground">unassigned</span>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/cn';
import EmptyState from '@/components/ui/EmptyState';
import ItemCard from './ItemCard';
import { STATUS_COLUMNS } from './constants';

/**
 * @param {{
 *   itemsByStatus: Record<string, any[]>,
 *   onMove: (itemId: string, fromStatus: string, toStatus: string) => void,
 *   onCardClick: (item: any) => void,
 * }} props
 */
export default function KanbanBoard({ itemsByStatus, onMove, onCardClick }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [activeId, setActiveId] = useState(null);

  function findStatus(itemId) {
    for (const col of STATUS_COLUMNS) {
      if ((itemsByStatus[col.key] ?? []).some((i) => i.id === itemId)) return col.key;
    }
    return null;
  }

  function handleDragEnd(event) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const fromStatus = findStatus(active.id);
    let toStatus = null;
    if (STATUS_COLUMNS.some((c) => c.key === over.id)) {
      toStatus = over.id;
    } else {
      toStatus = findStatus(over.id);
    }
    if (!fromStatus || !toStatus || fromStatus === toStatus) return;
    onMove(active.id, fromStatus, toStatus);
  }

  const activeItem =
    activeId &&
    Object.values(itemsByStatus)
      .flat()
      .find((i) => i.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(e.active.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_COLUMNS.map((col) => (
          <Column
            key={col.key}
            id={col.key}
            label={col.label}
            items={itemsByStatus[col.key] ?? []}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? <ItemCard item={activeItem} onClick={() => {}} draggable={false} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ id, label, items, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-32 flex-col rounded-lg border bg-muted/30 p-2.5 transition-colors',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
        <span className="uppercase tracking-wide">{label}</span>
        <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px]">{items.length}</span>
      </div>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {items.length === 0 ? (
            <EmptyState
              title="Empty"
              className="border-transparent bg-transparent p-4 text-[11px]"
            />
          ) : (
            items.map((item) => (
              <ItemCard key={item.id} item={item} onClick={() => onCardClick(item)} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

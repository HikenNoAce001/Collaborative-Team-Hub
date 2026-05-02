'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createActionItemSchema } from '@team-hub/schemas';

import api from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Dialog from '@/components/ui/Dialog';
import { ITEM_STATUSES, PRIORITIES } from '@team-hub/schemas';

function apiErrorMessage(err, fallback) {
  return err?.response?.data?.error?.message ?? fallback;
}

function toLocalDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Create or edit an action item. When `item` is provided we PATCH, otherwise POST.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   item?: any,
 *   onSaved: (item: any) => void,
 * }} props
 */
export default function ItemFormDialog({ open, onClose, item, onSaved }) {
  const { workspace } = useWorkspace();
  const isEdit = !!item;

  const membersQuery = useQuery({
    queryKey: ['members', workspace.id],
    queryFn: () => api.get(`/workspaces/${workspace.id}/members`).then((r) => r.data.members),
    enabled: open,
  });

  const goalsQuery = useQuery({
    queryKey: ['goals', workspace.id, { pageSize: 100 }],
    queryFn: () =>
      api.get(`/workspaces/${workspace.id}/goals`, { params: { pageSize: 100 } }).then((r) => r.data.data),
    enabled: open,
  });

  const defaultValues = useMemo(
    () => ({
      title: item?.title ?? '',
      description: item?.description ?? '',
      assigneeId: item?.assigneeId ?? '',
      priority: item?.priority ?? 'MEDIUM',
      status: item?.status ?? 'TODO',
      dueDate: toLocalDate(item?.dueDate),
      goalId: item?.goalId ?? '',
    }),
    [item],
  );

  const {
    handleSubmit,
    register,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createActionItemSchema),
    defaultValues,
  });

  // Re-seed when the item prop changes (open with a different row).
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  async function onSubmit(values) {
    const payload = {
      title: values.title,
      description: values.description || undefined,
      assigneeId: values.assigneeId || undefined,
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
      goalId: values.goalId || undefined,
    };
    try {
      const res = isEdit
        ? await api.patch(`/action-items/${item.id}`, payload)
        : await api.post(`/workspaces/${workspace.id}/action-items`, payload);
      onSaved(res.data.item);
      reset(defaultValues);
      onClose();
      toast.success(isEdit ? 'Item updated' : 'Item created');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save item'));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset(defaultValues);
        onClose();
      }}
      title={isEdit ? 'Edit action item' : 'New action item'}
      widthClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label htmlFor="ai-title" className="text-xs font-medium">
            Title
          </label>
          <Input
            id="ai-title"
            autoFocus
            placeholder="Ship auth refactor"
            {...register('title')}
            className="mt-1"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="ai-desc" className="text-xs font-medium">
            Description
          </label>
          <Textarea id="ai-desc" rows={3} {...register('description')} className="mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ai-status" className="text-xs font-medium">
              Status
            </label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select id="ai-status" {...field} className="mt-1">
                  {ITEM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ').toLowerCase()}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>

          <div>
            <label htmlFor="ai-priority" className="text-xs font-medium">
              Priority
            </label>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select id="ai-priority" {...field} className="mt-1">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p.toLowerCase()}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ai-assignee" className="text-xs font-medium">
              Assignee
            </label>
            <Controller
              control={control}
              name="assigneeId"
              render={({ field }) => (
                <Select id="ai-assignee" {...field} className="mt-1">
                  <option value="">Unassigned</option>
                  {(membersQuery.data ?? []).map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>

          <div>
            <label htmlFor="ai-due" className="text-xs font-medium">
              Due date
            </label>
            <Input id="ai-due" type="date" {...register('dueDate')} className="mt-1" />
          </div>
        </div>

        <div>
          <label htmlFor="ai-goal" className="text-xs font-medium">
            Linked goal (optional)
          </label>
          <Controller
            control={control}
            name="goalId"
            render={({ field }) => (
              <Select id="ai-goal" {...field} className="mt-1">
                <option value="">None</option>
                {(goalsQuery.data ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </Select>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              reset(defaultValues);
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create item'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

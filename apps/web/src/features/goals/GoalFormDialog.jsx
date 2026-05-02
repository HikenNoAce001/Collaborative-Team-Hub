'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createGoalSchema, GOAL_STATUSES } from '@team-hub/schemas';

import api from '@/lib/api';
import { useWorkspace } from '@/components/workspace/WorkspaceContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Dialog from '@/components/ui/Dialog';

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
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   goal?: any,
 *   onSaved: (goal: any) => void,
 * }} props
 */
export default function GoalFormDialog({ open, onClose, goal, onSaved }) {
  const { workspace } = useWorkspace();
  const isEdit = !!goal;

  const membersQuery = useQuery({
    queryKey: ['members', workspace.id],
    queryFn: () => api.get(`/workspaces/${workspace.id}/members`).then((r) => r.data.members),
    enabled: open,
  });

  const defaultValues = useMemo(
    () => ({
      title: goal?.title ?? '',
      description: goal?.description ?? '',
      ownerId: goal?.ownerId ?? '',
      status: goal?.status ?? 'DRAFT',
      dueDate: toLocalDate(goal?.dueDate),
    }),
    [goal],
  );

  const {
    handleSubmit,
    register,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createGoalSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  async function onSubmit(values) {
    const payload = {
      title: values.title,
      description: values.description || undefined,
      ownerId: values.ownerId || undefined,
      status: values.status,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
    };
    try {
      const res = isEdit
        ? await api.patch(`/goals/${goal.id}`, payload)
        : await api.post(`/workspaces/${workspace.id}/goals`, payload);
      onSaved(res.data.goal);
      reset(defaultValues);
      onClose();
      toast.success(isEdit ? 'Goal updated' : 'Goal created');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save goal'));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset(defaultValues);
        onClose();
      }}
      title={isEdit ? 'Edit goal' : 'New goal'}
      widthClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label htmlFor="goal-title" className="text-xs font-medium">
            Title
          </label>
          <Input
            id="goal-title"
            autoFocus
            placeholder="Launch v2"
            {...register('title')}
            className="mt-1"
          />
          {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="goal-desc" className="text-xs font-medium">
            Description
          </label>
          <Textarea id="goal-desc" rows={3} {...register('description')} className="mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="goal-status" className="text-xs font-medium">
              Status
            </label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select id="goal-status" {...field} className="mt-1">
                  {GOAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ').toLowerCase()}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>

          <div>
            <label htmlFor="goal-due" className="text-xs font-medium">
              Due date
            </label>
            <Input id="goal-due" type="date" {...register('dueDate')} className="mt-1" />
          </div>
        </div>

        <div>
          <label htmlFor="goal-owner" className="text-xs font-medium">
            Owner
          </label>
          <Controller
            control={control}
            name="ownerId"
            render={({ field }) => (
              <Select id="goal-owner" {...field} className="mt-1">
                <option value="">You (default)</option>
                {(membersQuery.data ?? []).map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name}
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
            {isEdit ? 'Save changes' : 'Create goal'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

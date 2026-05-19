'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema } from '@team-hub/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';

import api from '@/lib/api';
import { cn } from '@/lib/cn';

const initialOf = (name) => (name ?? '?')[0].toUpperCase();

export default function ProfilePage() {
  const qc = useQueryClient();
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [preview, setPreview] = useState(/** @type {string | null} */ (null));
  const [uploading, setUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.user),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (user?.name) reset({ name: user.name });
  }, [user?.name, reset]);

  const updateName = useMutation({
    mutationFn: (data) => api.patch('/users/me', data).then((r) => r.data.user),
    onSuccess: (u) => {
      qc.setQueryData(['me'], u);
      toast.success('Profile saved');
    },
    onError: (err) =>
      toast.error(err?.response?.data?.error?.message ?? 'Save failed'),
  });

  async function onAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be 2 MB or smaller');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Use a JPEG, PNG, or WebP image');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/users/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      qc.setQueryData(['me'], res.data.user);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message ?? 'Upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const avatarSrc = preview ?? user?.avatarUrl ?? null;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link
        href="/workspaces"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Workspaces
      </Link>

      <div className="rounded-xl border bg-card/85 p-6 shadow-elevated backdrop-blur">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your display name and avatar appear across every workspace you belong to.
        </p>

        {/* Avatar */}
        <div className="mt-6 flex items-center gap-5">
          <div className="relative">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={user?.name ?? 'Avatar'}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
                style={{ backgroundImage: 'var(--gradient-primary)' }}
              >
                {initialOf(user?.name)}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onAvatarPick}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {user?.avatarUrl ? 'Change avatar' : 'Upload avatar'}
            </button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              JPEG, PNG, or WebP · 2 MB max · cropped to a 256×256 square.
            </p>
          </div>
        </div>

        {/* Name + email */}
        <form
          onSubmit={handleSubmit((data) => updateName.mutate(data))}
          className="mt-8 space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              className={cn(
                'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                errors.name && 'border-destructive focus-visible:ring-destructive',
              )}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="flex h-9 w-full rounded-md border border-input bg-muted/40 px-3 py-1 text-sm text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Email changes are out of scope for this build.
            </p>
          </div>

          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

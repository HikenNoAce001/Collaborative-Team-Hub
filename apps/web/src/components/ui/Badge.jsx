import { cn } from '@/lib/cn';

const TONE = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
};

/**
 * @param {{ tone?: keyof typeof TONE, className?: string, children: import('react').ReactNode }} props
 */
export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

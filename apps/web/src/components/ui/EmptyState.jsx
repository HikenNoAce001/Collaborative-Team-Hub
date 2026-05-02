import { cn } from '@/lib/cn';

/**
 * @param {{
 *   icon?: import('react').ReactNode,
 *   title: string,
 *   description?: string,
 *   action?: import('react').ReactNode,
 *   className?: string,
 * }} props
 */
export default function EmptyState({ icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-8 text-center',
        className,
      )}
    >
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

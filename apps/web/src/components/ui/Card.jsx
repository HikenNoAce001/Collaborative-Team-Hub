import { cn } from '@/lib/cn';

/**
 * @param {{ className?: string, children: import('react').ReactNode }} props
 */
export function Card({ className, children }) {
  return (
    <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return <div className={cn('flex flex-col gap-1.5 p-4 sm:p-5', className)}>{children}</div>;
}

export function CardTitle({ className, children }) {
  return <h3 className={cn('text-sm font-semibold leading-none tracking-tight', className)}>{children}</h3>;
}

export function CardDescription({ className, children }) {
  return <p className={cn('text-xs text-muted-foreground', className)}>{children}</p>;
}

export function CardContent({ className, children }) {
  return <div className={cn('p-4 pt-0 sm:p-5 sm:pt-0', className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <div className={cn('flex items-center p-4 pt-0 sm:p-5 sm:pt-0', className)}>{children}</div>;
}

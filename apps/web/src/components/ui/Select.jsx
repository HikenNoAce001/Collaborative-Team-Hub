import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const Select = forwardRef(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-card px-2 py-1 text-sm shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

export default Select;

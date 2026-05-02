import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const VARIANT = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring',
  secondary:
    'border border-input bg-card hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
  ghost:
    'hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive',
};

const SIZE = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
  icon: 'h-9 w-9',
};

/**
 * @typedef {Object} ButtonProps
 * @property {'primary'|'secondary'|'ghost'|'destructive'} [variant]
 * @property {'sm'|'md'|'lg'|'icon'} [size]
 * @property {boolean} [loading]
 */

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
});

export default Button;

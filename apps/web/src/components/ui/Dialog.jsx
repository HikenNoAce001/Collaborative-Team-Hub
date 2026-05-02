'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Headless modal dialog. No third-party deps so the bundle stays lean.
 * Close on Escape + backdrop click; locks body scroll while open.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title?: string,
 *   description?: string,
 *   children: import('react').ReactNode,
 *   footer?: import('react').ReactNode,
 *   widthClassName?: string,
 * }} props
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClassName = 'max-w-md',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div
        className={cn(
          'relative z-10 w-full rounded-lg border bg-card text-card-foreground shadow-lg',
          widthClassName,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b p-4 sm:p-5">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 id="dialog-title" className="text-base font-semibold tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-m-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t bg-muted/30 p-4 sm:p-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

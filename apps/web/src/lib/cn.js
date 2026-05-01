import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * @param {...(string|undefined|null|false|Record<string,boolean>)} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

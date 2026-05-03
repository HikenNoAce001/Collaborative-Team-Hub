// Tailwind v4 needs full class strings at build time, so each column carries
// its own color tokens instead of building class names dynamically.
export const STATUS_COLUMNS = [
  {
    key: 'TODO',
    label: 'To do',
    headerCls: 'text-slate-600 dark:text-slate-300',
    dotCls: 'bg-slate-400',
    columnCls: 'border-slate-200 bg-slate-50/70 dark:border-slate-800/70 dark:bg-slate-900/40',
    countCls: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  {
    key: 'IN_PROGRESS',
    label: 'In progress',
    headerCls: 'text-blue-700 dark:text-blue-300',
    dotCls: 'bg-blue-500',
    columnCls: 'border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/40',
    countCls: 'bg-blue-200/80 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  },
  {
    key: 'REVIEW',
    label: 'Review',
    headerCls: 'text-amber-700 dark:text-amber-300',
    dotCls: 'bg-amber-500',
    columnCls: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/40',
    countCls: 'bg-amber-200/80 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  },
  {
    key: 'DONE',
    label: 'Done',
    headerCls: 'text-emerald-700 dark:text-emerald-300',
    dotCls: 'bg-emerald-500',
    columnCls: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/40',
    countCls: 'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
  },
];

export const PRIORITY_TONE = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
};

export const STATUS_TONE = {
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  REVIEW: 'warning',
  DONE: 'success',
};

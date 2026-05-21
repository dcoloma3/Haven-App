// Usage: <Badge tone="emerald" label="Stable" />
// tone: 'emerald' | 'amber' | 'rose' | 'haven' | 'slate' | 'violet'

const toneClasses = {
  emerald: {
    wrapper: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot:     'bg-emerald-500',
  },
  amber: {
    wrapper: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot:     'bg-amber-500',
  },
  rose: {
    wrapper: 'bg-rose-50 text-rose-700 border border-rose-200',
    dot:     'bg-rose-500',
  },
  haven: {
    wrapper: 'bg-haven-50 text-haven-700 border border-haven-200',
    dot:     'bg-haven-500',
  },
  slate: {
    wrapper: 'bg-slate-50 text-slate-700 border border-slate-200',
    dot:     'bg-slate-500',
  },
  violet: {
    wrapper: 'bg-violet-50 text-violet-700 border border-violet-200',
    dot:     'bg-violet-500',
  },
};

export default function Badge({ tone = 'slate', label }) {
  const classes = toneClasses[tone] ?? toneClasses.slate;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${classes.wrapper}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${classes.dot}`} />
      {label}
    </span>
  );
}

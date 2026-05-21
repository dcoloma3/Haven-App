const variantClasses = {
  primary:     'h-11 px-5 rounded-lg bg-haven-600 hover:bg-haven-700 text-white text-sm font-semibold transition-colors shadow-sm',
  secondary:   'h-11 px-5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors',
  ghost:       'h-11 px-4 rounded-lg hover:bg-slate-100 text-slate-600 text-sm font-medium transition-colors',
  destructive: 'h-11 px-5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors shadow-sm',
};

const smOverride = 'h-9 px-3.5 text-xs';

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }) {
  const base = variantClasses[variant] ?? variantClasses.primary;

  // For sm size, replace the height/padding/text portions from the variant string
  let classes = base;
  if (size === 'sm') {
    classes = base
      .replace(/h-\d+/, 'h-9')
      .replace(/px-[\d.]+/, 'px-3.5')
      .replace(/text-sm/, 'text-xs');
  }

  return (
    <button className={`${classes} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

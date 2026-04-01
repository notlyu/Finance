export default function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-500/25',
    ghost: 'bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
  };
  return (
    <button type={type} className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props} />
  );
}


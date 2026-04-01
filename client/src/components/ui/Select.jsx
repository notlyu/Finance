export default function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}


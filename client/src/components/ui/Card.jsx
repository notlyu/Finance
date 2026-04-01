export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}


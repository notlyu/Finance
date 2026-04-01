export default function EmptyState({ title = 'Нет данных', description, action, className = '' }) {
  return (
    <div className={`text-center py-10 text-gray-500 dark:text-gray-400 ${className}`}>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</div>
      {description ? <div className="text-sm mt-1">{description}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}


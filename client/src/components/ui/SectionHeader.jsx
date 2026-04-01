export default function SectionHeader({ title, subtitle, right, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle ? <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex gap-2">{right}</div> : null}
    </div>
  );
}


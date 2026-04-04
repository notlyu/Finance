export default function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`select-ghost ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

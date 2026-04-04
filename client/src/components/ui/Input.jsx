export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`input-ghost ${className}`}
      {...props}
    />
  );
}

export default function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
        checked ? 'bg-primary' : 'bg-outline-variant'
      }`}
    >
      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0.5'
      }`}></div>
    </button>
  );
}

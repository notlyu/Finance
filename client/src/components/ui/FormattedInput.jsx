import { useState, useEffect } from 'react';

export default function FormattedInput({ value, onChange, className = '', placeholder = '0', ...props }) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value === '' || value === undefined || value === null) {
      setDisplayValue('');
    } else {
      const num = Number(String(value).replace(/\s/g, ''));
      if (!isNaN(num) && num > 0) {
        setDisplayValue(formatForDisplay(num));
      }
    }
  }, [value]);

  const formatForDisplay = (num) => {
    return new Intl.NumberFormat('ru-RU', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(num);
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\s/g, '').replace(/,/g, '.');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      onChange(raw);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      {...props}
    />
  );
}

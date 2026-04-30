import { useState, useEffect, useMemo } from 'react';

export default function FormattedInput({ 
  value, 
  onChange, 
  className = '', 
  placeholder = '0',
  min = 0,
  max = 999999999,
  showValidation = true,
  label = 'Сумма',
  ...props 
}) {
  const [displayValue, setDisplayValue] = useState('');
  const [touched, setTouched] = useState(false);

  const numValue = useMemo(() => {
    const n = Number(String(value).replace(/\s/g, ''));
    return isNaN(n) ? null : n;
  }, [value]);

  const validation = useMemo(() => {
    if (!touched || value === '' || value === undefined || value === null) {
      return { isValid: true, message: '' };
    }
    if (numValue === null) {
      return { isValid: false, message: 'Введите число' };
    }
    if (numValue < min) {
      return { isValid: false, message: `${label} слишком мала. Минимум: ${min} ₽` };
    }
    if (numValue > max) {
      return { isValid: false, message: `${label} слишком большая. Максимум: ${max.toLocaleString('ru-RU')} ₽` };
    }
    return { isValid: true, message: '' };
  }, [numValue, touched, value, min, max, label]);

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

  const handleBlur = () => {
    setTouched(true);
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        className={`${className} ${showValidation && !validation.isValid ? 'border-error focus:border-error ring-2 ring-error/20' : ''}`}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        {...props}
      />
      {showValidation && !validation.isValid && (
        <p className="text-xs text-error mt-1 ml-1 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {validation.message}
        </p>
      )}
    </div>
  );
}

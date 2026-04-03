import { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { formatMoney } from '../utils/format';

export default function ForecastModal({ goal, isOpen, onClose }) {
  const [mode, setMode] = useState('term'); // 'term' (find months) or 'contribution' (find amount)
  const [inputValue, setInputValue] = useState(1000);

  useEffect(() => {
    if (isOpen && goal) {
      // Reset defaults when opening
      setMode('term');
      // Default contribution suggestion: 10% of remaining
      const remaining = Number(goal.target_amount) - Number(goal.current_amount);
      setInputValue(Math.max(1000, Math.round(remaining / 12)));
    }
  }, [isOpen, goal]);

  const calculation = useMemo(() => {
    if (!goal) return null;

    const current = Number(goal.current_amount) || 0;
    const target = Number(goal.target_amount) || 0;
    const annualRate = Number(goal.interest_rate) || 0;
    const monthlyRate = annualRate / 100 / 12;

    let result = {};

    if (mode === 'term') {
      // User inputs monthly contribution, we calculate months
      const monthlyContribution = Number(inputValue) || 0;
      if (monthlyContribution <= 0) return { months: '∞', summary: 'Введите сумму взноса' };

      if (current >= target) {
        return { months: 0, summary: 'Цель уже достигнута! 🎉' };
      }

      let months = 0;
      let balance = current;
      
      // Simple simulation loop for accuracy with compound interest
      // Limit to 600 months (50 years) to prevent infinite loops
      while (balance < target && months < 600) {
        balance += monthlyContribution;
        balance += balance * monthlyRate; // Add interest
        months++;
      }

      const years = Math.floor(months / 12);
      const remMonths = months % 12;
      let timeStr = '';
      if (years > 0) timeStr += `${years} г. `;
      if (remMonths > 0) timeStr += `${remMonths} мес.`;

      return {
        months,
        timeStr: months >= 600 ? '> 50 лет' : timeStr,
        totalContributed: monthlyContribution * months,
        totalInterest: balance - current - (monthlyContribution * months),
        summary: months >= 600 ? 'Слишком маленький взнос' : `Вы накопите через ${timeStr}`
      };

    } else {
      // User inputs months, we calculate monthly contribution
      const months = Number(inputValue) || 1;
      if (months <= 0) return { monthly: 0, summary: 'Введите срок' };

      if (current >= target) {
        return { monthly: 0, summary: 'Цель уже достигнута! 🎉' };
      }

      // Formula for Monthly Payment with Interest:
      // P = (Target - Current * (1+r)^n) * r / ((1+r)^n - 1)
      // If rate is 0: P = (Target - Current) / n
      
      let monthly = 0;
      if (monthlyRate === 0) {
        monthly = (target - current) / months;
      } else {
        const factor = Math.pow(1 + monthlyRate, months);
        monthly = ((target - current * factor) * monthlyRate) / (factor - 1);
      }

      // If monthly is negative, it means interest alone covers the goal
      if (monthly < 0) monthly = 0;

      return {
        monthly: Math.ceil(monthly),
        summary: monthly === 0 
          ? 'Проценты покроют цель без взносов!' 
          : `Нужно откладывать ${formatMoney(Math.ceil(monthly))} ₽/мес`
      };
    }
  }, [mode, inputValue, goal]);

  if (!goal) return null;

  const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Прогноз: ${goal.name}`}>
      <div className="space-y-6">
        {/* Info Block */}
        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Цель:</span>
            <span className="font-medium">{formatMoney(goal.target_amount)} ₽</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Накоплено:</span>
            <span className="font-medium text-green-600">{formatMoney(goal.current_amount)} ₽</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
            <span className="text-gray-500 dark:text-gray-400">Осталось:</span>
            <span className="font-bold text-red-600">{formatMoney(remaining)} ₽</span>
          </div>
          {goal.interest_rate > 0 && (
            <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
              <span>Ставка:</span>
              <span>{goal.interest_rate}% годовых</span>
            </div>
          )}
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => { setMode('term'); setInputValue(Math.max(1000, Math.round(remaining / 12))); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              mode === 'term' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500'
            }`}
          >
            Через сколько?
          </button>
          <button
            onClick={() => { setMode('contribution'); setInputValue(12); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              mode === 'contribution' ? 'bg-white dark:bg-gray-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500'
            }`}
          >
            Сколько платить?
          </button>
        </div>

        {/* Input Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {mode === 'term' ? 'Ежемесячный взнос' : 'Срок (месяцев)'}
            </label>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {mode === 'term' ? `${formatMoney(inputValue)} ₽` : `${inputValue} мес.`}
            </span>
          </div>
          
          <input
            type="range"
            min={mode === 'term' ? 100 : 1}
            max={mode === 'term' ? remaining : 120}
            step={mode === 'term' ? 100 : 1}
            value={inputValue}
            onChange={(e) => setInputValue(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          
          <div className="flex justify-between text-xs text-gray-400">
            <span>{mode === 'term' ? '100 ₽' : '1 мес.'}</span>
            <span>{mode === 'term' ? formatMoney(remaining) : '10 лет'}</span>
          </div>
        </div>

        {/* Result */}
        <div className={`p-4 rounded-lg text-center border ${
          calculation.months === 0 || calculation.monthly === 0
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
        }`}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Результат</p>
          <p className={`text-xl font-bold ${
             calculation.months === 0 || calculation.monthly === 0 ? 'text-green-700 dark:text-green-400' : 'text-indigo-700 dark:text-indigo-300'
          }`}>
            {mode === 'term' ? calculation.timeStr : `${formatMoney(calculation.monthly)} ₽`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{calculation.summary}</p>
        </div>

        {/* Details (only for Term mode) */}
        {mode === 'term' && calculation.months > 0 && calculation.months < 600 && (
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div>Всего взносов</div>
              <div className="font-medium text-gray-900 dark:text-white">{formatMoney(calculation.totalContributed)} ₽</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div>Проценты</div>
              <div className="font-medium text-green-600">+{formatMoney(calculation.totalInterest)} ₽</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

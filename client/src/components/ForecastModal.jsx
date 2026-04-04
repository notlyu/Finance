import { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { formatMoney } from '../utils/format';

export default function ForecastModal({ goal, isOpen, onClose }) {
  const [mode, setMode] = useState('term');
  const [inputValue, setInputValue] = useState(1000);

  useEffect(() => {
    if (isOpen && goal) {
      setMode('term');
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

    if (mode === 'term') {
      const monthlyContribution = Number(inputValue) || 0;
      if (monthlyContribution <= 0) return { months: '∞', summary: 'Введите сумму взноса' };
      if (current >= target) return { months: 0, summary: 'Цель уже достигнута! 🎉' };

      let months = 0;
      let balance = current;
      while (balance < target && months < 600) {
        balance += monthlyContribution;
        balance += balance * monthlyRate;
        months++;
      }
      const years = Math.floor(months / 12);
      const remMonths = months % 12;
      let timeStr = '';
      if (years > 0) timeStr += `${years} г. `;
      if (remMonths > 0) timeStr += `${remMonths} мес.`;

      return {
        months, timeStr: months >= 600 ? '> 50 лет' : timeStr,
        totalContributed: monthlyContribution * months,
        totalInterest: balance - current - (monthlyContribution * months),
        summary: months >= 600 ? 'Слишком маленький взнос' : `Вы накопите через ${timeStr}`
      };
    } else {
      const months = Number(inputValue) || 1;
      if (months <= 0) return { monthly: 0, summary: 'Введите срок' };
      if (current >= target) return { monthly: 0, summary: 'Цель уже достигнута! 🎉' };

      let monthly = 0;
      if (monthlyRate === 0) {
        monthly = (target - current) / months;
      } else {
        const factor = Math.pow(1 + monthlyRate, months);
        monthly = ((target - current * factor) * monthlyRate) / (factor - 1);
      }
      if (monthly < 0) monthly = 0;

      return {
        monthly: Math.ceil(monthly),
        summary: monthly === 0 ? 'Проценты покроют цель без взносов!' : `Нужно откладывать ${formatMoney(Math.ceil(monthly))} ₽/мес`
      };
    }
  }, [mode, inputValue, goal]);

  if (!goal) return null;
  const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Прогноз: ${goal.name}`}>
      <div className="space-y-6">
        {/* Info Block */}
        <div className="bg-surface-container p-4 rounded-xl text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Цель:</span>
            <span className="font-medium text-on-surface">{formatMoney(goal.target_amount)} ₽</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Накоплено:</span>
            <span className="font-medium text-secondary">{formatMoney(goal.current_amount)} ₽</span>
          </div>
          <div className="flex justify-between border-t border-outline-variant/20 pt-1 mt-1">
            <span className="text-on-surface-variant">Осталось:</span>
            <span className="font-bold text-error">{formatMoney(remaining)} ₽</span>
          </div>
          {goal.interest_rate > 0 && (
            <div className="flex justify-between text-primary">
              <span>Ставка:</span>
              <span>{goal.interest_rate}% годовых</span>
            </div>
          )}
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-surface-container p-1 rounded-xl">
          <button
            onClick={() => { setMode('term'); setInputValue(Math.max(1000, Math.round(remaining / 12))); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              mode === 'term' ? 'bg-surface-container-lowest shadow text-primary' : 'text-on-surface-variant'
            }`}
          >
            Через сколько?
          </button>
          <button
            onClick={() => { setMode('contribution'); setInputValue(12); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              mode === 'contribution' ? 'bg-surface-container-lowest shadow text-primary' : 'text-on-surface-variant'
            }`}
          >
            Сколько платить?
          </button>
        </div>

        {/* Input Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-on-surface-variant">
              {mode === 'term' ? 'Ежемесячный взнос' : 'Срок (месяцев)'}
            </label>
            <span className="text-lg font-bold text-on-surface">
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
            className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-on-surface-variant/60">
            <span>{mode === 'term' ? '100 ₽' : '1 мес.'}</span>
            <span>{mode === 'term' ? formatMoney(remaining) : '10 лет'}</span>
          </div>
        </div>

        {/* Result */}
        <div className={`p-4 rounded-xl text-center border ${
          calculation.months === 0 || calculation.monthly === 0
            ? 'bg-secondary/5 border-secondary/20'
            : 'bg-primary/5 border-primary/20'
        }`}>
          <p className="text-sm text-on-surface-variant mb-1">Результат</p>
          <p className={`text-xl font-bold ${
             calculation.months === 0 || calculation.monthly === 0 ? 'text-secondary' : 'text-primary'
          }`}>
            {mode === 'term' ? calculation.timeStr : `${formatMoney(calculation.monthly)} ₽`}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">{calculation.summary}</p>
        </div>

        {/* Details */}
        {mode === 'term' && calculation.months > 0 && calculation.months < 600 && (
          <div className="grid grid-cols-2 gap-4 text-xs text-on-surface-variant">
            <div className="text-center p-3 bg-surface-container rounded-xl">
              <div>Всего взносов</div>
              <div className="font-medium text-on-surface">{formatMoney(calculation.totalContributed)} ₽</div>
            </div>
            <div className="text-center p-3 bg-surface-container rounded-xl">
              <div>Проценты</div>
              <div className="font-medium text-secondary">+{formatMoney(calculation.totalInterest)} ₽</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

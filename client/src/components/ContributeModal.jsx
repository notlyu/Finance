import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import api from '../services/api';
import { formatMoney } from '../utils/format';
import Button from './ui/Button';
import Select from './ui/Select';
import Input from './ui/Input';

export default function ContributeModal({
  isOpen,
  onClose,
  title,
  subjectName,
  onContribute,
}) {
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [pillow, setPillow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmAllIn, setConfirmAllIn] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAmount('');
    setConfirmAllIn(false);
    (async () => {
      setLoading(true);
      try {
        const [catRes, pillowRes] = await Promise.all([
          api.get('/categories'),
          api.get('/safety-pillow/current'),
        ]);
        const expenseCats = (catRes.data || []).filter(c => c.type === 'expense');
        setCategories(expenseCats);
        const preferred = expenseCats.find(c => /накоп|сбереж/i.test(c.name)) || expenseCats[0];
        setCategoryId(preferred ? String(preferred.id) : '');
        setPillow(pillowRes.data || null);
      } catch (e) {
        console.error(e);
        setCategories([]);
        setCategoryId('');
        setPillow(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen]);

  const numericAmount = useMemo(() => {
    const n = Number(String(amount).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const freeNow = useMemo(() => {
    if (!pillow) return null;
    const current = Number(pillow.current || 0);
    const target = Number(pillow.target || 0);
    return Math.max(0, current - target);
  }, [pillow]);

  const afterCurrent = useMemo(() => {
    if (!pillow) return null;
    return Number(pillow.current || 0) - numericAmount;
  }, [pillow, numericAmount]);

  const wouldGoBelowTarget = useMemo(() => {
    if (!pillow) return false;
    const target = Number(pillow.target || 0);
    return afterCurrent != null && afterCurrent < target;
  }, [pillow, afterCurrent]);

  const isTooMuch = useMemo(() => {
    if (freeNow == null) return false;
    return numericAmount > freeNow;
  }, [numericAmount, freeNow]);

  const canSubmit = !!categoryId && numericAmount > 0 && (!isTooMuch || confirmAllIn);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">Загрузка…</div>
      ) : (
        <div className="space-y-4">
          {subjectName ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Пополнение: <span className="text-gray-900 dark:text-gray-100 font-medium">{subjectName}</span>
            </div>
          ) : null}

          <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-md p-3">
            {pillow ? (
              <div className="text-sm space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600 dark:text-gray-300">Подушка сейчас</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{formatMoney(pillow.current)} ₽</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600 dark:text-gray-300">Цель подушки</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{formatMoney(pillow.target)} ₽</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600 dark:text-gray-300">Свободно (безопасно)</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{formatMoney(freeNow)} ₽</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Не удалось загрузить данные по подушке безопасности.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сумма (₽)</label>
              <Input
                type="number"
                step="1"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Категория расхода</label>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full"
              >
                <option value="">Выберите категорию</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {pillow ? (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              После операции подушка будет примерно: <span className="font-medium">{formatMoney(afterCurrent)} ₽</span>
              {wouldGoBelowTarget ? (
                <span className="ml-2 text-red-600">Ниже цели подушки</span>
              ) : null}
            </div>
          ) : null}

          {isTooMuch ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 rounded-md p-3 text-sm">
              Вы хотите потратить больше “свободных” средств. Подушка может приблизиться к цели или стать ниже неё.
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="confirmAllIn"
                  type="checkbox"
                  checked={confirmAllIn}
                  onChange={(e) => setConfirmAllIn(e.target.checked)}
                />
                <label htmlFor="confirmAllIn">
                  Понимаю риск и всё равно хочу продолжить
                </label>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Отмена</Button>
            <Button
              variant="primary"
              disabled={!canSubmit}
              onClick={async () => {
                const cid = Number(categoryId);
                await onContribute({ amount: numericAmount, category_id: cid });
              }}
            >
              Пополнить
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}


import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import api from '../services/api';
import { formatMoney } from '../utils/format';

export default function ContributeModal({ isOpen, onClose, title, subjectName, onContribute }) {
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [pillow, setPillow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmAllIn, setConfirmAllIn] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAmount(''); setConfirmAllIn(false);
    (async () => {
      setLoading(true);
      try {
        const [catRes, pillowRes] = await Promise.all([
          api.get('/categories'), api.get('/safety-pillow/current'),
        ]);
        const expenseCats = (catRes.data || []).filter(c => c.type === 'expense');
        setCategories(expenseCats);
        const preferred = expenseCats.find(c => /накоп|сбереж/i.test(c.name)) || expenseCats[0];
        setCategoryId(preferred ? String(preferred.id) : '');
        setPillow(pillowRes.data || null);
      } catch (e) { console.error(e); setCategories([]); setCategoryId(''); setPillow(null); }
      finally { setLoading(false); }
    })();
  }, [isOpen]);

  const numericAmount = useMemo(() => { const n = Number(String(amount).replace(',', '.')); return Number.isFinite(n) ? n : 0; }, [amount]);
  const freeNow = useMemo(() => { if (!pillow) return null; return Math.max(0, Number(pillow.current || 0) - Number(pillow.target || 0)); }, [pillow]);
  const afterCurrent = useMemo(() => { if (!pillow) return null; return Number(pillow.current || 0) - numericAmount; }, [pillow, numericAmount]);
  const wouldGoBelowTarget = useMemo(() => { if (!pillow) return false; return afterCurrent != null && afterCurrent < Number(pillow.target || 0); }, [pillow, afterCurrent]);
  const isTooMuch = useMemo(() => { if (freeNow == null) return false; return numericAmount > freeNow; }, [numericAmount, freeNow]);
  const canSubmit = !!categoryId && numericAmount > 0 && (!isTooMuch || confirmAllIn);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {loading ? (
        <div className="text-sm text-on-surface-variant">Загрузка…</div>
      ) : (
        <div className="space-y-4">
          {subjectName && (
            <div className="text-sm text-on-surface-variant">
              Пополнение: <span className="text-on-surface font-medium">{subjectName}</span>
            </div>
          )}

          <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-4">
            {pillow ? (
              <div className="text-sm space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="text-on-surface-variant">Подушка сейчас</span>
                  <span className="text-on-surface font-medium">{formatMoney(pillow.current)} ₽</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-on-surface-variant">Цель подушки</span>
                  <span className="text-on-surface font-medium">{formatMoney(pillow.target)} ₽</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-on-surface-variant">Свободно (безопасно)</span>
                  <span className="text-on-surface font-medium">{formatMoney(freeNow)} ₽</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-on-surface-variant">Не удалось загрузить данные по подушке безопасности.</div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Сумма</label>
              <input type="number" step="1" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-ghost mt-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Категория</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="select-ghost mt-1">
                <option value="">Выберите</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {pillow && (
            <div className="text-sm text-on-surface-variant">
              После операции подушка: <span className="font-medium text-on-surface">{formatMoney(afterCurrent)} ₽</span>
              {wouldGoBelowTarget && <span className="ml-2 text-error">Ниже цели подушки</span>}
            </div>
          )}

          {isTooMuch && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-200 rounded-xl p-3 text-sm">
              Вы хотите потратить больше "свободных" средств. Подушка может приблизиться к цели или стать ниже неё.
              <div className="mt-2 flex items-center gap-2">
                <input id="confirmAllIn" type="checkbox" checked={confirmAllIn} onChange={(e) => setConfirmAllIn(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="confirmAllIn">Понимаю риск и всё равно хочу продолжить</label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost px-6 py-3">Отмена</button>
            <button type="button" disabled={!canSubmit} onClick={async () => { await onContribute({ amount: numericAmount, category_id: Number(categoryId) }); }} className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed">Пополнить</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

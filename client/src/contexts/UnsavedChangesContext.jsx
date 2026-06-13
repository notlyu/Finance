import { createContext, useContext, useRef, useState, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal';

// T3.2 — защита от потери несохранённых данных при переключении пространства.
// Форма помечает «грязное» состояние через setDirty(true); действия переключения
// проходят через confirmNavigation — если есть несохранённый ввод, показываем диалог.
// Без провайдера хуки деградируют в no-op (переключение происходит сразу).
const UnsavedChangesContext = createContext({
  setDirty: () => {},
  confirmNavigation: (onProceed) => onProceed(),
});

export function UnsavedChangesProvider({ children }) {
  const dirtyRef = useRef(false);
  const [pendingProceed, setPendingProceed] = useState(null);

  const setDirty = useCallback((value) => { dirtyRef.current = !!value; }, []);

  const confirmNavigation = useCallback((onProceed) => {
    if (dirtyRef.current) {
      setPendingProceed(() => onProceed); // сохраняем функцию-продолжение
    } else {
      onProceed();
    }
  }, []);

  const handleConfirm = useCallback(() => {
    const proceed = pendingProceed;
    setPendingProceed(null);
    dirtyRef.current = false;
    if (proceed) proceed();
  }, [pendingProceed]);

  return (
    <UnsavedChangesContext.Provider value={{ setDirty, confirmNavigation }}>
      {children}
      <ConfirmModal
        isOpen={!!pendingProceed}
        onClose={() => setPendingProceed(null)}
        onConfirm={handleConfirm}
        title="Несохранённые изменения"
        message="Вы заполняете операцию. Переключиться и потерять введённое?"
        confirmText="Переключиться"
        cancelText="Остаться"
        variant="warning"
      />
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}

import { useState } from 'react';
import { WIDGET_DEFINITIONS } from './widgetRegistry';

export default function WidgetEditorModal({ isOpen, onClose, widgetConfig, onSave, isFamily }) {
  const [config, setConfig] = useState([...widgetConfig]);

  if (!isOpen) return null;

  const activeWidgets = config.sort((a, b) => a.order - b.order);
  const availableWidgets = Object.values(WIDGET_DEFINITIONS).filter(def => !def.familyOnly || isFamily);

  const addWidget = (type) => {
    if (config.some(w => w.type === type)) return;
    setConfig([...config, { id: `${type}_${Date.now()}`, type, order: config.length }]);
  };

  const removeWidget = (id) => {
    setConfig(config.filter(w => w.id !== id).map((w, i) => ({ ...w, order: i })));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newConfig = [...config];
    const widget = newConfig.find(w => w.id === activeWidgets[index].id);
    const aboveWidget = newConfig.find(w => w.id === activeWidgets[index - 1].id);
    if (widget && aboveWidget) {
      const tempOrder = widget.order;
      widget.order = aboveWidget.order;
      aboveWidget.order = tempOrder;
      setConfig([...newConfig]);
    }
  };

  const moveDown = (index) => {
    if (index === activeWidgets.length - 1) return;
    const newConfig = [...config];
    const widget = newConfig.find(w => w.id === activeWidgets[index].id);
    const belowWidget = newConfig.find(w => w.id === activeWidgets[index + 1].id);
    if (widget && belowWidget) {
      const tempOrder = widget.order;
      widget.order = belowWidget.order;
      belowWidget.order = tempOrder;
      setConfig([...newConfig]);
    }
  };

  const handleSave = () => {
    onSave(config.map((w, i) => ({ ...w, order: i })));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Настройка виджетов</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active widgets */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface-variant mb-3">Активные виджеты</h3>
            <div className="space-y-2">
              {activeWidgets.map((w, i) => {
                const def = WIDGET_DEFINITIONS[w.type];
                if (!def) return null;
                return (
                  <div key={w.id} className="flex items-center gap-3 p-3 bg-surface-container rounded-2xl">
                    <span className="material-symbols-outlined text-primary">{def.icon}</span>
                    <span className="flex-1 text-sm font-medium">{def.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30">
                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                      </button>
                      <button onClick={() => moveDown(i)} disabled={i === activeWidgets.length - 1} className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30">
                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                      </button>
                      <button onClick={() => removeWidget(w.id)} className="p-1 rounded hover:bg-error/10 text-error">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {activeWidgets.length === 0 && (
                <p className="text-sm text-on-surface-variant text-center py-4">Нет активных виджетов</p>
              )}
            </div>
          </div>

          {/* Available widgets */}
          <div>
            <h3 className="text-sm font-semibold text-on-surface-variant mb-3">Доступные виджеты</h3>
            <div className="space-y-2">
              {availableWidgets.map(def => {
                const isActive = config.some(w => w.type === def.id);
                return (
                  <button
                    key={def.id}
                    onClick={() => !isActive && addWidget(def.id)}
                    disabled={isActive}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all ${
                      isActive ? 'bg-surface-container-high opacity-50 cursor-not-allowed' : 'bg-surface-container hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-primary">{def.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{def.name}</p>
                      <p className="text-xs text-on-surface-variant">{def.description}</p>
                    </div>
                    {!isActive && <span className="material-symbols-outlined text-sm">add</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold bg-surface-container text-on-surface hover:bg-surface-container-high">
            Отмена
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

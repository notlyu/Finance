import api from './api';
import logger from '../utils/logger';

function toWidgetArray(widgetData) {
  if (Array.isArray(widgetData)) return widgetData;
  if (widgetData && Array.isArray(widgetData.widgets)) {
    return widgetData.widgets.map((w, i) => {
      if (typeof w === 'string') return { id: w, type: w, order: i };
      return w;
    });
  }
  return null;
}

function toWidgetPayload(widgetArray) {
  return { widgets: widgetArray.map(w => w.type || w.id) };
}

export async function getWidgetConfig(userId, familyId) {
  try {
    const res = await api.get('/widget-config');
    const raw = familyId
      ? res.data.family_widgets
      : res.data.personal_widgets;
    return toWidgetArray(raw) || getDefaultConfig(familyId);
  } catch (e) {
    logger.warn('Failed to load widget config from API', e);
    const key = `dashboard_widgets_${userId}_${familyId || 'personal'}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(w => w.type && w.type !== 'summary');
        }
      }
    } catch (e2) {
      logger.warn('Failed to load widget config from localStorage', e2);
    }
    return getDefaultConfig(familyId);
  }
}

export async function saveWidgetConfig(userId, familyId, config) {
  const key = `dashboard_widgets_${userId}_${familyId || 'personal'}`;
  const previous = localStorage.getItem(key);
  // Optimistic update: save to localStorage first
  try {
    localStorage.setItem(key, JSON.stringify(config));
  } catch (e) {
    logger.warn('Failed to save widget config to localStorage', e);
  }
  // Then save to API
  try {
    const payload = toWidgetPayload(config);
    const data = familyId
      ? { family_widgets: payload }
      : { personal_widgets: payload };
    await api.patch('/widget-config', data);
  } catch (e) {
    logger.error('Failed to save widget config to API', e);
    // Rollback localStorage to previous value on API failure
    if (previous !== null) {
      localStorage.setItem(key, previous);
    } else {
      localStorage.removeItem(key);
    }
  }
}

function getDefaultConfig(familyId) {
  if (familyId) {
    return [
      { id: 'transactions', type: 'transactions', order: 0 },
      { id: 'allocation', type: 'allocation', order: 1 },
      { id: 'goals', type: 'goals', order: 2 },
      { id: 'memberStats', type: 'memberStats', order: 3 },
      { id: 'budgets', type: 'budgets', order: 4 },
      { id: 'recurring', type: 'recurring', order: 5 },
      { id: 'debts', type: 'debts', order: 6 },
      { id: 'safetyPillow', type: 'safetyPillow', order: 7 },
    ];
  }
  return [
    { id: 'transactions', type: 'transactions', order: 0 },
    { id: 'allocation', type: 'allocation', order: 1 },
    { id: 'goals', type: 'goals', order: 2 },
    { id: 'budgets', type: 'budgets', order: 3 },
    { id: 'recurring', type: 'recurring', order: 4 },
    { id: 'debts', type: 'debts', order: 5 },
    { id: 'safetyPillow', type: 'safetyPillow', order: 6 },
  ];
}

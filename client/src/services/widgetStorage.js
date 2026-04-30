import api from './api';

export async function getWidgetConfig(userId, familyId) {
  try {
    const res = await api.get('/widget-config');
    return familyId
      ? res.data.family_widgets || getDefaultConfig(familyId)
      : res.data.personal_widgets || getDefaultConfig(null);
  } catch (e) {
    console.error('Failed to load widget config from API', e);
    // Fallback to localStorage
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
      console.error('Failed to load widget config from localStorage', e2);
    }
    return getDefaultConfig(familyId);
  }
}

export async function saveWidgetConfig(userId, familyId, config) {
  const key = `dashboard_widgets_${userId}_${familyId || 'personal'}`;
  // Optimistic update: save to localStorage first
  try {
    localStorage.setItem(key, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save widget config to localStorage', e);
  }
  // Then save to API
  try {
    const data = familyId
      ? { family_widgets: config }
      : { personal_widgets: config };
    await api.put('/widget-config', data);
  } catch (e) {
    console.error('Failed to save widget config to API', e);
  }
}

function getDefaultConfig(familyId) {
  if (familyId) {
    return [
      { id: 'family-allocation', type: 'family-allocation', order: 0 },
      { id: 'family-transactions', type: 'family-transactions', order: 1 },
      { id: 'family-goals', type: 'family-goals', order: 2 },
    ];
  }
  return [
    { id: 'allocation', type: 'allocation', order: 0 },
    { id: 'transactions', type: 'transactions', order: 1 },
    { id: 'goals', type: 'goals', order: 2 },
  ];
}

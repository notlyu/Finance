import logger from '../utils/logger';

jest.mock('./api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  API_BASE: '/api',
}));

import api from './api';
import { getWidgetConfig, saveWidgetConfig } from './widgetStorage';

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

const userId = 'user1';
const familyId = 'family1';

describe('getWidgetConfig', () => {
  it('returns parsed personal_widgets when API succeeds and no familyId', async () => {
    api.get.mockResolvedValue({
      data: {
        personal_widgets: [
          { id: 'w1', type: 'widget-a', order: 0 },
          { id: 'w2', type: 'widget-b', order: 1 },
        ],
      },
    });

    const result = await getWidgetConfig(userId, null);
    expect(result).toEqual([
      { id: 'w1', type: 'widget-a', order: 0 },
      { id: 'w2', type: 'widget-b', order: 1 },
    ]);
  });

  it('returns parsed family_widgets when API succeeds with familyId', async () => {
    api.get.mockResolvedValue({
      data: {
        family_widgets: [
          { id: 'fw1', type: 'family-widget', order: 0 },
        ],
      },
    });

    const result = await getWidgetConfig(userId, familyId);
    expect(result).toEqual([
      { id: 'fw1', type: 'family-widget', order: 0 },
    ]);
  });

  it('falls back to localStorage when API fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    localStorage.setItem(
      `dashboard_widgets_${userId}_personal`,
      JSON.stringify([{ id: 'w1', type: 'allocation', order: 0 }]),
    );

    const result = await getWidgetConfig(userId, null);
    expect(result).toEqual([{ id: 'w1', type: 'allocation', order: 0 }]);
  });

  it('filters out summary type from localStorage fallback', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    localStorage.setItem(
      `dashboard_widgets_${userId}_personal`,
      JSON.stringify([
        { id: 'w1', type: 'allocation', order: 0 },
        { id: 'w2', type: 'summary', order: 1 },
      ]),
    );

    const result = await getWidgetConfig(userId, null);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('allocation');
  });

  it('returns defaults when both API and localStorage fail', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    const result = await getWidgetConfig(userId, null);
    expect(result).toEqual([
      { id: 'transactions', type: 'transactions', order: 0 },
      { id: 'allocation', type: 'allocation', order: 1 },
      { id: 'goals', type: 'goals', order: 2 },
      { id: 'budgets', type: 'budgets', order: 3 },
      { id: 'recurring', type: 'recurring', order: 4 },
      { id: 'debts', type: 'debts', order: 5 },
      { id: 'safetyPillow', type: 'safetyPillow', order: 6 },
    ]);
  });

  it('returns family defaults when both API and localStorage fail with familyId', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    const result = await getWidgetConfig(userId, familyId);
    expect(result).toEqual([
      { id: 'transactions', type: 'transactions', order: 0 },
      { id: 'allocation', type: 'allocation', order: 1 },
      { id: 'goals', type: 'goals', order: 2 },
      { id: 'memberStats', type: 'memberStats', order: 3 },
      { id: 'budgets', type: 'budgets', order: 4 },
      { id: 'recurring', type: 'recurring', order: 5 },
      { id: 'debts', type: 'debts', order: 6 },
      { id: 'safetyPillow', type: 'safetyPillow', order: 7 },
    ]);
  });

  it('handles widgets array as plain string array from API', async () => {
    api.get.mockResolvedValue({
      data: {
        personal_widgets: ['allocation', 'transactions'],
      },
    });

    const result = await getWidgetConfig(userId, null);
    expect(result).toEqual(['allocation', 'transactions']);
  });

  it('handles response with widgets property in object', async () => {
    api.get.mockResolvedValue({
      data: {
        personal_widgets: { widgets: ['allocation'] },
      },
    });

    const result = await getWidgetConfig(userId, null);
    expect(result).toEqual([
      { id: 'allocation', type: 'allocation', order: 0 },
    ]);
  });
});

describe('saveWidgetConfig', () => {
  const config = [
    { id: 'w1', type: 'allocation', order: 0 },
    { id: 'w2', type: 'transactions', order: 1 },
  ];

  it('saves to localStorage and calls API', async () => {
    api.patch.mockResolvedValue({});

    await saveWidgetConfig(userId, null, config);

    expect(localStorage.getItem(`dashboard_widgets_${userId}_personal`)).toBe(
      JSON.stringify(config),
    );
    expect(api.patch).toHaveBeenCalledWith('/widget-config', {
      personal_widgets: { widgets: ['allocation', 'transactions'] },
    });
  });

  it('saves with familyId uses family_widgets payload', async () => {
    api.patch.mockResolvedValue({});

    await saveWidgetConfig(userId, familyId, config);

    expect(api.patch).toHaveBeenCalledWith('/widget-config', {
      family_widgets: { widgets: ['allocation', 'transactions'] },
    });
  });

  it('rolls back localStorage on API failure', async () => {
    const previous = JSON.stringify([{ id: 'old', type: 'old', order: 0 }]);
    localStorage.setItem(`dashboard_widgets_${userId}_personal`, previous);
    api.patch.mockRejectedValue(new Error('API error'));

    await saveWidgetConfig(userId, null, config);

    expect(localStorage.getItem(`dashboard_widgets_${userId}_personal`)).toBe(previous);
  });

  it('removes localStorage key on API failure if no previous value existed', async () => {
    api.patch.mockRejectedValue(new Error('API error'));

    await saveWidgetConfig(userId, null, config);

    expect(localStorage.getItem(`dashboard_widgets_${userId}_personal`)).toBeNull();
  });

  it('handles localStorage setItem error gracefully', async () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jest.fn(() => { throw new Error('Quota exceeded'); });
    api.patch.mockResolvedValue({});

    await saveWidgetConfig(userId, null, config);

    expect(logger.warn).toHaveBeenCalled();
    localStorage.setItem = originalSetItem;
  });
});

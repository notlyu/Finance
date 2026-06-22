import { WIDGET_DEFINITIONS, getVisibleWidgets } from './widgetRegistry';

describe('widgetRegistry', () => {
  it('exports widget definitions', () => {
    expect(WIDGET_DEFINITIONS).toBeDefined();
  });

  it('has expected widget types', () => {
    const types = Object.keys(WIDGET_DEFINITIONS);
    expect(types).toContain('allocation');
    expect(types).toContain('transactions');
    expect(types).toContain('goals');
    expect(types).toContain('memberStats');
    expect(types).toContain('budgets');
    expect(types).toContain('recurring');
    expect(types).toContain('debts');
    expect(types).toContain('safetyPillow');
    expect(types).toContain('analytics');
    expect(types).toContain('family');
  });

  it('each widget has a name and icon', () => {
    Object.values(WIDGET_DEFINITIONS).forEach(def => {
      expect(def.name).toBeDefined();
      expect(typeof def.name).toBe('string');
      expect(def.icon).toBeDefined();
      expect(typeof def.icon).toBe('string');
    });
  });

  it('marks memberStats and family as familyOnly', () => {
    expect(WIDGET_DEFINITIONS.memberStats.familyOnly).toBe(true);
    expect(WIDGET_DEFINITIONS.family.familyOnly).toBe(true);
  });

  it('other widgets are not familyOnly', () => {
    const nonFamilyWidgets = Object.values(WIDGET_DEFINITIONS).filter(w => w.id !== 'memberStats' && w.id !== 'family');
    nonFamilyWidgets.forEach(w => {
      expect(w.familyOnly).toBe(false);
    });
  });

  describe('getVisibleWidgets', () => {
    const config = [
      { type: 'allocation', order: 1 },
      { type: 'memberStats', order: 2 },
      { type: 'family', order: 3 },
    ];

    it('filters out familyOnly widgets when isFamily is false', () => {
      const result = getVisibleWidgets(config, false);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('allocation');
    });

    it('shows familyOnly widgets when isFamily is true', () => {
      const result = getVisibleWidgets(config, true);
      expect(result).toHaveLength(3);
    });

    it('sorts by order', () => {
      const unsorted = [
        { type: 'budgets', order: 3 },
        { type: 'allocation', order: 1 },
        { type: 'goals', order: 2 },
      ];
      const result = getVisibleWidgets(unsorted, false);
      expect(result[0].type).toBe('allocation');
      expect(result[1].type).toBe('goals');
      expect(result[2].type).toBe('budgets');
    });

    it('returns empty array for empty config', () => {
      expect(getVisibleWidgets([], false)).toEqual([]);
    });

    it('includes unknown widget types', () => {
      const config = [
        { type: 'allocation', order: 1 },
        { type: 'nonexistent', order: 2 },
      ];
      const result = getVisibleWidgets(config, false);
      expect(result).toHaveLength(2);
    });
  });
});

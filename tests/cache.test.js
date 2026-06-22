const { Cache } = require('../lib/cache');

describe('Cache', () => {
  beforeEach(() => {
    Cache.clear();
  });

  describe('get/set', () => {
    test('устанавливает и получает значение', () => {
      Cache.set('key1', 'value1');
      expect(Cache.get('key1')).toBe('value1');
    });

    test('возвращает null для отсутствующего ключа', () => {
      expect(Cache.get('nonexistent')).toBeNull();
    });

    test('обновляет timestamp при get (LRU)', async () => {
      Cache.set('key1', 'value1');
      await new Promise(resolve => setTimeout(resolve, 10));
      Cache.get('key1');
      Cache.set('key2', 'value2');
      expect(Cache.get('key1')).toBe('value1');
    });

    test('поддерживает кастомный TTL', () => {
      Cache.set('key1', 'value1', 5000);
      expect(Cache.get('key1')).toBe('value1');
    });
  });

  describe('delete', () => {
    test('удаляет значение', () => {
      Cache.set('key1', 'value1');
      Cache.delete('key1');
      expect(Cache.get('key1')).toBeNull();
    });
  });

  describe('clear', () => {
    test('очищает весь кэш', () => {
      Cache.set('key1', 'value1');
      Cache.set('key2', 'value2');
      Cache.clear();
      expect(Cache.get('key1')).toBeNull();
      expect(Cache.get('key2')).toBeNull();
    });
  });

  describe('getStats', () => {
    test('возвращает статистику', () => {
      Cache.set('key1', 'value1');
      Cache.set('key2', 'value2');
      const stats = Cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.validEntries).toBe(2);
      expect(stats.maxSize).toBe(1000);
    });

    test('правильно считает валидные записи', async () => {
      Cache.set('key1', 'value1', 10);
      await new Promise(resolve => setTimeout(resolve, 20));
      Cache.set('key2', 'value2', 10000);
      const stats = Cache.getStats();
      expect(stats.validEntries).toBe(1);
    });
  });

  describe('cleanup', () => {
    test('удаляет истекшие записи', async () => {
      Cache.set('key1', 'value1', 10);
      await new Promise(resolve => setTimeout(resolve, 20));
      Cache.cleanup();
      expect(Cache.get('key1')).toBeNull();
    });
  });

  describe('MAX_CACHE_SIZE', () => {
    test('удаляет старые записи при превышении лимита', () => {
      for (let i = 0; i < 1001; i++) {
        Cache.set(`key${i}`, `value${i}`);
      }
      expect(Cache.get('key0')).toBeNull();
      expect(Cache.get('key1000')).toBe('value1000');
    });
  });
});

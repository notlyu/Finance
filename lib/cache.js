const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class Cache {
  static get(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  static set(key, value) {
    cache.set(key, { value, timestamp: Date.now() });
  }
  
  static delete(key) {
    cache.delete(key);
  }
  
  static clear() {
    cache.clear();
  }
  
  static getStats() {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    };
  }
}

module.exports = { cache, Cache };
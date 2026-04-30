const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default
const MAX_CACHE_SIZE = 1000; // Maximum entries

class Cache {
  static get(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > (entry.ttl || CACHE_TTL)) {
      cache.delete(key);
      return null;
    }
    
    cache.delete(key);
    cache.set(key, { ...entry, timestamp: Date.now() });
    return entry.value;
  }
  
  static set(key, value, ttl = CACHE_TTL) {
    if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(key, { value, timestamp: Date.now(), ttl });
  }
  
  static delete(key) {
    cache.delete(key);
  }
  
  static clear() {
    cache.clear();
  }
  
  static getStats() {
    let validCount = 0;
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now - entry.timestamp <= (entry.ttl || CACHE_TTL)) {
        validCount++;
      }
    }
    return {
      size: cache.size,
      validEntries: validCount,
      maxSize: MAX_CACHE_SIZE,
    };
  }
  
  static cleanup() {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now - entry.timestamp > (entry.ttl || CACHE_TTL)) {
        cache.delete(key);
      }
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => Cache.cleanup(), 60000);
}

module.exports = { cache, Cache };
const store = new Map();

const redis = {
  async set(key, val)         { store.set(key, val); return "OK"; },
  async setex(key, ttl, val)  { store.set(key, val); return "OK"; },
  async get(key)              { return store.get(key) ?? null; },
  async del(...keys)          { keys.forEach(k => store.delete(k)); return keys.length; },
  async sadd(key, ...members) {
    if (!store.has(key)) store.set(key, new Set());
    members.forEach(m => store.get(key).add(m));
    return members.length;
  },
  async srem(key, ...members) {
    const s = store.get(key);
    if (!s) return 0;
    members.forEach(m => s.delete(m));
    return members.length;
  },
  async smembers(key) { return [...(store.get(key) || new Set())]; },
  async scard(key)    { return (store.get(key) || new Set()).size; },
  async exists(key)   { return store.has(key) ? 1 : 0; },
  async keys(pattern) {
    const re = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return [...store.keys()].filter(k => re.test(k));
  },
  async expire(key, ttl) { return 1; },
};

async function connectRedis() {
  console.log("ℹ️   Redis not configured — using in-memory store");
}

module.exports = { redis, connectRedis };
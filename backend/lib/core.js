/**
 * lib/jwt.js — Token signing & verification
 * ═══════════════════════════════════════════
 */

// ─── lib/jwt.js ───────────────────────────────────────────────────
const jwt = require("jsonwebtoken");

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || "change-me-access-secret-32chars!!";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "change-me-refresh-secret-32chars!";
const ACCESS_TTL     = process.env.JWT_ACCESS_TTL     || "1h";
const REFRESH_TTL    = process.env.JWT_REFRESH_TTL    || "7d";

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
    issuer: "connectapp",
    audience: "connectapp-client",
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
    issuer: "connectapp",
    audience: "connectapp-refresh",
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET, {
    issuer: "connectapp",
    audience: "connectapp-client",
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET, {
    issuer: "connectapp",
    audience: "connectapp-refresh",
  });
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };


/**
 * lib/redis.js — Redis client (ioredis)
 * ════════════════════════════════════════
 * Falls back to a simple in-memory mock when Redis is unavailable
 * (useful for local dev without Docker).
 */

// ─── lib/redis.js (export block) ─────────────────────────────────
// This file exports connectRedis() and redis instance.
// Paste into separate file: backend/lib/redis.js

/*
const Redis  = require("ioredis");

let redis;

async function connectRedis() {
  redis = new Redis({
    host:     process.env.REDIS_HOST     || "localhost",
    port:     parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    db:       parseInt(process.env.REDIS_DB   || "0"),
    lazyConnect: true,
    retryStrategy: times => Math.min(times * 100, 3000),
  });

  await redis.connect();
  console.log("✅  Redis connected");
}

module.exports = { redis, connectRedis };
*/

// ── In-memory Redis mock (for dev without Redis) ──────────────────
const store    = new Map();
const expiries = new Map();

const redisMock = {
  async set(key, val)               { store.set(key, val); return "OK"; },
  async setex(key, ttl, val)        {
    store.set(key, val);
    const t = setTimeout(() => store.delete(key), ttl * 1000);
    expiries.set(key, t);
    return "OK";
  },
  async get(key)                    { return store.get(key) ?? null; },
  async del(...keys)                { keys.forEach(k => store.delete(k)); return keys.length; },
  async sadd(key, ...members)       {
    if (!store.has(key)) store.set(key, new Set());
    members.forEach(m => store.get(key).add(m));
    return members.length;
  },
  async srem(key, ...members)       {
    const s = store.get(key);
    if (!s) return 0;
    members.forEach(m => s.delete(m));
    return members.length;
  },
  async smembers(key)               { return [...(store.get(key) || new Set())]; },
  async scard(key)                  { return (store.get(key) || new Set()).size; },
  async exists(key)                 { return store.has(key) ? 1 : 0; },
  async keys(pattern)               {
    const re = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return [...store.keys()].filter(k => re.test(k));
  },
  async expire(key, ttl) {
    const t = setTimeout(() => store.delete(key), ttl * 1000);
    expiries.set(key, t);
    return 1;
  },
};

let redis = redisMock;

async function connectRedis() {
  // Try real Redis if configured, fall back to mock
  if (process.env.REDIS_HOST) {
    try {
      const Redis = require("ioredis");
      redis = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
      });
      await redis.connect();
      console.log("✅  Redis connected");
    } catch (err) {
      console.warn("⚠️   Redis unavailable — using in-memory mock");
      redis = redisMock;
    }
  } else {
    console.log("ℹ️   Redis not configured — using in-memory mock");
  }
}

module.exports = { redis, connectRedis, redisMock };


/**
 * lib/userStore.js — In-memory user store
 * ══════════════════════════════════════════
 * Replace with a real DB (Postgres / MongoDB) in production.
 * Interface stays identical — just swap the implementation.
 */

// ─── lib/userStore.js ─────────────────────────────────────────────
const _users = new Map();

// Seed demo user (password: "demo")
const DEMO_HASH = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NRMfTVAGa";

_users.set("demo-user-id", {
  id: "demo-user-id",
  name: "Demo User",
  email: "demo@connect.app",
  passwordHash: DEMO_HASH,
  createdAt: new Date().toISOString(),
});

const userStore = {
  findByEmail: email => [..._users.values()].find(u => u.email === email) || null,
  findById:    id    => _users.get(id) || null,
  create:      data  => { _users.set(data.id, data); return data; },
  list:        ()    => [..._users.values()].map(({ passwordHash, ...u }) => u),
};

module.exports = { userStore };


/**
 * lib/roomStore.js — In-memory room store
 * ══════════════════════════════════════════
 */

// ─── lib/roomStore.js ─────────────────────────────────────────────
const _rooms = new Map();

// Seed demo rooms
[
  { id:"r1", name:"Product Standup",   ownerName:"Alex K",  isPrivate:false, maxParticipants:12 },
  { id:"r2", name:"Design Review",     ownerName:"Sara M",  isPrivate:false, maxParticipants:8  },
  { id:"r3", name:"Eng Architecture",  ownerName:"Demo User", isPrivate:false, maxParticipants:20 },
  { id:"r4", name:"Client Demo — Q2",  ownerName:"Jordan",  isPrivate:true,  maxParticipants:6  },
].forEach(r => _rooms.set(r.id, { ...r, ownerId:"demo-user-id", createdAt: new Date().toISOString() }));

const roomStore = {
  list:     ()  => [..._rooms.values()],
  findById: id  => _rooms.get(id) || null,
  create:   data => { _rooms.set(data.id, data); return data; },
  delete:   id  => _rooms.delete(id),
};

module.exports = { roomStore };

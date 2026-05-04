/**
 * lib/userStore.js — In-memory user store
 * ════════════════════════════════════════
 * Simple in-memory user storage (replace with database in production)
 */

const users = new Map(); // Map<userId, userObject>

const userStore = {
  create(userData) {
    const user = { ...userData, createdAt: new Date() };
    users.set(user.id, user);
    return user;
  },

  findById(userId) {
    return users.get(userId) || null;
  },

  findByEmail(email) {
    for (const user of users.values()) {
      if (user.email === email) return user;
    }
    return null;
  },

  update(userId, updates) {
    const user = users.get(userId);
    if (!user) return null;
    const updated = { ...user, ...updates, id: user.id, createdAt: user.createdAt };
    users.set(userId, updated);
    return updated;
  },

  delete(userId) {
    return users.delete(userId);
  },

  all() {
    return Array.from(users.values());
  },
};

module.exports = { userStore };

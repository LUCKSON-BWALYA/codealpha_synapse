/**
 * lib/roomStore.js — In-memory room store
 * ════════════════════════════════════════
 * Simple in-memory room storage (replace with database in production)
 */

const rooms = new Map(); // Map<roomId, roomObject>

const roomStore = {
  create(roomData) {
    const room = { ...roomData };
    rooms.set(room.id, room);
    return room;
  },

  findById(roomId) {
    return rooms.get(roomId) || null;
  },

  list() {
    return Array.from(rooms.values());
  },

  update(roomId, updates) {
    const room = rooms.get(roomId);
    if (!room) return null;
    const updated = { ...room, ...updates, id: room.id, createdAt: room.createdAt };
    rooms.set(roomId, updated);
    return updated;
  },

  delete(roomId) {
    return rooms.delete(roomId);
  },

  findByOwnerId(ownerId) {
    return Array.from(rooms.values()).filter(room => room.ownerId === ownerId);
  },
};

module.exports = { roomStore };

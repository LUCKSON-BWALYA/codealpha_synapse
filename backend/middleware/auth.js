/**
 * middleware/auth.js — JWT middleware for Express routes
 * ════════════════════════════════════════════════════════
 */

const { verifyAccessToken } = require("../lib/jwt");  // adjust path per file split

function authenticateJWT(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ error: "Authorization header missing" });

  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ error: msg });
  }
}

// Socket.io token check (called inside socket handshake)
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    socket.user = verifyAccessToken(token);
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}

module.exports = { authenticateJWT, authenticateSocket };


// ═══════════════════════════════════════════════════════════════════
/**
 * sockets/signaling.js — Full Socket.io signaling + presence
 * ════════════════════════════════════════════════════════════
 *
 * Events handled:
 *  join-room        → validate room, add to Redis presence, emit room-peers
 *  offer            → relay SDP offer to target peer
 *  answer           → relay SDP answer to target peer
 *  ice-candidate    → relay ICE candidate
 *  media-state      → broadcast mute/cam/screen state
 *  chat-message     → broadcast chat to room
 *  leave-room       → clean up presence + notify peers
 *  disconnect       → same cleanup
 *
 * Presence model:
 *  Redis SET  "room:presence:{roomId}"  → JSON blobs of connected users
 *  Redis HASH "socket:room:{socketId}"  → roomId for O(1) lookup on disconnect
 */
// ═══════════════════════════════════════════════════════════════════

// Paste this into: backend/sockets/signaling.js
// and require it in server.js as: const { socketHandler } = require("./sockets/signaling")

/*
const { authenticateSocket } = require("../middleware/auth");
const { redis }              = require("../lib/redis");
const { roomStore }          = require("../lib/roomStore");

const PRESENCE = "room:presence:";
const SOCK_MAP  = "socket:room:";

function socketHandler(io) {

  // ── Auth middleware ────────────────────────────────────────────
  io.use(authenticateSocket);

  io.on("connection", socket => {
    const { sub: userId, name: username } = socket.user;
    console.log(`[ws:connect] ${username} (${socket.id})`);

    // ── join-room ──────────────────────────────────────────────
    socket.on("join-room", async ({ roomId }) => {
      const room = roomStore.findById(roomId);
      if (!room) return socket.emit("error", { message: "Room not found" });

      const presenceCount = await redis.scard(`${PRESENCE}${roomId}`);
      if (presenceCount >= room.maxParticipants)
        return socket.emit("error", { message: "Room is full" });

      // Leave previous room if any
      const prevRoom = await redis.get(`${SOCK_MAP}${socket.id}`);
      if (prevRoom) await leaveRoom(socket, prevRoom, userId, username);

      // Join
      socket.join(roomId);
      await redis.set(`${SOCK_MAP}${socket.id}`, roomId);

      const peerBlob = JSON.stringify({ socketId: socket.id, userId, username });
      await redis.sadd(`${PRESENCE}${roomId}`, peerBlob);

      // Send existing peers to joiner
      const allMembers = await redis.smembers(`${PRESENCE}${roomId}`);
      const peers = allMembers
        .map(b => { try { return JSON.parse(b); } catch { return null; } })
        .filter(p => p && p.socketId !== socket.id);

      socket.emit("room-peers", { peers });

      // Notify room
      socket.to(roomId).emit("peer-joined", { socketId: socket.id, userId, username });
      console.log(`[join] ${username} → room:${roomId}`);
    });

    // ── WebRTC signaling relays ────────────────────────────────
    socket.on("offer",         ({ to, offer     }) => io.to(to).emit("offer",         { from: socket.id, fromUsername: username, offer }));
    socket.on("answer",        ({ to, answer    }) => io.to(to).emit("answer",        { from: socket.id, answer }));
    socket.on("ice-candidate", ({ to, candidate }) => io.to(to).emit("ice-candidate", { from: socket.id, candidate }));

    // ── Media state ────────────────────────────────────────────
    socket.on("media-state", async ({ audio, video, screen }) => {
      const roomId = await redis.get(`${SOCK_MAP}${socket.id}`);
      if (roomId) socket.to(roomId).emit("peer-media-state", { socketId: socket.id, audio, video, screen });
    });

    // ── Chat ───────────────────────────────────────────────────
    socket.on("chat-message", async ({ text }) => {
      if (!text?.trim()) return;
      const roomId = await redis.get(`${SOCK_MAP}${socket.id}`);
      if (!roomId) return;
      io.to(roomId).emit("chat-message", {
        from: socket.id, userId, username,
        text: text.slice(0, 1000), // cap message length
        ts: Date.now(),
      });
    });

    // ── Leave / Disconnect ─────────────────────────────────────
    socket.on("leave-room", async ({ roomId }) => leaveRoom(socket, roomId, userId, username));
    socket.on("disconnect", async () => {
      const roomId = await redis.get(`${SOCK_MAP}${socket.id}`);
      if (roomId) await leaveRoom(socket, roomId, userId, username);
      console.log(`[ws:disconnect] ${username}`);
    });
  });

  async function leaveRoom(socket, roomId, userId, username) {
    socket.leave(roomId);
    await redis.del(`${SOCK_MAP}${socket.id}`);

    // Remove this socket from presence set
    const members = await redis.smembers(`${PRESENCE}${roomId}`);
    for (const blob of members) {
      try {
        const p = JSON.parse(blob);
        if (p.socketId === socket.id) {
          await redis.srem(`${PRESENCE}${roomId}`, blob);
          break;
        }
      } catch {}
    }

    socket.to(roomId).emit("peer-left", { socketId: socket.id, userId, username });
    console.log(`[leave] ${username} ← room:${roomId}`);
  }
}

module.exports = { socketHandler };
*/

// Exported as string above because this file consolidates multiple modules.
// In your project, split into the paths shown in the comments.
module.exports = {
  // placeholder so server.js require() doesn't crash in demo
  socketHandler: (io) => {
    console.log("Socket handler registered (stub — see comments for full impl)");
  }
};

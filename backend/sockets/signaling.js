//** connect — WebRTC Signaling Server */ 

// ─── In-memory state ─────────────────────────────────────────────
//  rooms : Map<roomId, Set<socketId>>
//  users : Map<socketId, { roomId, username, socketId }>
const rooms = new Map();
const users = new Map();

// ─── Helpers ─────────────────────────────────────────────────────
function getRoomPeers(roomId, excludeSocketId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room]
    .filter(sid => sid !== excludeSocketId)
    .map(sid => users.get(sid))
    .filter(Boolean);
}

function logRoom(roomId) {
  const room = rooms.get(roomId);
  const count = room ? room.size : 0;
  console.log(`[room:${roomId}] peers=${count}`);
}

// ─── Socket.io signaling ─────────────────────────────────────────
function socketHandler(io) {

io.on("connection", socket => {
  console.log(`[connect] ${socket.id}`);

  // ── Join room ──────────────────────────────────────────────────
  // Client emits: { roomId, username }
  // Server sends back the list of existing peers so the joiner
  // can initiate offers to each one (mesh topology).
  socket.on("join-room", ({ roomId, username }) => {
    if (!roomId || !username) return;

    // Leave any previous room
    const prev = users.get(socket.id);
    if (prev) leaveRoom(socket, prev.roomId);

    // Register user
    users.set(socket.id, { socketId: socket.id, username, roomId });

    // Add to room
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(socket.id);

    socket.join(roomId);

    // Send existing peers to the new joiner
    const existingPeers = getRoomPeers(roomId, socket.id);
    socket.emit("room-peers", { peers: existingPeers });

    // Notify existing peers that someone new joined
    socket.to(roomId).emit("peer-joined", {
      socketId: socket.id,
      username,
    });

    logRoom(roomId);
    console.log(`[join] ${username} (${socket.id}) → room:${roomId}`);
  });

  // ── WebRTC Offer ──────────────────────────────────────────────
  // Joiner → existing peer: "here's my offer SDP"
  // { to: socketId, offer: RTCSessionDescriptionInit }
  socket.on("offer", ({ to, offer }) => {
    const from = users.get(socket.id);
    if (!from || !to) return;
    io.to(to).emit("offer", {
      from: socket.id,
      fromUsername: from.username,
      offer,
    });
    console.log(`[offer] ${socket.id} → ${to}`);
  });

  // ── WebRTC Answer ─────────────────────────────────────────────
  // Existing peer → joiner: "here's my answer SDP"
  // { to: socketId, answer: RTCSessionDescriptionInit }
  socket.on("answer", ({ to, answer }) => {
    const from = users.get(socket.id);
    if (!from || !to) return;
    io.to(to).emit("answer", {
      from: socket.id,
      answer,
    });
    console.log(`[answer] ${socket.id} → ${to}`);
  });

  // ── ICE Candidate ─────────────────────────────────────────────
  // Both sides exchange ICE candidates after SDP negotiation
  // { to: socketId, candidate: RTCIceCandidateInit }
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  // ── Media state changes ───────────────────────────────────────
  // Broadcast mute/cam-off/screenshare state to room peers
  socket.on("media-state", ({ roomId, audio, video, screen }) => {
    socket.to(roomId).emit("peer-media-state", {
      socketId: socket.id,
      audio, video, screen,
    });
  });

  // ── Chat message ──────────────────────────────────────────────
  socket.on("chat-message", ({ roomId, text }) => {
    const user = users.get(socket.id);
    if (!user || !text) return;
    io.to(roomId).emit("chat-message", {
      from: socket.id,
      username: user.username,
      text,
      ts: Date.now(),
    });
  });

  // ── Leave / Disconnect ────────────────────────────────────────
  socket.on("leave-room", ({ roomId }) => leaveRoom(socket, roomId));

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) leaveRoom(socket, user.roomId);
    console.log(`[disconnect] ${socket.id}`);
  });
});
}

function leaveRoom(socket, roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(socket.id);
    if (room.size === 0) rooms.delete(roomId);
  }
  users.delete(socket.id);
  socket.leave(roomId);
  socket.to(roomId).emit("peer-left", { socketId: socket.id });
  logRoom(roomId);
}

module.exports = { socketHandler };

/**
 * ═══════════════════════════════════════════════════════════════
 *  SIGNALING FLOW DIAGRAM
 * ═══════════════════════════════════════════════════════════════
 *
 *  Peer A (already in room)      Server        Peer B (joining)
 *       |                          |                 |
 *       |                          |←─ join-room ────|
 *       |                          |─ room-peers ───→|  (A's info)
 *       |←────── peer-joined ──────|                 |
 *       |                          |                 |
 *       |  B creates PeerConnection & sends offer    |
 *       |←──────────── offer ──────────────────────←|
 *       |  A creates PeerConnection & sends answer   |
 *       |───────────── answer ────────────────────→ |
 *       |                          |                 |
 *       |←─── ice-candidate ───────────────────────←|
 *       |───── ice-candidate ──────────────────────→|
 *       |                          |                 |
 *       |   ====  P2P media flows directly  ====    |
 *       |                          |                 |
 *
 * ═══════════════════════════════════════════════════════════════
 */

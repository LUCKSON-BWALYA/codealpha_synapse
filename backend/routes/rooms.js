/**
 * Room Routes — /api/rooms  (all JWT-protected)
 * ═══════════════════════════════════════════════
 * GET    /           — list all rooms
 * POST   /           — create room
 * GET    /:id        — get room + live participants from Redis
 * DELETE /:id        — delete room (owner only)
 * POST   /:id/invite — generate invite link
 */

const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { redis }      = require("../lib/redis");
const { roomStore }  = require("../lib/roomStore");

const PRESENCE_PREFIX = "room:presence:";
const ROOM_TTL        = 60 * 60 * 24; // 24h

// ── GET /api/rooms ────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const rooms = roomStore.list();
    // Enrich with live participant counts from Redis
    const enriched = await Promise.all(
      rooms.map(async room => {
        const count = await redis.scard(`${PRESENCE_PREFIX}${room.id}`);
        return { ...room, liveCount: count };
      })
    );
    res.json({ rooms: enriched });
  } catch (err) { next(err); }
});

// ── POST /api/rooms ───────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const { name, description, maxParticipants = 12, isPrivate = false } = req.body;
    if (!name) return res.status(400).json({ error: "Room name required" });

    const room = roomStore.create({
      id: uuidv4(),
      name,
      description: description || "",
      ownerId: req.user.sub,
      ownerName: req.user.name,
      maxParticipants,
      isPrivate,
      createdAt: new Date().toISOString(),
    });

    // Persist room meta in Redis (for cross-process access)
    await redis.setex(
      `room:meta:${room.id}`,
      ROOM_TTL,
      JSON.stringify(room)
    );

    res.status(201).json({ room });
  } catch (err) { next(err); }
});

// ── GET /api/rooms/:id ────────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const room = roomStore.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });

    // Get live participants from Redis set
    const presenceKeys = await redis.smembers(`${PRESENCE_PREFIX}${room.id}`);
    const participants = presenceKeys.map(raw => {
      try { return JSON.parse(raw); } catch { return null; }
    }).filter(Boolean);

    res.json({ room: { ...room, participants, liveCount: participants.length } });
  } catch (err) { next(err); }
});

// ── DELETE /api/rooms/:id ─────────────────────────────────────────
router.delete("/:id", async (req, res, next) => {
  try {
    const room = roomStore.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.ownerId !== req.user.sub)
      return res.status(403).json({ error: "Only the room owner can delete it" });

    roomStore.delete(req.params.id);
    await redis.del(`room:meta:${room.id}`);
    await redis.del(`${PRESENCE_PREFIX}${room.id}`);

    res.json({ message: "Room deleted" });
  } catch (err) { next(err); }
});

// ── POST /api/rooms/:id/invite ────────────────────────────────────
router.post("/:id/invite", async (req, res, next) => {
  try {
    const room = roomStore.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const token = uuidv4().replace(/-/g, "").slice(0, 12);
    // Store invite token in Redis for 24h
    await redis.setex(`invite:${token}`, 60 * 60 * 24, req.params.id);

    const inviteUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/join/${token}`;
    res.json({ inviteUrl, token });
  } catch (err) { next(err); }
});

module.exports = router;

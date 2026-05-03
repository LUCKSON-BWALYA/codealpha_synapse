/** Auth Routes - /api/auth 
 * POST /register -create acount (bcrypt password hash)
 * POST /login
 * POST /refresh
 * POST /logout
*/

const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken, 
} = require("../lib/jwt");
const { redis } = require("../lib/redis");
const { userStore } = require("../lib/userStore");

const SALT_ROUNDS    = 12;
const REFRESH_TTL    = 60 * 60 * 24 * 7; // 7 days in seconds
const REFRESH_PREFIX = "refresh";

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password)
            return res.status(400).json({ error: "name, email and password are require"});

        if (password.length < 8)
            return res.status(400).json({ error: "Password must be at least 8 characters"});

        if (userStore.findByEmail(email))
            return res.status(400).json({ error: "Email already registered"});

        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = userStore.create({ id: uuidv4(), name, email, passwordHash: hash });

        res.status(201).json({
            message: "Account Created",
            user: { id: user.id, name: user.name, email: user.email},
        });
    } catch (err) { next(err);}
});

//POST /api/auth/login
router.post("/login", async ( req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: "Email and password required"});

        const user = userStore.findByEmail(email);
        if (!user)
            return res.status(401).json({ error: "Invalid Credentails"});

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            return res.status(401).json({ error: "Invalid credentials"});

        //Issue Token
        const accessToken  = signAccessToken({ sub: user.id, name: user.name, email: user.email });
    const refreshToken = signRefreshToken({ sub: user.id });
    const jti          = uuidv4();

    // Store refresh token in Redis with TTL
    await redis.setex(`${REFRESH_PREFIX}${user.id}:${jti}`, REFRESH_TTL, refreshToken);

    res.json({
      accessToken,
      refreshToken,
      jti,
      user: { id: user.id, name: user.name, email: user.email },
    });
    } catch (err) { next(err);}
});

// ── POST /api/auth/refresh ────────────────────────────────────────
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken, jti } = req.body;
    if (!refreshToken || !jti)
      return res.status(400).json({ error: "refreshToken and jti required" });

    // Verify signature
    let payload;
    try { payload = verifyRefreshToken(refreshToken); }
    catch { return res.status(401).json({ error: "Invalid or expired refresh token" }); }

    // Check Redis (token still valid / not revoked)
    const stored = await redis.get(`${REFRESH_PREFIX}${payload.sub}:${jti}`);
    if (!stored)
      return res.status(401).json({ error: "Refresh token revoked or expired" });

    const user = userStore.findById(payload.sub);
    if (!user)
      return res.status(401).json({ error: "User not found" });

    // Rotate: delete old, issue new
    await redis.del(`${REFRESH_PREFIX}${payload.sub}:${jti}`);
    const newAccess  = signAccessToken({ sub: user.id, name: user.name, email: user.email });
    const newRefresh = signRefreshToken({ sub: user.id });
    const newJti     = uuidv4();
    await redis.setex(`${REFRESH_PREFIX}${user.id}:${newJti}`, REFRESH_TTL, newRefresh);

    res.json({ accessToken: newAccess, refreshToken: newRefresh, jti: newJti });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ─────────────────────────────────────────
router.post("/logout", async (req, res, next) => {
  try {
    const { userId, jti } = req.body;
    if (userId && jti) {
      await redis.del(`${REFRESH_PREFIX}${userId}:${jti}`);
    }
    res.json({ message: "Logged out" });
  } catch (err) { next(err); }
});

module.exports = router;

/**
 * middleware/auth.js — JWT middleware for Express routes
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
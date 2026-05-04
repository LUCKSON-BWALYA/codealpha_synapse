/**
 * lib/jwt.js — Token signing & verification
 * ═══════════════════════════════════════════
 */

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

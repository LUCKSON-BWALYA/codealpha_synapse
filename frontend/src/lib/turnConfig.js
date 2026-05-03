// ═══════════════════════════════════════════════════════════════════
// 2.  turn-config.js  —  ICE / TURN server configuration (frontend)
//     File: frontend/src/lib/turnConfig.js
// ═══════════════════════════════════════════════════════════════════

/**
 * ICE Server Configuration
 * ─────────────────────────
 * STUN  : discovers public IP (free, no relay)
 * TURN  : relays media through server (needed when P2P fails)
 *         ~15-20% of calls need TURN (symmetric NAT, corporate firewalls)
 *
 * Recommended TURN providers:
 *   - Self-hosted Coturn  (see Docker section below)
 *   - Twilio TURN         (pay-per-use, reliable)
 *   - Cloudflare Calls    (generous free tier)
 *   - Metered.ca          (free tier available)
 */

export function getIceServers() {
  const servers = [
    // ── STUN (always include multiple for redundancy) ────────────
    { urls: "stun:stun.l.google.com:19302"  },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  // ── TURN (add your credentials from .env) ─────────────────────
  const turnUrl  = process.env.REACT_APP_TURN_URL;
  const turnUser = process.env.REACT_APP_TURN_USERNAME;
  const turnCred = process.env.REACT_APP_TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    servers.push(
      // UDP — fastest when available
      { urls: `turn:${turnUrl}:3478?transport=udp`, username: turnUser, credential: turnCred },
      // TCP — fallback through restrictive firewalls
      { urls: `turn:${turnUrl}:3478?transport=tcp`, username: turnUser, credential: turnCred },
      // TLS — last resort, port 443 almost never blocked
      { urls: `turns:${turnUrl}:443?transport=tcp`, username: turnUser, credential: turnCred },
    );
  }

  return { iceServers: servers, iceCandidatePoolSize: 10 };
}

/**
 * TURN credential rotation (time-limited HMAC credentials)
 * ──────────────────────────────────────────────────────────
 * Rather than hard-coding TURN credentials, fetch short-lived
 * credentials from your backend before each call.
 *
 * Backend endpoint: GET /api/turn-credentials
 * Returns: { username, credential, ttl }
 */
export async function fetchTurnCredentials(accessToken) {
  const res = await fetch("/api/turn-credentials", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json(); // { urls, username, credential }
}

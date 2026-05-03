// ═══════════════════════════════════════════════════════════════════
// 1.  crypto.js  —  AES-256-GCM via Web Crypto API (runs in browser)
//     File: frontend/src/lib/crypto.js
// ═══════════════════════════════════════════════════════════════════

/**
 * ConnectApp Encryption — AES-256-GCM
 * ──────────────────────────────────────
 * All file and message content is encrypted client-side before
 * leaving the browser. The server never sees plaintext.
 *
 * Key derivation : PBKDF2-SHA256, 200,000 iterations
 * Encryption     : AES-256-GCM (authenticated encryption)
 * IV             : 12-byte random per message/file (never reused)
 * Salt           : 16-byte random per room session
 */

const crypto = window.crypto || globalThis.crypto;
const subtle = crypto.subtle;

// ── Key derivation ────────────────────────────────────────────────
/**
 * Derive an AES-256-GCM key from a shared room password.
 * In a production E2E system the "password" would be a Diffie-Hellman
 * shared secret established via Signal/X3DH protocol.
 */
export async function deriveKey(password, salt) {
  const enc  = new TextEncoder();
  const base = await subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 200_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,         // not extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Generate a new random salt (16 bytes).
 * Share this salt with room peers via the signaling channel.
 */
export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

// ── Encrypt ───────────────────────────────────────────────────────
/**
 * Encrypt a File or Blob before sending.
 * Returns: { ciphertext: ArrayBuffer, iv: Uint8Array }
 *
 * The IV must be transmitted alongside the ciphertext.
 * It is NOT secret — but MUST be unique per encryption.
 */
export async function encryptFile(file, key) {
  const iv         = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const plaintext  = await file.arrayBuffer();
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { ciphertext, iv };
}

/**
 * Encrypt a UTF-8 string (for chat messages).
 * Returns base64url-encoded ciphertext with prepended IV.
 */
export async function encryptMessage(text, key) {
  const enc        = new TextEncoder();
  const iv         = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));

  // Pack: [12-byte IV][ciphertext] → base64url
  const packed = new Uint8Array(12 + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), 12);
  return btoa(String.fromCharCode(...packed))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── Decrypt ───────────────────────────────────────────────────────
/**
 * Decrypt an ArrayBuffer to a Blob (file restoration).
 * @param {ArrayBuffer} ciphertext
 * @param {Uint8Array}  iv
 * @param {CryptoKey}   key
 * @param {string}      mimeType
 */
export async function decryptFile(ciphertext, iv, key, mimeType = "application/octet-stream") {
  const plaintext = await subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new Blob([plaintext], { type: mimeType });
}

/**
 * Decrypt a base64url-packed message.
 */
export async function decryptMessage(packed, key) {
  // Reverse base64url
  const b64   = packed.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv    = bytes.slice(0, 12);
  const ct    = bytes.slice(12).buffer;
  const plain = await subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(plain);
}

// ── Key fingerprint ───────────────────────────────────────────────
/**
 * SHA-256 fingerprint of a key's exported bytes.
 * Display this to users to verify they share the same room key
 * (similar to Signal's Safety Numbers).
 */
export async function keyFingerprint(key) {
  const raw    = await subtle.exportKey("raw", key);
  const hash   = await subtle.digest("SHA-256", raw);
  const hex    = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("");
  // Format as 8 groups of 8 hex chars: "a1b2c3d4 e5f6a7b8 ..."
  return hex.match(/.{8}/g).join(" ");
}

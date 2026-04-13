import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Stored under `backend/` (not committed — see root `.gitignore`). */
export const FLOWCV_SESSION_FILE = join(__dirname, '..', '..', '.flowcv-session.json');

/**
 * @returns {string | null}
 */
export function readStoredCookie() {
  try {
    if (!existsSync(FLOWCV_SESSION_FILE)) return null;
    const raw = readFileSync(FLOWCV_SESSION_FILE, 'utf8');
    const data = JSON.parse(raw);
    const cookie = data?.cookie;
    return typeof cookie === 'string' && cookie.trim() ? cookie.trim() : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} cookie
 */
export function writeStoredCookie(cookie) {
  const payload = {
    cookie: String(cookie).trim(),
    savedAt: new Date().toISOString(),
  };
  try {
    writeFileSync(FLOWCV_SESSION_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // On serverless (e.g. Vercel), the filesystem may be read-only/ephemeral.
    // Safe to ignore — we'll re-login when needed.
  }
}

export function clearStoredSession() {
  try {
    if (existsSync(FLOWCV_SESSION_FILE)) unlinkSync(FLOWCV_SESSION_FILE);
  } catch {
    /* ignore */
  }
}

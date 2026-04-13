import { flowCvLogin } from './auth.js';
import { FLOWCV_EMAIL, FLOWCV_PASSWORD } from './flowcvCredentials.js';
import {
  readStoredCookie,
  writeStoredCookie,
  clearStoredSession,
} from './sessionStore.js';

/** In-memory FlowCV session cookie (hydrated from disk or login). */
let memoryCookie = '';

/**
 * Current session cookie for FlowCV API calls (empty if not initialized).
 */
export function getFlowCvCookie() {
  return memoryCookie || '';
}

/**
 * Load cookie from disk, or log in and persist. Safe to call multiple times.
 * @returns {Promise<{ ok: true, source: 'memory' | 'disk' | 'login' }>}
 */
export async function initializeFlowCvSession() {
  if (memoryCookie) {
    return { ok: true, source: 'memory' };
  }

  const fromDisk = readStoredCookie();
  if (fromDisk) {
    memoryCookie = fromDisk;
    return { ok: true, source: 'disk' };
  }

  if (!FLOWCV_EMAIL || !FLOWCV_PASSWORD) {
    throw new Error('Missing FlowCV credentials. Set FLOWCV_EMAIL and FLOWCV_PASSWORD environment variables.');
  }

  const { cookie } = await flowCvLogin(FLOWCV_EMAIL, FLOWCV_PASSWORD);
  memoryCookie = cookie;
  writeStoredCookie(cookie);
  return { ok: true, source: 'login' };
}

/**
 * Drop disk + memory session and log in again (e.g. after HTTP 401).
 */
export async function refreshFlowCvSession() {
  memoryCookie = '';
  clearStoredSession();
  if (!FLOWCV_EMAIL || !FLOWCV_PASSWORD) {
    throw new Error('Missing FlowCV credentials. Set FLOWCV_EMAIL and FLOWCV_PASSWORD environment variables.');
  }
  const { cookie } = await flowCvLogin(FLOWCV_EMAIL, FLOWCV_PASSWORD);
  memoryCookie = cookie;
  writeStoredCookie(cookie);
  return { ok: true, source: 'login' };
}

let initInFlight = null;

/**
 * Ensures a cookie exists (used before FlowCV calls if startup init failed).
 */
export function ensureFlowCvSession() {
  if (memoryCookie) return Promise.resolve();
  if (!initInFlight) {
    initInFlight = initializeFlowCvSession().finally(() => {
      initInFlight = null;
    });
  }
  return initInFlight;
}

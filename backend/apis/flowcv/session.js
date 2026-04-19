import { flowCvLogin } from './auth.js';
import { fetchFlowCvResumesAll } from './fetchResumesAll.js';
import { flowCvRequestContext } from './flowCvRequestContext.js';
import {
  readStoredSession,
  writeStoredCookie,
  clearStoredSession,
} from './sessionStore.js';

/** In-memory FlowCV session cookie (hydrated from disk or login). */
let memoryCookie = '';

/** Email for the current in-memory session (UI login). */
let sessionEmail = '';

/** FlowCV resume `id` from GET resumes/all (first resume after login unless set). */
let memoryResumeId = '';

/** Snapshot of `resume.personalDetails` from resumes/all for the active resume. */
let memoryPersonalDetailsTemplate = null;

/** Snapshot of `resume.content` from resumes/all (profile, work, skill, custom1, …). */
let memoryResumeContent = null;

function clonePlain(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function resumeContentHasProfile(content) {
  return Boolean(
    content &&
      typeof content === 'object' &&
      Array.isArray(content.profile?.entries) &&
      content.profile.entries.length > 0,
  );
}

function persistSessionFile() {
  if (!memoryCookie) return;
  writeStoredCookie(
    memoryCookie,
    sessionEmail || undefined,
    memoryResumeId || undefined,
    memoryPersonalDetailsTemplate != null
      ? clonePlain(memoryPersonalDetailsTemplate)
      : undefined,
    memoryResumeContent != null ? clonePlain(memoryResumeContent) : undefined,
  );
}

/**
 * FlowCV resume id for save/download/sync (session + persisted resumes/all).
 */
export function getFlowCvActiveResumeId() {
  const incoming = flowCvRequestContext.getStore();
  const fromCtx = String(incoming?.resumeId || '').trim();
  if (fromCtx) return fromCtx;
  const m = String(memoryResumeId || '').trim();
  if (m) return m;
  const stored = readStoredSession();
  return String(stored?.resumeId || '').trim();
}

/**
 * Deep clone of FlowCV `personalDetails` for the active resume (from resumes/all), or null.
 */
export function getFlowCvPersonalDetailsTemplate() {
  if (memoryPersonalDetailsTemplate != null) {
    return clonePlain(memoryPersonalDetailsTemplate);
  }
  const s = readStoredSession();
  if (s?.personalDetails && typeof s.personalDetails === 'object') {
    memoryPersonalDetailsTemplate = clonePlain(s.personalDetails);
    return clonePlain(memoryPersonalDetailsTemplate);
  }
  return null;
}

/**
 * Deep clone of `resume.content` from resumes/all for the active resume, or null.
 */
export function getFlowCvResumeContent() {
  if (memoryResumeContent != null) {
    return clonePlain(memoryResumeContent);
  }
  const s = readStoredSession();
  if (s?.resumeContent && typeof s.resumeContent === 'object') {
    memoryResumeContent = clonePlain(s.resumeContent);
    return clonePlain(memoryResumeContent);
  }
  return null;
}

/**
 * Set active resume id (must match a resume in the account). Persists with session cookie.
 * Call {@link syncActiveResumeFromFlowCvApi} afterward to refresh snapshots from FlowCV.
 * @param {string} resumeId
 */
export function setFlowCvActiveResumeId(resumeId) {
  const id = String(resumeId || '').trim();
  if (!id) throw new Error('resumeId is required');
  memoryResumeId = id;
  persistSessionFile();
}

/**
 * Fetch resumes/all and sync active resume id + personalDetails + content from the matching resume.
 */
export async function syncActiveResumeFromFlowCvApi() {
  const cookie = getFlowCvCookie();
  if (!cookie) return;
  try {
    const body = await fetchFlowCvResumesAll({ cookie });
    const resumes = body?.data?.resumes;
    if (!Array.isArray(resumes) || resumes.length === 0) {
      console.warn('[FlowCV] resumes/all returned no resumes');
      return;
    }
    const wanted = String(memoryResumeId || '').trim();
    let target = resumes[0];
    if (wanted) {
      const found = resumes.find((r) => String(r?.id || '').trim() === wanted);
      if (found) target = found;
    }
    const rid = String(target?.id || '').trim();
    if (!rid) return;
    memoryResumeId = rid;
    const pd = target?.personalDetails;
    if (pd && typeof pd === 'object') {
      memoryPersonalDetailsTemplate = clonePlain(pd);
    }
    const content = target?.content;
    if (content && typeof content === 'object') {
      memoryResumeContent = clonePlain(content);
    }
    persistSessionFile();
  } catch (err) {
    console.warn('[FlowCV] Could not sync resume snapshot from resumes/all:', err?.message || err);
  }
}

/**
 * Ensures personalDetails + resume.content exist (loads from disk or resumes/all).
 */
export async function ensureFlowCvPersonalDetailsTemplate() {
  if (getFlowCvPersonalDetailsTemplate() && resumeContentHasProfile(getFlowCvResumeContent())) {
    return;
  }
  await syncActiveResumeFromFlowCvApi();
}

/**
 * Current session cookie for FlowCV API calls (empty if not initialized).
 */
export function getFlowCvCookie() {
  const incoming = flowCvRequestContext.getStore();
  if (incoming?.sessionCookie) return incoming.sessionCookie;
  if (memoryCookie) return memoryCookie;
  return readStoredCookie() || '';
}

/**
 * @returns {{ connected: boolean, email: string, resumeId: string }}
 */
export function getFlowCvSessionInfo() {
  const incoming = flowCvRequestContext.getStore();
  if (incoming?.sessionCookie) {
    return {
      connected: true,
      email: incoming.email || sessionEmail || '',
      resumeId: getFlowCvActiveResumeId(),
    };
  }
  if (memoryCookie) {
    return {
      connected: true,
      email: sessionEmail || '',
      resumeId: getFlowCvActiveResumeId(),
    };
  }
  const stored = readStoredSession();
  const rid = String(stored?.resumeId || '').trim();
  return {
    connected: Boolean(stored?.cookie),
    email: stored?.email || '',
    resumeId: rid,
  };
}

/**
 * Sign in with FlowCV credentials (app.flowcv.com). Persists session cookie server-side.
 * Fetches GET resumes/all and stores resume id, personalDetails, and content for subsequent API calls.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ ok: true, email: string, resumeId: string } | { ok: false }>}
 */
export async function loginFlowCvSession(email, password) {
  const e = String(email ?? '').trim();
  const p = String(password ?? '');
  if (!e || !p) {
    throw new Error('Email and password are required');
  }
  const loginResult = await flowCvLogin(e, p);
  if (loginResult === false) {
    return { ok: false };
  }
  const { cookie } = loginResult;
  memoryCookie = cookie;
  sessionEmail = e;
  memoryResumeId = '';
  memoryPersonalDetailsTemplate = null;
  memoryResumeContent = null;
  writeStoredCookie(memoryCookie, sessionEmail);
  await syncActiveResumeFromFlowCvApi();
  return { ok: true, email: sessionEmail, resumeId: getFlowCvActiveResumeId() };
}

export function logoutFlowCvSession() {
  memoryCookie = '';
  sessionEmail = '';
  memoryResumeId = '';
  memoryPersonalDetailsTemplate = null;
  memoryResumeContent = null;
  clearStoredSession();
}

/**
 * Load cookie from disk if present. Safe to call multiple times.
 * @returns {Promise<{ ok: true, source: 'memory' | 'disk' } | { ok: false, source: 'none' }>}
 */
export async function initializeFlowCvSession() {
  if (memoryCookie) {
    return { ok: true, source: 'memory' };
  }

  const fromDisk = readStoredSession();
  if (fromDisk?.cookie) {
    memoryCookie = fromDisk.cookie;
    sessionEmail = fromDisk.email || '';
    memoryResumeId = String(fromDisk.resumeId || '').trim();
    if (fromDisk.personalDetails && typeof fromDisk.personalDetails === 'object') {
      memoryPersonalDetailsTemplate = clonePlain(fromDisk.personalDetails);
    } else {
      memoryPersonalDetailsTemplate = null;
    }
    if (fromDisk.resumeContent && typeof fromDisk.resumeContent === 'object') {
      memoryResumeContent = clonePlain(fromDisk.resumeContent);
    } else {
      memoryResumeContent = null;
    }
    if (
      !memoryResumeId ||
      !memoryPersonalDetailsTemplate ||
      !resumeContentHasProfile(memoryResumeContent)
    ) {
      await syncActiveResumeFromFlowCvApi();
    } else {
      persistSessionFile();
    }
    return { ok: true, source: 'disk' };
  }

  return { ok: false, source: 'none' };
}

/**
 * Drop disk + memory session after HTTP 401. User must sign in again from the UI.
 */
export async function refreshFlowCvSession() {
  memoryCookie = '';
  sessionEmail = '';
  memoryResumeId = '';
  memoryPersonalDetailsTemplate = null;
  memoryResumeContent = null;
  clearStoredSession();
  const err = new Error(
    'FlowCV session expired. Please sign in again with your FlowCV email and password.',
  );
  err.code = 'FLOWCV_SESSION_EXPIRED';
  throw err;
}

let initInFlight = null;

/**
 * Ensures a cookie exists (used before FlowCV calls if startup init failed).
 */
export function ensureFlowCvSession() {
  const incoming = flowCvRequestContext.getStore();
  if (incoming?.sessionCookie && !memoryCookie) {
    memoryCookie = incoming.sessionCookie;
    memoryResumeId = String(incoming.resumeId || '').trim();
    sessionEmail = String(incoming.email || '').trim();
  }
  if (memoryCookie) return Promise.resolve();
  if (!initInFlight) {
    initInFlight = initializeFlowCvSession().finally(() => {
      initInFlight = null;
    });
  }
  return initInFlight;
}

import { FLOWCV_RESUME_ID } from './flowcvCredentials.js';
import { flowCvNowIso } from './config.js';

/** Fixed FlowCV profile entry row (`text` + `updatedAt` set per request). */
export const FLOWCV_PROFILE_ENTRY_FIXED = {
  id: '8d933d7f-e091-4c43-9dac-5e96f189f66b',
  isHidden: false,
  createdAt: '2026-04-03T17:35:42.009Z',
  showPlaceholder: false,
};

export function escapeFlowCvPlainText(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripBoldMarkers(text) {
  return String(text || '').replace(/\*\*/g, '');
}

/** One paragraph: escape, **bold**, newlines → `<br>`, wrap in `<p>`. */
export function descriptionToFlowCvHtml(text) {
  const raw = String(text || '').trim();
  if (!raw) return '<p></p>';
  let s = escapeFlowCvPlainText(stripBoldMarkers(raw));
  return `<p>${s.replace(/\n/g, '<br>')}</p>`;
}

/**
 * Turn plain-text summary (with optional **bold**) into simple HTML for FlowCV.
 */
export function summaryToFlowCvHtml(summary) {
  const raw = String(summary || '').trim();
  if (!raw) return '<p></p>';

  let s = escapeFlowCvPlainText(stripBoldMarkers(raw));

  const blocks = s.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return '<p></p>';

  return blocks.map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`).join('');
}

/**
 * Body for PATCH …/resumes/save_entry (profile section).
 * @param {Record<string, unknown>} tailoredResumeJson
 */
export function tailoredResumeJsonToFlowCvProfileSaveBody(tailoredResumeJson) {
  const json = tailoredResumeJson && typeof tailoredResumeJson === 'object' ? tailoredResumeJson : {};
  const summary = /** @type {string} */ (json.summary || '');

  return {
    resumeId: FLOWCV_RESUME_ID,
    sectionId: 'profile',
    entry: {
      ...FLOWCV_PROFILE_ENTRY_FIXED,
      text: summaryToFlowCvHtml(summary),
      updatedAt: flowCvNowIso(),
    },
  };
}

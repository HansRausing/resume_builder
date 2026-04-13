import { FLOWCV_RESUME_ID } from './flowcvCredentials.js';
import { flowCvNowIso } from './config.js';
import { escapeFlowCvPlainText } from './profileEntryMapper.js';

/**
 * All FlowCV skill slots (10). `skill` is the FlowCV row label used to match JSON keys.
 */
export const FLOWCV_SKILL_ENTRY_CONFIGS = [
  {
    id: 'd459c176-6bc2-4993-9284-cf6f5f955b3f',
    createdAt: '2026-04-08T00:29:55.912Z',
    skill: 'Frontend',
  },
  {
    id: 'f60eeeb3-c33c-4589-9fa2-d50ac2c1ca84',
    createdAt: '2026-04-08T21:44:33.110Z',
    skill: 'Backend',
  },
  {
    id: '1d91a3ab-9fa0-47eb-bc6f-a001443bc14b',
    createdAt: '2026-04-06T14:22:48.642Z',
    skill: 'Databases',
  },
  {
    id: '902a5f42-6e25-4762-9431-096284a0d6a3',
    createdAt: '2026-04-08T20:28:13.740Z',
    skill: 'Cloud & DevOps',
  },
  {
    id: 'a6271b4b-7dd3-4831-9ab4-8bfb341a71bc',
    createdAt: '2026-04-07T22:59:15.418Z',
    skill: 'Automation & Scripting',
  },
  {
    id: '432982bc-fffe-4dfc-956d-74fb7652d353',
    createdAt: '2026-04-08T20:46:01.098Z',
    skill: 'Architecture & Practices',
  },
  {
    id: '5d1ed567-9726-4c14-a3f5-a6fdcdb48f11',
    createdAt: '2026-04-03T13:46:23.790Z',
    skill: 'Testing & QA',
  },
  {
    id: '0b053fc8-e886-451a-8f2d-a3767bbcf18d',
    createdAt: '2026-04-09T15:48:08.227Z',
    skill: 'Engineering Practices',
  },
  {
    id: '46ab746a-be1f-4ad6-b44a-32e28e50bb4f',
    createdAt: '2026-04-13T02:15:31.248Z',
    skill: '',
  },
  {
    id: '3b3edc42-5828-464b-857d-116b367c2b9a',
    createdAt: '2026-04-13T02:15:56.485Z',
    skill: '',
  },
];

function normalizeKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * FlowCV row config for a `coreTechnologies` object key (after alias resolution).
 * @param {string} jsonCategoryKey
 * @returns {(typeof FLOWCV_SKILL_ENTRY_CONFIGS)[number] | null}
 */

function coerceTechArray(rawVal) {
  if (Array.isArray(rawVal)) {
    return rawVal.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof rawVal === 'string') {
    return rawVal
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Comma-separated list inside a single `<p>`, with ** → `<strong>`.
 * @param {string[]} items
 */
export function techSkillListToInfoHtml(items) {
  const list = (items || []).map(String).map((s) => s.trim()).filter(Boolean);
  if (!list.length) return '<p></p>';

  const inner = list
    .map((item) => item.replace("**", ''))
    .join(', ')
    
  return `<p>${inner}</p>`;
}

/**
 * Counts top-level categories in `coreTechnologies` (excludes `_uncategorized`).
 * @param {Record<string, unknown>} tech
 */
export function countCoreTechnologyCategories(tech) {
  if (!tech || typeof tech !== 'object') return 0;
  return Object.keys(tech).filter((k) => k !== '_uncategorized').length;
}

/**
 * PATCH bodies for `sectionId: "skill"`:
 * 1) One request per `coreTechnologies` key that maps to a FlowCV row (skill = JSON key, infoHtml from values).
 * 2) Then one request per FlowCV row not touched — `isHidden: true`, empty content.
 *
 * @param {Record<string, unknown>} tailoredResumeJson
 * @returns {Array<{ resumeId: string, sectionId: string, entry: object }>}
 */
export function tailoredResumeJsonToFlowCvSkillSaveBodies(tailoredResumeJson) {
  const json = tailoredResumeJson && typeof tailoredResumeJson === 'object' ? tailoredResumeJson : {};
  const tech = /** @type {Record<string, unknown>} */ (json.coreTechnologies || {});

  const bodies = [];

  const pairs = Object.entries(tech).filter(([k]) => k !== '_uncategorized');

  const N = pairs.length;

  for (let i = 0; i < N; i++) {
    const [jsonKey, rawVal] = pairs[i];
    const cfg = FLOWCV_SKILL_ENTRY_CONFIGS[i];

    const arr = coerceTechArray(rawVal);
    bodies.push({
      resumeId: FLOWCV_RESUME_ID,
      sectionId: 'skill',
      entry: {
        id: cfg.id,
        level: '',
        skill: jsonKey,
        infoHtml: techSkillListToInfoHtml(arr),
        isHidden: false,
        createdAt: cfg.createdAt,
        updatedAt: flowCvNowIso(),
        showPlaceholder: false,
      },
    });
  }

  for (let i = N; i < FLOWCV_SKILL_ENTRY_CONFIGS.length; i++) {
    const cfg = FLOWCV_SKILL_ENTRY_CONFIGS[i];

    bodies.push({
      resumeId: FLOWCV_RESUME_ID,
      sectionId: 'skill',
      entry: {
        id: cfg.id,
        level: '',
        skill: cfg.skill || '',
        infoHtml: '<p></p>',
        isHidden: true,
        createdAt: cfg.createdAt,
        updatedAt: flowCvNowIso(),
        showPlaceholder: false,
      },
    });
  }

  return bodies;
}

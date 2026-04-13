import { FLOWCV_RESUME_ID } from './flowcvCredentials.js';
import { flowCvNowIso } from './config.js';
import { descriptionToFlowCvHtml } from './profileEntryMapper.js';

/**
 * One FlowCV `custom1` row per impact line: fixed id + createdAt (`updatedAt` set per request).
 */
export const FLOWCV_IMPACT_ROW_METAS = [
  {
    id: 'a13ea7fe-2f0b-4c44-b40b-85c48ce63548',
    createdAt: '2026-04-03T07:04:11.864Z',
  },
  {
    id: 'b4c94bd5-bcf6-4eb4-9b8a-ad9b976a42dc',
    createdAt: '2026-04-03T07:04:11.864Z',
  },
  {
    id: '92fd339b-b2d2-4a24-9ce1-cf0bac9e5051',
    createdAt: '2026-04-03T07:04:11.864Z',
  },
  {
    id: 'babddedf-df61-4ada-97f5-30fdd7354381',
    createdAt: '2026-04-03T07:04:11.864Z',
  },
];

const IMPACT_SHELL = {
  isHidden: false,
  location: '',
  subTitle: '',
  titleLink: '',
  endDateNew: '',
  startDateNew: '',
  showPlaceholder: false,
};

/**
 * Builds up to four PATCH bodies for `sectionId: "custom1"` from `tailoredResumeJson.impact`.
 * Each object key → `entry.title`, value → `entry.description` (HTML).
 *
 * @param {Record<string, unknown>} tailoredResumeJson
 * @returns {Array<{ resumeId: string, sectionId: string, entry: object }>}
 */
export function tailoredResumeJsonToFlowCvImpactSaveBodies(tailoredResumeJson) {
  const json = tailoredResumeJson && typeof tailoredResumeJson === 'object' ? tailoredResumeJson : {};
  const impact = json.impact;
  if (!impact || typeof impact !== 'object') return [];

  const pairs = Object.entries(/** @type {Record<string, string>} */ (impact));
  const max = Math.min(pairs.length, FLOWCV_IMPACT_ROW_METAS.length);
  const bodies = [];

  for (let i = 0; i < max; i++) {
    const [title, descriptionText] = pairs[i];
    const meta = FLOWCV_IMPACT_ROW_METAS[i];
    bodies.push({
      resumeId: FLOWCV_RESUME_ID,
      sectionId: 'custom1',
      entry: {
        id: meta.id,
        title: String(title || '').replaceAll("**", "").trim(),
        ...IMPACT_SHELL,
        createdAt: meta.createdAt,
        updatedAt: flowCvNowIso(),
        description: descriptionToFlowCvHtml(String(descriptionText || '')),
      },
    });
  }

  return bodies;
}

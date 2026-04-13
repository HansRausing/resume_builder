/**
 * FlowCV `personalDetails` for save_personal_details.
 * All fields are fixed to match your FlowCV account except `jobTitle`, which comes from
 * `tailoredResumeJson.title` (markdown ** stripped).
 */

export function stripBoldMarkers(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .trim();
}

/** Fixed payload — only `jobTitle` is overridden per tailor result. */
export const FLOWCV_PERSONAL_DETAILS_FIXED = {
  phone: '+1 (346) 771-6340',
  photo: {},
  social: {
    linkedIn: {
      link: 'https://linkedin.com/in/santoli-connected',
      display: 'linkedin.com/in/santoli-connected',
    },
  },
  address: 'The Woodlands, Texas',
  fullName: 'ANDREW SANTOLI',
  jobTitle: '',
  usAddress: false,
  detailsOrder: ['displayEmail', 'phone', 'address', 'linkedIn'],
  displayEmail: 'santoli.andrew@gmail.com',
  showPlaceholder: false,
};

/**
 * Split a typical "email • phone • location" contact line (exported for reuse/tests).
 * @param {string} contactLine
 */
export function parseContactLine(contactLine) {
  const raw = String(contactLine || '').trim();
  if (!raw) {
    return { displayEmail: '', phone: '', address: '' };
  }

  const parts = raw
    .split(/•|·|｜/)
    .map((p) => p.trim())
    .filter(Boolean);

  let displayEmail = '';
  let phone = '';
  let address = '';

  for (const p of parts) {
    if (p.includes('@')) {
      displayEmail = p;
    } else if (/\d/.test(p) && /[+\d()\-\s]{7,}/.test(p)) {
      phone = p;
    } else if (!address) {
      address = p;
    }
  }

  return { displayEmail, phone, address };
}

/**
 * @param {Record<string, unknown>} tailoredResumeJson
 */
export function tailoredResumeJsonToFlowCvPersonalDetails(tailoredResumeJson) {
  const json = tailoredResumeJson && typeof tailoredResumeJson === 'object' ? tailoredResumeJson : {};
  const title = /** @type {string} */ (json.title || '');

  return {
    ...FLOWCV_PERSONAL_DETAILS_FIXED,
    social: {
      linkedIn: { ...FLOWCV_PERSONAL_DETAILS_FIXED.social.linkedIn },
    },
    detailsOrder: [...FLOWCV_PERSONAL_DETAILS_FIXED.detailsOrder],
    jobTitle: stripBoldMarkers(title),
  };
}

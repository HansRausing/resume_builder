/**
 * Outbound FlowCV API integration (https://app.flowcv.com/api).
 *
 * Usage:
 *   import { createFlowCvClient, flowCvRequest, toFlowCvDefaultRequestBody } from './apis/flowcv/index.js';
 *   const body = toFlowCvDefaultRequestBody(tailoredResumeJson);
 *   await flowCvRequest('POST', 'your/path', { body, client: createFlowCvClient({ headers: { Authorization: '...' } }) });
 */

export { FLOWCV_API_BASE, flowCvNowIso } from './config.js';
export { createFlowCvClient, flowCvRequest } from './client.js';
export {
  toFlowCvResumePayload,
  toFlowCvDefaultRequestBody,
} from './tailoredResumeMapper.js';
export { FlowCvPaths } from './endpoints.js';
export { getFlowCvResumeId } from './config.js';
export { FLOWCV_RESUME_ID } from './flowcvCredentials.js';
export {
  FLOWCV_SESSION_FILE,
  readStoredCookie,
  writeStoredCookie,
  clearStoredSession,
} from './sessionStore.js';
export {
  getFlowCvCookie,
  initializeFlowCvSession,
  ensureFlowCvSession,
  refreshFlowCvSession,
} from './session.js';
export { flowCvLogin } from './auth.js';
export {
  FLOWCV_PERSONAL_DETAILS_FIXED,
  stripBoldMarkers,
  parseContactLine,
  tailoredResumeJsonToFlowCvPersonalDetails,
} from './personalDetailsMapper.js';
export { saveFlowCvPersonalDetails } from './savePersonalDetails.js';
export {
  FLOWCV_PROFILE_ENTRY_FIXED,
  escapeFlowCvPlainText,
  descriptionToFlowCvHtml,
  summaryToFlowCvHtml,
  tailoredResumeJsonToFlowCvProfileSaveBody,
} from './profileEntryMapper.js';
export {
  FLOWCV_IMPACT_ROW_METAS,
  tailoredResumeJsonToFlowCvImpactSaveBodies,
} from './impactEntryMapper.js';
export {
  FLOWCV_SKILL_ENTRY_CONFIGS,
  findConfigForJsonCategory,
  techSkillListToInfoHtml,
  countCoreTechnologyCategories,
  tailoredResumeJsonToFlowCvSkillSaveBodies,
} from './skillEntryMapper.js';
export {
  FLOWCV_WORK_ENTRY_FIXED,
  bulletsTextToFlowCvUlHtml,
  tailoredResumeJsonToFlowCvWorkSaveBodies,
} from './workEntryMapper.js';
export { with401Retry } from './flowCvWith401Retry.js';
export { saveFlowCvEntry } from './saveEntry.js';
export { syncFlowCvPersonalDetailsAfterTailor } from './syncPersonalDetails.js';
export { downloadFlowCvResumePdf } from './downloadResumePdf.js';

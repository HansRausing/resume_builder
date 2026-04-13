/**
 * FlowCV outbound API configuration.
 * Override with env when needed (e.g. staging).
 */

export const FLOWCV_API_BASE =
  (typeof process !== 'undefined' && process.env.FLOWCV_API_BASE) ||
  'https://app.flowcv.com/api';

/** Current time as ISO string for FlowCV `updatedAt` fields on each outbound request. */
export function flowCvNowIso() {
  return new Date().toISOString();
}

/**
 * Target resume in FlowCV (UUID). Set FLOWCV_RESUME_ID in the environment.
 * Do not commit real IDs or credentials to the repo.
 */
export function getFlowCvResumeId() {
  return (typeof process !== 'undefined' && process.env.FLOWCV_RESUME_ID?.trim()) || '';
}

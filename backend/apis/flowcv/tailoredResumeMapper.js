/**
 * Maps `tailoredResumeJson` (from parseTailoredResumeTextToJson) into request bodies
 * for FlowCV. When you have exact endpoint contracts, add dedicated builders here
 * and keep shared fields in `toFlowCvResumePayload`.
 */

/**
 * @param {Record<string, unknown> | null | undefined} tailoredResumeJson
 * @returns {object}
 */
export function toFlowCvResumePayload(tailoredResumeJson) {
  if (!tailoredResumeJson || typeof tailoredResumeJson !== 'object') {
    return {};
  }

  return {
    fullName: tailoredResumeJson.fullName ?? '',
    title: tailoredResumeJson.title ?? '',
    contactLine: tailoredResumeJson.contactLine ?? '',
    additionalLinks: tailoredResumeJson.additionalLinks ?? [],
    summary: tailoredResumeJson.summary ?? '',
    impact: tailoredResumeJson.impact ?? {},
    coreTechnologies: tailoredResumeJson.coreTechnologies ?? {},
    workExperience: tailoredResumeJson.workExperience ?? [],
    workExperienceAsStrings: tailoredResumeJson.workExperienceAsStrings ?? [],
    workExperienceBulletsOnly: tailoredResumeJson.workExperienceBulletsOnly ?? [],
    education: tailoredResumeJson.education ?? '',
    resumeFileName: tailoredResumeJson.resumeFileName ?? '',
  };
}

/**
 * Default body for FlowCV calls that accept our full resume object.
 * Adjust field names to match FlowCV once you document their API.
 */
export function toFlowCvDefaultRequestBody(tailoredResumeJson) {
  return {
    resume: toFlowCvResumePayload(tailoredResumeJson),
  };
}

/**
 * JSDoc typedefs for FlowCV integration (no runtime export required).
 */

/**
 * @typedef {object} TailoredResumeJson
 * @property {string} [fullName]
 * @property {string} [title]
 * @property {string} [contactLine]
 * @property {string[]} [additionalLinks]
 * @property {string} [summary]
 * @property {Record<string, string>} [impact]
 * @property {Record<string, string[]>} [coreTechnologies]
 * @property {{ heading: string, bullets: string[], bulletsText: string }[]} [workExperience]
 * @property {string[]} [workExperienceAsStrings]
 * @property {string[]} [workExperienceBulletsOnly]
 * @property {unknown} [work] - FlowCV work section is derived from workExperienceBulletsOnly + fixed metadata.
 * @property {string} [education]
 * @property {string} [resumeFileName]
 */

export {};

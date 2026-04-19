import { flowCvNowIso } from "./config.js";
import { FLOWCV_RESUME_ID } from "./flowcvCredentials.js";
import { escapeFlowCvPlainText } from "./profileEntryMapper.js";

/**
 * Fixed FlowCV `work` entries (3) — `description` is updated per tailor result.
 * These IDs/createdAt values come from your FlowCV `save_entry` payloads.
 */
export const FLOWCV_WORK_ENTRY_FIXED = [
  {
    id: "12466122-ec14-46d0-852c-b558f230b0c2",
    employer: "Santoli Connected Network",
    jobTitle: "Senior Full Stack Developer",
    location: "Spring, TX",
    employerLink: "",
    startDateNew: "06/2024",
    endDateNew: "02/2026",
    isHidden: false,
    createdAt: "2026-04-03T07:05:01.136Z",
    showPlaceholder: false,
  },
  {
    id: "af89e58f-e5c6-449d-bcfc-f2acd6b678d8",
    employer: "Meomind",
    jobTitle: "Senior Software Engineer",
    location: "San Francisco, CA",
    employerLink: "",
    startDateNew: "10/2021",
    endDateNew: "05/2024",
    isHidden: false,
    createdAt: "2026-04-03T13:46:37.558Z",
    showPlaceholder: false,
  },
  {
    id: "3d0f4160-da12-45ab-9265-867fc8dc2e0e",
    employer: "Click&Boat",
    jobTitle: "Senior Full Stack Engineer",
    location: "Miami, FL",
    employerLink: "",
    startDateNew: "02/2016",
    endDateNew: "11/2020",
    isHidden: false,
    createdAt: "2026-04-03T13:46:43.458Z",
    showPlaceholder: false,
  },
];

/**
 * Convert a bullet-only block (newline separated, each line prefixed with -,*,•)
 * into FlowCV HTML list: `<ul><li><p>...</p></li>...</ul>`.
 *
 * Also converts markdown bold `**x**` into `<strong>x</strong>`.
 *
 * @param {string} bulletsText
 */
export function bulletsTextToFlowCvUlHtml(bulletsText) {
  const raw = String(bulletsText || "").trim();
  if (!raw) return "<ul></ul>";

  const items = raw.split(/\r?\n/).map((s) => {
    let html = escapeFlowCvPlainText(s.trim());
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return `<li><p>${html}</p></li>`;
  });

  return `<ul>${items.join("")}</ul>`;
}

/**
 * Builds up to 3 PATCH bodies for `sectionId: "work"`, where each role's
 * `description` comes from `tailoredResumeJson.workExperienceBulletsOnly[i]`.
 *
 * @param {Record<string, unknown>} tailoredResumeJson
 * @returns {Array<{ resumeId: string, sectionId: string, entry: object }>}
 */
export function tailoredResumeJsonToFlowCvWorkSaveBodies(tailoredResumeJson) {
  const json =
    tailoredResumeJson && typeof tailoredResumeJson === "object"
      ? tailoredResumeJson
      : {};
  const blocks = Array.isArray(json.workExperienceBulletsOnly)
    ? json.workExperienceBulletsOnly
    : [];

  const bodies = [];
  for (let i = 0; i < FLOWCV_WORK_ENTRY_FIXED.length; i++) {
    const fixed = FLOWCV_WORK_ENTRY_FIXED[i];
    const bulletsText = blocks[i] ? String(blocks[i]) : "";
    const hasContent = Boolean(String(bulletsText || "").trim());

    bodies.push({
      resumeId: FLOWCV_RESUME_ID,
      sectionId: "work",
      entry: {
        ...fixed,
        description: hasContent
          ? bulletsTextToFlowCvUlHtml(bulletsText)
          : "<ul></ul>",
        isHidden: fixed.isHidden === true ? true : !hasContent ? true : false,
        updatedAt: flowCvNowIso(),
      },
    });
  }

  return bodies;
}

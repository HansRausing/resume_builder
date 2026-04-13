import { FLOWCV_RESUME_ID } from './flowcvCredentials.js';
import { tailoredResumeJsonToFlowCvPersonalDetails } from './personalDetailsMapper.js';
import { tailoredResumeJsonToFlowCvProfileSaveBody } from './profileEntryMapper.js';
import { tailoredResumeJsonToFlowCvImpactSaveBodies } from './impactEntryMapper.js';
import { tailoredResumeJsonToFlowCvSkillSaveBodies } from './skillEntryMapper.js';
import { tailoredResumeJsonToFlowCvWorkSaveBodies } from './workEntryMapper.js';
import { saveFlowCvPersonalDetails } from './savePersonalDetails.js';
import { saveFlowCvEntry } from './saveEntry.js';
import { with401Retry } from './flowCvWith401Retry.js';
import { ensureFlowCvSession, getFlowCvCookie } from './session.js';
import { downloadFlowCvResumePdf } from './downloadResumePdf.js';

/**
 * After tailoring: sync FlowCV personal details, profile, Impact (custom1), Skills (skill), and Work (work).
 * Never throws — returns a result object for the tailor API response.
 *
 * @param {Record<string, unknown>} tailoredResumeJson
 * @returns {Promise<{ ok?: true, pdfBase64?: string, pdfContentType?: string, error?: string }>}
 */
export async function syncFlowCvPersonalDetailsAfterTailor(tailoredResumeJson) {
  try {
    await ensureFlowCvSession();
    const cookie = getFlowCvCookie();
    if (!cookie) {
      throw new Error('No FlowCV session cookie (login at startup did not succeed)');
    }

    const personalDetails = tailoredResumeJsonToFlowCvPersonalDetails(tailoredResumeJson);
    const profileBody = tailoredResumeJsonToFlowCvProfileSaveBody(tailoredResumeJson);

    await with401Retry(async (c) => {
      await saveFlowCvPersonalDetails({ resumeId: FLOWCV_RESUME_ID, personalDetails, cookie: c });
    });

    await with401Retry(async (c) => {
      await saveFlowCvEntry({
        resumeId: profileBody.resumeId,
        sectionId: profileBody.sectionId,
        entry: profileBody.entry,
        cookie: c,
      });
    });

    const impactBodies = tailoredResumeJsonToFlowCvImpactSaveBodies(tailoredResumeJson);
    for (const body of impactBodies) {
      await with401Retry(async (c) => {
        await saveFlowCvEntry({
          resumeId: body.resumeId,
          sectionId: body.sectionId,
          entry: body.entry,
          cookie: c,
        });
      });
    }

    const skillBodies = tailoredResumeJsonToFlowCvSkillSaveBodies(tailoredResumeJson);
    for (const body of skillBodies) {
      await with401Retry(async (c) => {
        await saveFlowCvEntry({
          resumeId: body.resumeId,
          sectionId: body.sectionId,
          entry: body.entry,
          cookie: c,
        });
      });
    }

    const workBodies = tailoredResumeJsonToFlowCvWorkSaveBodies(tailoredResumeJson);
    for (const body of workBodies) {
      await with401Retry(async (c) => {
        await saveFlowCvEntry({
          resumeId: body.resumeId,
          sectionId: body.sectionId,
          entry: body.entry,
          cookie: c,
        });
      });
    }

    const pdf = await with401Retry(async (c) => {
      const r = await downloadFlowCvResumePdf({
        resumeId: FLOWCV_RESUME_ID,
        previewPageCount: 2,
        cookie: c,
      });
      return r;
    });

    return {
      ok: true,
      pdfContentType: pdf.contentType,
      pdfBase64: pdf.buffer.toString('base64'),
    };
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      String(err);
    return { ok: false, error: message };
  }
}

import axios from 'axios';
import { FLOWCV_API_BASE } from './config.js';
import { FlowCvPaths } from './endpoints.js';

/**
 * Download resume PDF from FlowCV.
 *
 * FlowCV expects the session Cookie header; response is a PDF binary.
 *
 * @param {{ resumeId: string, previewPageCount?: number|string, cookie: string }} params
 */
export async function downloadFlowCvResumePdf({ resumeId, previewPageCount = 2, cookie }) {
  const base = FLOWCV_API_BASE.replace(/\/$/, '');
  const qpResumeId = encodeURIComponent(String(resumeId || '').trim());
  const qpPageCount = encodeURIComponent(String(previewPageCount ?? 2));
  const url = `${base}/${FlowCvPaths.downloadResume}?resumeId=${qpResumeId}&previewPageCount=${qpPageCount}`;

  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      Accept: 'application/pdf',
      Cookie: cookie,
    },
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    const msg =
      res.data?.message ||
      res.data?.error ||
      `FlowCV download failed (HTTP ${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    throw err;
  }

  const contentType = res.headers?.['content-type'] || 'application/pdf';
  const buf = Buffer.from(res.data);
  return { status: res.status, contentType, buffer: buf };
}


import { ensureFlowCvSession, getFlowCvCookie } from '../../backend/apis/flowcv/session.js'
import { with401Retry } from '../../backend/apis/flowcv/flowCvWith401Retry.js'
import { downloadFlowCvResumePdf } from '../../backend/apis/flowcv/downloadResumePdf.js'
import { FLOWCV_RESUME_ID } from '../../backend/apis/flowcv/flowcvCredentials.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await ensureFlowCvSession()
    const cookie = getFlowCvCookie()
    if (!cookie) {
      return res.status(401).json({ error: 'FlowCV session is not initialized' })
    }

    const resumeId = String(req.query.resumeId || FLOWCV_RESUME_ID || '').trim()
    const previewPageCountRaw = req.query.previewPageCount ?? 2
    const previewPageCount = Number(previewPageCountRaw)
    const filename = String(req.query.filename || 'flowcv-resume.pdf').trim() || 'flowcv-resume.pdf'

    if (!resumeId) {
      return res.status(400).json({ error: 'resumeId is required' })
    }

    const pdf = await with401Retry(async (c) => {
      return await downloadFlowCvResumePdf({
        resumeId,
        previewPageCount: Number.isFinite(previewPageCount) ? previewPageCount : 2,
        cookie: c,
      })
    })

    res.setHeader('Content-Type', pdf.contentType || 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`)
    return res.status(200).send(pdf.buffer)
  } catch (error) {
    console.error('[FlowCV] download-pdf error:', error?.message || error)
    return res
      .status(500)
      .json({ error: 'Failed to download FlowCV PDF', details: error?.message || String(error) })
  }
}


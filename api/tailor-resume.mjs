import axios from 'axios'
import { parseTailoredResumeTextToJson } from '../backend/resumeTextToJson.js'
import { syncFlowCvPersonalDetailsAfterTailor } from '../backend/apis/flowcv/syncPersonalDetails.js'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

const isBlank = (v) => !String(v ?? '').trim()
const hasNonEmptyStringArray = (arr) => Array.isArray(arr) && arr.some((x) => !isBlank(x))
const hasNonEmptyObject = (obj) =>
  obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).length > 0

const validateTailoredResumeJson = (json) => {
  const j = json && typeof json === 'object' ? json : {}

  if (isBlank(j.fullName)) return { ok: false, missing: 'fullName' }
  if (isBlank(j.title)) return { ok: false, missing: 'title' }
  if (isBlank(j.summary)) return { ok: false, missing: 'summary' }
  if (!hasNonEmptyObject(j.impact)) return { ok: false, missing: 'impact' }
  if (!hasNonEmptyObject(j.coreTechnologies)) return { ok: false, missing: 'coreTechnologies' }
  if (!hasNonEmptyStringArray(j.workExperienceBulletsOnly))
    return { ok: false, missing: 'workExperienceBulletsOnly' }
  if (isBlank(j.resumeFileName)) return { ok: false, missing: 'resumeFileName' }

  return { ok: true, missing: null }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { currentResume, jobDescription, apiKey } = req.body || {}

    if (!currentResume || !jobDescription) {
      return res.status(400).json({ error: 'Current resume and job description are required' })
    }

    const openaiApiKey = apiKey
    if (!openaiApiKey) {
      return res.status(400).json({ error: 'OpenAI API key is required' })
    }

    const prompt = `ROLE: You are an Expert Resume Strategist and ATS Optimization Specialist with 15+ years experience at Fortune 500 companies. Your specialty is making minimal, surgical changes that dramatically increase callback rates.
    TASK:
    Tailor my resume to this specific job to maximize recruiter callbacks and ATS optimization, using a MINIMAL-CHANGE, MAXIMUM-IMPACT surgical approach.

CRITICAL RULES (STRICT):
1. **TRUTH PRESERVATION**: NEVER invent, exaggerate, or fabricate any experience, metrics, or qualifications.
2. **PRESERVE METRICS**: Keep all quantitative achievements (%, $, numbers, KPIs) exactly as written.
3. **CHRONOLOGY INTACT**: Do not change employment dates, job titles, or company names.
4. **ONE-PAGE CONSTRAINT**: Ensure final resume fits on one page with proper formatting.
5. **NO FLUFF**: Remove any generic statements like "team player," "hard worker," "excellent communicator."
6. **NO PARENTHESES**: Never add keywords in parentheses (like this). Integrate naturally into sentences.

ALLOWED CHANGES (ONLY):
A) UUpdate the "Title" or "Summary" line to exactly match the job title.
B) Update the SUMMARY only if necessary to mirror the role's core focus (max 3 lines).
  - Keep 3 lines maximum
  - Start with strongest value proposition
  - Use exact terminology from job description's "Requirements" section
  - Focus on business impact, not just responsibilities
  - And Mention business or industry experience similar to the job description.
C) KEYWORD INTEGRATION
  - Extract 8-12 CRITICAL keywords/phrases from the job description
   - Categorize them: Technologies (30%), Business Domains (30%), Soft Skills (20%), Methodologies (20%)
  - Insert keywords NATURALLY into existing bullet points WITHOUT rewriting
  - And Mention business or industry experience similar to the job description.
D) WORK EXPERIENCE
   - Keep over 7 bullets in the content per experience
   - And mention business or industry experience similar to the job description.
   - Focus on generate the experiences matched to requirements mentiond in the job description
E) BULLET POINT OPTIMIZATION
Add 5-8 missing, HIGH-VALUE keywords from the job description into:
   - Reorder bullets to place MOST RELEVANT experience first (don't change content, just add keywords relevant to experience, skills and features they want from job description)
   - Add parenthetical keyword insertion where natural
   - And Mention business or industry experience similar to the job description.
F) SKILLS SECTION RESTRUCTURING:
   - Group skills by category matching job description format
   - Order by relevance to this specific role
   - Add missing REQUIRED technologies from job description (only if truthful)
H) IMPACT
   - Remain the 4 bullets
   - Also remain the subtitles and contents, but change them to match the job description if needed.

KEYWORD INTEGRATION METHOD (IMPORTANT):
- DO NOT add keywords in parentheses at the end of sentences
- DO insert keywords naturally within the sentence flow

GOAL:
- Make the resume read as if I am ALREADY doing this job.
- Maximize recruiter "Yes" decisions in under 10 seconds.
- Preserve seniority, authority, and credibility.

INPUTS:
1) MASTER RESUME:
${currentResume}

2) JOB DESCRIPTION:
${jobDescription}

OUTPUT FORMAT:
- Return the FULL updated resume text.
- Should look like human-written, especially, no need "—" symbols in the text and verbal tone.
- Please ensure that words are not repeated, there are no spelling errors, and all grammar is correct.
- Highlight all changes with BOLD of font style for easy review.
- NO explanations or commentary
- NO keywords in parentheses
- Maintain professional flow and readability
- give how to name resume file name as "YourName_JobTitle-CompanyName.pdf"`

    const maxAttempts = 3
    let tailoredResume = ''
    let tailoredResumeJson = null
    let lastMissing = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const extra =
        attempt === 1
          ? ''
          : `\n\nIMPORTANT: Your previous output was missing "${lastMissing}". Regenerate the FULL resume text and ensure ALL sections exist and are non-empty: SUMMARY, IMPACT (4 lines with key: value), CORE TECHNOLOGIES (with categories), WORK EXPERIENCE (bulleted), EDUCATION, and a final line "Resume file name: <filename>.pdf".`

      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-5.2',
          messages: [{ role: 'user', content: prompt + extra }],
          temperature: 0.7,
          max_completion_tokens: 4000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiApiKey}`,
          },
        }
      )

      tailoredResume = response.data.choices?.[0]?.message?.content || ''
      tailoredResumeJson = parseTailoredResumeTextToJson(tailoredResume)

      const v = validateTailoredResumeJson(tailoredResumeJson)
      if (v.ok) break
      lastMissing = v.missing

      if (attempt === maxAttempts) {
        return res.status(500).json({
          error: 'Failed to generate a complete tailored resume JSON',
          details: `Missing or empty field after ${maxAttempts} attempts: ${v.missing}`,
          tailoredResume,
          tailoredResumeJson,
        })
      }
    }

    const flowCvSync = await syncFlowCvPersonalDetailsAfterTailor(tailoredResumeJson)
    return res.status(200).json({ tailoredResume, tailoredResumeJson, flowCvSync })
  } catch (error) {
    console.error('Error calling OpenAI API:', error.response?.data || error.message)
    return res.status(500).json({
      error: 'Failed to generate tailored resume',
      details: error.response?.data?.error?.message || error.message,
    })
  }
}


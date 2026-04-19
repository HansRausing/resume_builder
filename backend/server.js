import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { parseTailoredResumeTextToJson } from "./resumeTextToJson.js";
import { syncFlowCvPersonalDetailsAfterTailor } from "./apis/flowcv/syncPersonalDetails.js";
import {
  ensureFlowCvSession,
  getFlowCvActiveResumeId,
  getFlowCvCookie,
  getFlowCvSessionInfo,
  initializeFlowCvSession,
  loginFlowCvSession,
  logoutFlowCvSession,
  setFlowCvActiveResumeId,
  syncActiveResumeFromFlowCvApi,
} from "./apis/flowcv/session.js";
import { flowCvRequestContext } from "./apis/flowcv/flowCvRequestContext.js";
import {
  parseSignedFlowCvSessionFromCookieHeader,
  buildFlowCvSessionSetCookieValue,
  buildFlowCvSessionClearCookieValue,
  hasFlowCvBrowserCookieSupport,
} from "./apis/flowcv/flowCvBrowserCookie.js";
import { with401Retry } from "./apis/flowcv/flowCvWith401Retry.js";
import { downloadFlowCvResumePdf } from "./apis/flowcv/downloadResumePdf.js";
import { fetchFlowCvResumesAll } from "./apis/flowcv/fetchResumesAll.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  const parsed = parseSignedFlowCvSessionFromCookieHeader(
    req.headers.cookie || "",
  );
  flowCvRequestContext.run(parsed, () => next());
});

// OpenAI API endpoint
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const isBlank = (v) => !String(v ?? "").trim();
const hasNonEmptyStringArray = (arr) =>
  Array.isArray(arr) && arr.some((x) => !isBlank(x));
const hasNonEmptyObject = (obj) =>
  obj &&
  typeof obj === "object" &&
  !Array.isArray(obj) &&
  Object.keys(obj).length > 0;

const validateTailoredResumeJson = (json) => {
  const j = json && typeof json === "object" ? json : {};

  if (isBlank(j.fullName)) return { ok: false, missing: "fullName" };
  if (isBlank(j.title)) return { ok: false, missing: "title" };
  if (isBlank(j.summary)) return { ok: false, missing: "summary" };
  if (!hasNonEmptyObject(j.impact)) return { ok: false, missing: "impact" };
  if (!hasNonEmptyObject(j.coreTechnologies))
    return { ok: false, missing: "coreTechnologies" };
  if (!hasNonEmptyStringArray(j.workExperienceBulletsOnly))
    return { ok: false, missing: "workExperienceBulletsOnly" };
  if (isBlank(j.resumeFileName))
    return { ok: false, missing: "resumeFileName" };

  return { ok: true, missing: null };
};

// Generate tailored resume using OpenAI API
app.post("/api/tailor-resume", async (req, res) => {
  try {
    const { currentResume, jobDescription, apiKey } = req.body;

    if (!currentResume || !jobDescription) {
      return res
        .status(400)
        .json({ error: "Current resume and job description are required" });
    }

    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return res.status(400).json({ error: "OpenAI API key is required" });
    }

    const prompt = `ROLE: You are an Expert Resume Strategist and ATS Optimization Specialist with 15+ years experience at Fortune 500 companies. Your specialty is making minimal, surgical changes that dramatically increase callback rates.
    TASK:
    Tailor my resume to this specific job to maximize recruiter callbacks and ATS optimization, using a MINIMAL-CHANGE, MAXIMUM-IMPACT surgical approach.

CRITICAL RULES (STRICT):
1. **PRESERVE METRICS**: Keep all quantitative achievements (%, $, numbers, KPIs) exactly as written.
2. **CHRONOLOGY INTACT**: Do not change employment dates, job titles, or company names.
3. **ONE-PAGE CONSTRAINT**: Ensure final resume fits on two pages with proper formatting.
4. **NO FLUFF**: Remove any generic statements like "team player," "hard worker," "excellent communicator."
5. **NO PARENTHESES**: Never add keywords in parentheses (like this). Integrate naturally into sentences.
6.**EXPERIENCES**: Implement the required experience in the job description.

ALLOWED CHANGES (ONLY):
A) Update the "Title" or "Summary" line to exactly match the job title.
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
   - Bold the keywords such as the skills and stacks that are required in job description
D) WORK EXPERIENCE
   - Keep over 7 bullets in the content per experience
   - And mention business or industry experience similar to the job description.
   - Implement the experiences about the skills and stacks that are mentioned in the job description
   - Focus on generate the experiences matched to requirements mentiond in the job description
   - Please bold the matched part from the job description.
E) BULLET POINT OPTIMIZATION
  - Add 5-8 missing, HIGH-VALUE keywords from the job description into:
   - Reorder bullets to place MOST RELEVANT experience first (don't change content, just add keywords relevant to experience, skills and features they want from job description)
   - Add parenthetical keyword insertion where natural
   - And Mention business or industry experience similar to the job description.
F) SKILLS SECTION RESTRUCTURING:
   - Group skills by category matching job description format
   - Order by relevance to this specific role
   - Add any missing critical skills from job description that are not already in the resume
   - Add all skills 100% to the skills and stacks that are mentioned in the job description
H) IMPACT
   - Remain the 4 bullets
   - Also remain the subtitles and contents, but change them to match the job description if needed.

KEYWORD INTEGRATION METHOD (IMPORTANT):
- DO NOT add keywords in parentheses at the end of sentences
- DO insert keywords naturally within the sentence flow

STRATEGY BY JOB LEVEL:
- **Entry Level**: Emphasize relevant coursework, projects, transferable skills
- **Mid-Level**: Highlight specific achievements and growing expertise
- **Senior/Staff**: Focus on leadership, strategy, and business impact
- **Executive**: Emphasize P&L, organizational leadership, and vision

RECRUITER PSYCHOLOGY TO CONSIDER:
1. Recruiters scan in 6-8 seconds looking for EXACT matches
2. ATS systems filter for keyword density (aim for 15-25% match)
3. Hiring managers look for "proof patterns" - show you've solved similar problems
4. Priority order: Relevant Experience > Skills > Education > Everything else

EXECUTION INSTRUCTIONS:
1. Analyze job description for requirements vs. nice-to-haves
2. Map your experience to show you've solved similar problems
3. Integrate keywords by:
   - Adding them to the beginning/middle of sentences
   - Using them as adjectives or part of phrases
   - Connecting them naturally to existing content
4. Reorder sections/bullets to highlight most relevant experience first

BUSINESS/INDUSTRY ALIGNMENT:
- If your experience includes similar industries/domains, mention this naturally
- Example: "Experience in **healthcare technology** solutions for patient management"
- Integrate industry terms into existing achievements

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
- NO explanations or commentary
- NO keywords in parentheses
- Maintain professional flow and readability
- Should look like human-written, especially, no need "—" symbols in the text and verbal tone.
- Please ensure that words are not repeated, there are no spelling errors, and all grammar is correct.
- Give a professional file name for a resume. Use spaces between words in the name, not camel case or underscores. The format should be: [FirstName LastName]_[Job Title]-[Company Name]. For example: "John Doe_Software Engineer-Acme Corp.pdf".`;

    const maxAttempts = 3;
    let tailoredResume = "";
    let tailoredResumeJson = null;
    let lastMissing = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const extra =
        attempt === 1
          ? ""
          : `\n\nIMPORTANT: Your previous output was missing "${lastMissing}". Regenerate the FULL resume text and ensure ALL sections exist and are non-empty: SUMMARY, IMPACT (4 lines with key: value), CORE TECHNOLOGIES (with categories), WORK EXPERIENCE (bulleted), EDUCATION, and a final line "Resume file name: <filename>.pdf".`;

      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt + extra }],
          temperature: 0.7,
          max_tokens: 4000,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
        },
      );

      tailoredResume = response.data.choices?.[0]?.message?.content || "";
      tailoredResumeJson = parseTailoredResumeTextToJson(tailoredResume);

      const v = validateTailoredResumeJson(tailoredResumeJson);
      if (v.ok) break;
      lastMissing = v.missing;
      if (attempt === maxAttempts) {
        return res.status(500).json({
          error: "Failed to generate a complete tailored resume JSON",
          details: `Missing or empty field after ${maxAttempts} attempts: ${v.missing}`,
          tailoredResume,
          tailoredResumeJson,
        });
      }
    }

    const flowCvSync =
      await syncFlowCvPersonalDetailsAfterTailor(tailoredResumeJson);

    res.json({ tailoredResume, tailoredResumeJson, flowCvSync });
  } catch (error) {
    console.error(
      "Error calling OpenAI API:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      error: "Failed to generate tailored resume",
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

/**
 * Proxy FlowCV resume download (browser-safe).
 * Uses server-side FlowCV session cookie and streams PDF bytes.
 */
app.get("/api/flowcv/download-pdf", async (req, res) => {
  try {
    await ensureFlowCvSession();
    const cookie = getFlowCvCookie();
    if (!cookie) {
      return res
        .status(401)
        .json({ error: "FlowCV session is not initialized" });
    }

    const resumeId = String(
      req.query.resumeId || getFlowCvActiveResumeId() || "",
    ).trim();
    const previewPageCountRaw = req.query.previewPageCount ?? 2;
    const previewPageCount = Number(previewPageCountRaw);

    if (!resumeId) {
      return res.status(400).json({ error: "resumeId is required" });
    }

    const pdf = await with401Retry(async (c) => {
      return await downloadFlowCvResumePdf({
        resumeId,
        previewPageCount: Number.isFinite(previewPageCount)
          ? previewPageCount
          : 2,
        cookie: c,
      });
    });

    const filename =
      String(req.query.filename || "flowcv-resume.pdf") ||
      "flowcv-resume.pdf";
    res.setHeader("Content-Type", pdf.contentType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename.replace(/"/g, "")}"`,
    );
    return res.status(200).send(pdf.buffer);
  } catch (error) {
    console.error("[FlowCV] download-pdf error:", error?.message || error);
    return res
      .status(500)
      .json({
        error: "Failed to download FlowCV PDF",
        details: error?.message || String(error),
      });
  }
});

/**
 * Proxy FlowCV GET resumes/all (session cookie).
 * - No query: same JSON as app.flowcv.com (full list under body.data.resumes).
 * - ?resumeIndex=n (0-based, same as body.data.resumes[n]): one resume only, smaller payload.
 */
app.get("/api/flowcv/resumes/all", async (req, res) => {
  try {
    await ensureFlowCvSession();
    const cookie = getFlowCvCookie();
    if (!cookie) {
      return res
        .status(401)
        .json({ error: "FlowCV session is not initialized" });
    }

    const data = await with401Retry(async (c) => {
      return await fetchFlowCvResumesAll({ cookie: c });
    });

    const rawIdx = req.query.resumeIndex ?? req.query.index;
    if (rawIdx !== undefined && String(rawIdx).trim() !== "") {
      const idx = Number(rawIdx);
      if (!Number.isFinite(idx) || !Number.isInteger(idx) || idx < 0) {
        return res.status(400).json({
          error: "Invalid resumeIndex",
          details:
            "Use a non-negative integer index into data.resumes (0 = first resume, 1 = second, …).",
        });
      }
      const resumes = data?.data?.resumes;
      if (!Array.isArray(resumes)) {
        return res.status(502).json({
          error: "Unexpected FlowCV response",
          details: "Missing data.resumes array on upstream payload.",
        });
      }
      if (idx >= resumes.length) {
        return res.status(404).json({
          error: "resumeIndex out of range",
          resumeIndex: idx,
          count: resumes.length,
        });
      }
      return res.status(200).json({
        success: true,
        code: 200,
        resumeIndex: idx,
        count: resumes.length,
        resume: resumes[idx],
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("[FlowCV] resumes/all error:", error?.message || error);
    const status = error?.statusCode >= 400 ? error.statusCode : 500;
    return res.status(status).json({
      error: "Failed to fetch FlowCV resumes",
      details: error?.message || String(error),
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/** FlowCV: report whether a server-side session cookie exists (no secrets). */
app.get("/api/flowcv/session", (req, res) => {
  try {
    const info = getFlowCvSessionInfo();
    res.json({
      connected: info.connected,
      email: info.email || undefined,
      resumeId: info.resumeId || undefined,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/** FlowCV: sign in with the same credentials as app.flowcv.com (stores session server-side). */
app.post("/api/flowcv/login", async (req, res) => {
  try {
    const email = req.body?.email;
    const password = req.body?.password;
    const loginOutcome = await loginFlowCvSession(email, password);
    if (!loginOutcome.ok) {
      return res.status(401).json({
        ok: false,
        error: "FlowCV login failed",
        details: "Invalid email or password",
      });
    }
    const info = getFlowCvSessionInfo();
    const browserCookie = buildFlowCvSessionSetCookieValue(
      getFlowCvCookie(),
      getFlowCvActiveResumeId(),
      info.email || "",
    );
    if (browserCookie) {
      res.append("Set-Cookie", browserCookie);
    } else if (!hasFlowCvBrowserCookieSupport()) {
      console.warn(
        "[FlowCV] FLOWCV_SESSION_SECRET is not set; deploy one on Vercel so PDF download works across serverless instances.",
      );
    }
    res.json({
      ok: true,
      email: info.email,
      resumeId: info.resumeId || undefined,
    });
  } catch (error) {
    console.error("[FlowCV] login error:", error?.message || error);
    res.status(401).json({
      error: "FlowCV login failed",
      details: error?.message || String(error),
    });
  }
});

app.post("/api/flowcv/logout", (req, res) => {
  try {
    logoutFlowCvSession();
    const clr = buildFlowCvSessionClearCookieValue();
    if (clr) res.append("Set-Cookie", clr);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/**
 * Set which FlowCV resume id save/download/sync use (must exist under resumes/all).
 * Body: { "resumeId": "uuid" } or { "resumeIndex": 0 } (0-based).
 */
app.post("/api/flowcv/active-resume", async (req, res) => {
  try {
    await ensureFlowCvSession();
    if (!getFlowCvCookie()) {
      return res
        .status(401)
        .json({ error: "FlowCV session is not initialized" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const directId = String(body.resumeId ?? "").trim();
    if (directId) {
      setFlowCvActiveResumeId(directId);
      await syncActiveResumeFromFlowCvApi();
      const sc = buildFlowCvSessionSetCookieValue(
        getFlowCvCookie(),
        getFlowCvActiveResumeId(),
        getFlowCvSessionInfo().email || "",
      );
      if (sc) res.append("Set-Cookie", sc);
      return res.json({ ok: true, resumeId: getFlowCvActiveResumeId() });
    }

    const rawIdx = body.resumeIndex;
    if (rawIdx === undefined || rawIdx === null || String(rawIdx).trim() === "") {
      return res.status(400).json({
        error: "Provide resumeId or resumeIndex",
      });
    }

    const idx = Number(rawIdx);
    if (!Number.isFinite(idx) || !Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ error: "Invalid resumeIndex" });
    }

    const data = await with401Retry(async (c) => {
      return await fetchFlowCvResumesAll({ cookie: c });
    });
    const resumes = data?.data?.resumes;
    if (!Array.isArray(resumes) || idx >= resumes.length) {
      return res.status(404).json({
        error: "resumeIndex out of range",
        resumeIndex: idx,
        count: Array.isArray(resumes) ? resumes.length : 0,
      });
    }
    const picked = String(resumes[idx]?.id || "").trim();
    if (!picked) {
      return res.status(404).json({ error: "Resume at index has no id" });
    }
    setFlowCvActiveResumeId(picked);
    await syncActiveResumeFromFlowCvApi();
    const sc2 = buildFlowCvSessionSetCookieValue(
      getFlowCvCookie(),
      getFlowCvActiveResumeId(),
      getFlowCvSessionInfo().email || "",
    );
    if (sc2) res.append("Set-Cookie", sc2);
    return res.json({
      ok: true,
      resumeId: getFlowCvActiveResumeId(),
      resumeIndex: idx,
    });
  } catch (error) {
    console.error("[FlowCV] active-resume error:", error?.message || error);
    return res.status(500).json({
      error: "Failed to set active resume",
      details: error?.message || String(error),
    });
  }
});

/** Vercel runs this file as a serverless handler — no `listen()` (see `api/index.mjs`). */
export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initializeFlowCvSession()
      .then((r) => {
        if (r.ok) {
          console.log(`[FlowCV] Session ready (${r.source})`);
        } else {
          console.log(
            "[FlowCV] No session yet — use the app FlowCV sign-in, or start the server after a saved session exists on disk.",
          );
        }
      })
      .catch((err) =>
        console.error(
          "[FlowCV] Session init failed (will retry on first sync):",
          err.message,
        ),
      );
  });
}

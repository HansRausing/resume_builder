import axios from "axios";
import { useState } from "react";
import "./App.css";
import { downloadPDF } from "./utils/downloadPdf";

function App() {
  const [currentResume, setCurrentResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [tailoredResume, setTailoredResume] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Convert **text** to HTML bold tags
  const formatResumeWithBold = (text) => {
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  };

  const base64ToUint8Array = (base64) => {
    const clean = String(base64 || "").trim();
    if (!clean) return new Uint8Array();
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const sanitizeDownloadName = (name, fallback) => {
    let s = String(name || "");
    if (!s) s = String(fallback || "flowcv-resume.pdf");
    // Windows-illegal chars + control chars
    s = s.replace(/[\\/:*?"<>|\x00-\x1F]/g, "_").replace(/\s+/g, " ");
    if (!s.toLowerCase().endsWith(".pdf")) s += ".pdf";
    return s;
  };

  const handleTailorResume = async () => {
    if (!currentResume.trim() || !jobDescription.trim()) {
      setError(
        "Please provide both your current resume and the job description",
      );
      return;
    }

    if (!apiKey.trim()) {
      setError("Please provide your OpenAI API key");
      return;
    }

    setLoading(true);
    setError("");
    setTailoredResume("");
    setResumeFileName("");

    try {
      const response = await axios.post("/api/tailor-resume", {
        currentResume,
        jobDescription,
        apiKey,
      });

      setTailoredResume(response.data.tailoredResume);
      setResumeFileName(
        response.data?.tailoredResumeJson?.resumeFileName || "",
      );

      const pdfBase64 = response.data?.flowCvSync?.pdfBase64;
      if (pdfBase64) {
        const fileName = sanitizeDownloadName(
          response.data?.tailoredResumeJson?.resumeFileName,
          "flowcv-resume.pdf",
        );
        const bytes = base64ToUint8Array(pdfBase64);
        downloadPDF(bytes, fileName);
      }
    } catch (err) {
      setError(
        err.response?.data?.details ||
          err.response?.data?.error ||
          "Failed to generate tailored resume",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setLoading(true);
    setError("");

    try {
      const fileName = sanitizeDownloadName(
        resumeFileName,
        "flowcv-resume.pdf",
      );
      const res = await axios.get("/api/flowcv/download-pdf", {
        params: { previewPageCount: 2, filename: fileName },
        responseType: "arraybuffer",
      });

      downloadPDF(res.data, fileName);
    } catch (err) {
      console.error("FlowCV download error:", err);
      setError(
        err.response?.data?.error || "Failed to download PDF from FlowCV.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🎯 AI Resume Tailor</h1>
          <p>
            Minimal-change, high-signal resume optimization powered by OpenAI
            GPT-4
          </p>
          <p className="header-subtitle">
            Maximize recruiter callbacks while preserving your achievements
          </p>
        </header>

        <div className="input-section">
          <div className="input-group">
            <label htmlFor="apiKey">
              <span className="label-text">OpenAI API Key</span>
              <span className="label-hint">
                Get your API key from platform.openai.com/api-keys (changes will
                be shown in bold)
              </span>
            </label>
            <input
              id="apiKey"
              type="password"
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="input-group">
            <label htmlFor="currentResume">
              <span className="label-text">Your Master Resume</span>
              <span className="label-hint">
                Paste your complete resume with all experiences and achievements
              </span>
            </label>
            <textarea
              id="currentResume"
              placeholder="Paste your master resume here..."
              value={currentResume}
              onChange={(e) => setCurrentResume(e.target.value)}
              rows={12}
              className="textarea-field"
            />
          </div>

          <div className="input-group">
            <label htmlFor="jobDescription">
              <span className="label-text">Job Description</span>
              <span className="label-hint">
                Paste the job description you're applying for
              </span>
            </label>
            <textarea
              id="jobDescription"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={12}
              className="textarea-field"
            />
          </div>

          <button
            onClick={handleTailorResume}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "⏳ Generating..." : "✨ Tailor My Resume"}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {tailoredResume && (
          <div className="result-section">
            <div className="result-header">
              <h2>📄 Your Tailored Resume</h2>
              <div className="result-info">
                <span className="info-badge">
                  ✨ Changes highlighted in bold with yellow background
                </span>
              </div>
              <div className="result-actions">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={loading}
                  className="btn btn-success"
                >
                  {loading ? "⏳ Generating PDF..." : "📥 Download PDF"}
                </button>
              </div>
            </div>
            <div className="result-content">
              <pre
                dangerouslySetInnerHTML={{
                  __html: formatResumeWithBold(tailoredResume),
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
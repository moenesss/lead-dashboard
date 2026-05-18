import { useState } from "react"
import { API } from "../App"

// ─────────────────────────────────────────
// EXPORT CONFIG
// ─────────────────────────────────────────

const EXPORTS = [
  {
    key: "agencies",
    label: "Agencies",
    icon: "◈",
    description: "All agencies with contacts, socials, zone, rating",
    color: "badge-purple",
    endpoint: "/export/agencies",
    filename: "agencies.csv",
  },
  {
    key: "opportunities",
    label: "Opportunities",
    icon: "◎",
    description: "All scraped opportunities with platform, budget, status",
    color: "badge-green",
    endpoint: "/export/opportunities",
    filename: "opportunities.csv",
  },
  {
    key: "decision-makers",
    label: "Decision Makers",
    icon: "👤",
    description: "All decision makers with emails, phones, LinkedIn",
    color: "badge-blue",
    endpoint: "/export/decision-makers",
    filename: "decision_makers.csv",
  },
  {
    key: "outreach",
    label: "Outreach",
    icon: "◇",
    description: "All sent messages, follow-ups, responses",
    color: "badge-yellow",
    endpoint: "/export/outreach",
    filename: "outreach.csv",
  },
]

// ─────────────────────────────────────────
// DOWNLOAD HELPER
// ─────────────────────────────────────────

async function downloadFile(endpoint, filename, setLoading) {
  setLoading(true)
  try {
    const res = await fetch(`${API}${endpoint}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    alert(`Export failed: ${e.message}`)
  } finally {
    setLoading(false)
  }
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────

export default function ExportPage() {
  const [loading, setLoading] = useState({})
  const [loadingAll, setLoadingAll] = useState(false)

  const handleExport = (exp) => {
    downloadFile(
      exp.endpoint,
      exp.filename,
      (val) => setLoading(prev => ({ ...prev, [exp.key]: val }))
    )
  }

  const handleExportAll = () => {
    downloadFile("/export/all", "leadradar_export.zip", setLoadingAll)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Export Data</div>
          <div className="page-sub">Download your data as CSV or ZIP</div>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleExportAll}
          disabled={loadingAll}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          {loadingAll ? "⏳ Preparing..." : "⬇️ Export All (ZIP)"}
        </button>
      </div>

      {/* Export cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        {EXPORTS.map(exp => (
          <div
            key={exp.key}
            className="card"
            style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px" }}>{exp.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>{exp.label}</div>
                  <span className={`badge ${exp.color}`} style={{ fontSize: "10px", marginTop: "3px" }}>CSV</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.5" }}>
              {exp.description}
            </div>

            <button
              className="btn btn-primary"
              style={{ fontSize: "12px", padding: "8px 0", width: "100%" }}
              onClick={() => handleExport(exp)}
              disabled={loading[exp.key]}
            >
              {loading[exp.key] ? "⏳ Downloading..." : `⬇️ Download ${exp.label}`}
            </button>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="card" style={{ padding: "18px", background: "var(--bg2)" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "10px" }}>ℹ️ About exports</div>
        <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.8" }}>
          • All exports are UTF-8 encoded CSV files — open in Excel, Google Sheets, or any spreadsheet app.<br />
          • <strong>Export All (ZIP)</strong> downloads all 4 files in a single ZIP archive.<br />
          • Agencies export includes contact info (phone, email, socials) merged from the contacts table.<br />
          • Decision Makers export includes the agency name for each contact.<br />
          • Data is exported as-is from the database — no filtering applied.
        </div>
      </div>
    </div>
  )
}

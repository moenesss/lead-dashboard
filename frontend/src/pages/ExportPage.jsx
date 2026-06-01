import { useState, useEffect } from "react"
import { API } from "../App"
import axios from "axios"

const EXPORTS = [
    {
        key: "agencies",
        label: "Agencies",
        icon: "◈",
        color: "#7c6dfa",
        endpoint: "/export/agencies",
        statsKey: "total_agencies",
        description: "Agency name · category · zone · address · website · phone · email · Instagram · Facebook · LinkedIn · Google rating · opportunity score · pitch angle",
    },
    {
        key: "opportunities",
        label: "Opportunities",
        icon: "◎",
        color: "#4ade80",
        endpoint: "/export/opportunities",
        statsKey: "total_opportunities",
        description: "Job title · platform · category · contract type · client · budget (min/max TND) · status · posted date · link",
    },
    {
        key: "decision-makers",
        label: "Decision Makers",
        icon: "👤",
        color: "#60a5fa",
        endpoint: "/export/decision-makers",
        statsKey: "total_decision_makers",
        description: "Full name · job title · agency · zone · email · phone · LinkedIn · source",
    },
    {
        key: "outreach",
        label: "Outreach",
        icon: "◇",
        color: "#fbbf24",
        endpoint: "/export/outreach",
        statsKey: "total_outreach",
        description: "Agency · channel · date sent · responded (Yes/No) · outcome · follow-up date · notes",
    },
    {
        key: "client-prospects",
        label: "Client Prospects",
        icon: "🎯",
        color: "#fb923c",
        endpoint: "/export/client-prospects",
        statsKey: "total_prospects",
        description: "Business name · category · zone · phone · email · website · Instagram · Facebook · LinkedIn · Google rating · status",
    },
]

async function downloadCSV(endpoint, label) {
    const res = await fetch(`${API}${endpoint}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url

    // Extract filename from Content-Disposition header if available
    const disposition = res.headers.get("Content-Disposition") || ""
    const match = disposition.match(/filename=(.+)/)
    a.download = match ? match[1] : `${label.toLowerCase().replace(/\s+/g, "_")}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
}

export default function ExportPage() {
    const [loading, setLoading]   = useState({})
    const [loadingAll, setLoadingAll] = useState(false)
    const [done, setDone]         = useState({})
    const [counts, setCounts]     = useState({})

    // Load record counts for each section
    useEffect(() => {
        axios.get(`${API}/stats`).then(r => {
            setCounts(prev => ({
                ...prev,
                total_agencies:       r.data.total_agencies       ?? 0,
                total_opportunities:  r.data.total_opportunities  ?? 0,
                total_outreach:       r.data.total_outreach       ?? 0,
                total_decision_makers: r.data.total_decision_makers ?? 0,
            }))
        }).catch(() => {})

        axios.get(`${API}/client-prospector/stats`).then(r => {
            setCounts(prev => ({ ...prev, total_prospects: r.data.total ?? 0 }))
        }).catch(() => {})
    }, [])

    const handleExport = async (exp) => {
        setLoading(prev => ({ ...prev, [exp.key]: true }))
        setDone(prev => ({ ...prev, [exp.key]: false }))
        try {
            await downloadCSV(exp.endpoint, exp.label)
            setDone(prev => ({ ...prev, [exp.key]: true }))
            setTimeout(() => setDone(prev => ({ ...prev, [exp.key]: false })), 3000)
        } catch (e) {
            alert(`Export failed: ${e.message}`)
        } finally {
            setLoading(prev => ({ ...prev, [exp.key]: false }))
        }
    }

    const handleExportAll = async () => {
        setLoadingAll(true)
        try {
            await downloadCSV("/export/all", "leadradar_export")
        } catch (e) {
            alert(`ZIP export failed: ${e.message}`)
        } finally {
            setLoadingAll(false)
        }
    }

    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0)

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="page-title">⬇️ Export Data</div>
                    <div className="page-sub">
                        {totalRecords > 0 ? `${totalRecords.toLocaleString()} total records across all sections` : "Download your data as professional CSV files"}
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleExportAll}
                    disabled={loadingAll}
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}
                >
                    {loadingAll ? "⏳ Preparing ZIP…" : "📦 Export All (ZIP)"}
                </button>
            </div>

            {/* Format info banner */}
            <div style={{
                background: "#7c6dfa11", border: "1px solid #7c6dfa33",
                borderRadius: "12px", padding: "14px 18px", marginBottom: "24px",
                display: "flex", alignItems: "flex-start", gap: "12px",
            }}>
                <span style={{ fontSize: "20px", flexShrink: 0 }}>📋</span>
                <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.8 }}>
                    <strong style={{ color: "var(--text)" }}>Professional CSV format</strong> — every file includes a branded header (app name, export date, record count),
                    human-readable column names, UTF-8 encoding, and proper quoting so they open cleanly in
                    <strong style={{ color: "var(--text)" }}> Excel, Google Sheets</strong> or any spreadsheet app.
                    Boolean fields (responded, follow-up done) are exported as <strong style={{ color: "var(--text)" }}>Yes / No</strong>.
                    Files are named with today's date (e.g. <code style={{ color: "#7c6dfa" }}>agencies_2025-06-01.csv</code>).
                </div>
            </div>

            {/* Export cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px", marginBottom: "28px" }}>
                {EXPORTS.map(exp => {
                    const count = counts[exp.statsKey]
                    const isLoading = loading[exp.key]
                    const isDone = done[exp.key]
                    return (
                        <div key={exp.key} className="card" style={{ padding: "20px", marginBottom: 0, position: "relative", overflow: "hidden" }}>
                            {/* Accent top bar */}
                            <div style={{
                                position: "absolute", top: 0, left: 0, right: 0, height: "3px",
                                background: exp.color, borderRadius: "14px 14px 0 0",
                            }} />

                            {/* Header row */}
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px", marginTop: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{
                                        fontSize: "20px", background: exp.color + "22",
                                        borderRadius: "8px", padding: "6px 8px", lineHeight: 1,
                                    }}>
                                        {exp.icon}
                                    </span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: "14px" }}>{exp.label}</div>
                                        {count !== undefined && (
                                            <div style={{ fontSize: "11px", color: exp.color, fontFamily: "var(--mono)", fontWeight: 600 }}>
                                                {count.toLocaleString()} records
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span style={{
                                    background: "#ffffff11", color: "var(--muted)",
                                    borderRadius: "6px", padding: "2px 8px",
                                    fontSize: "10px", fontFamily: "var(--mono)",
                                    border: "1px solid var(--border2)",
                                }}>
                                    CSV
                                </span>
                            </div>

                            {/* Columns description */}
                            <div style={{
                                fontSize: "11px", color: "var(--muted)", lineHeight: 1.7,
                                marginBottom: "16px", minHeight: "48px",
                            }}>
                                {exp.description}
                            </div>

                            {/* Download button */}
                            <button
                                className={`btn ${isDone ? "btn-ghost" : "btn-primary"}`}
                                style={{
                                    width: "100%", fontSize: "12px", padding: "9px 0",
                                    background: isDone ? "#4ade8022" : undefined,
                                    color: isDone ? "#4ade80" : undefined,
                                    borderColor: isDone ? "#4ade8044" : undefined,
                                    transition: "all 0.2s",
                                }}
                                onClick={() => handleExport(exp)}
                                disabled={isLoading || count === 0}
                            >
                                {isLoading ? "⏳ Downloading…"
                                    : isDone    ? "✅ Downloaded!"
                                        : count === 0 ? "No data yet"
                                            : `⬇️ Download ${exp.label}`}
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* ZIP export card */}
            <div className="card" style={{
                padding: "20px 24px", marginBottom: "20px",
                background: "linear-gradient(135deg, #7c6dfa11 0%, var(--bg2) 100%)",
                borderColor: "#7c6dfa33",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px",
            }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>
                        📦 Export Everything
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        Downloads all 5 datasets (Agencies, Opportunities, Decision Makers, Outreach, Client Prospects)
                        as a single dated ZIP file — perfect for backups or sharing.
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleExportAll}
                    disabled={loadingAll}
                    style={{ flexShrink: 0, padding: "10px 24px", fontSize: "13px" }}
                >
                    {loadingAll ? "⏳ Preparing…" : "📦 Download ZIP"}
                </button>
            </div>

            {/* CSV format preview */}
            <div className="card" style={{ padding: "20px" }}>
                <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "12px" }}>
                    📄 CSV Format Preview
                </div>
                <div style={{
                    background: "var(--bg3)", border: "1px solid var(--border)",
                    borderRadius: "8px", padding: "14px 16px",
                    fontFamily: "var(--mono)", fontSize: "11px", color: "var(--muted)",
                    lineHeight: 1.9, overflow: "auto",
                }}>
                    <span style={{ color: "#fbbf24" }}>"LeadRadar — Tunisia Creative  |  Agencies"</span>{"\n"}
                    <span style={{ color: "#fbbf24" }}>"Exported: 2026-05-24 15:57","Records: 47"</span>{"\n"}
                    <span style={{ color: "var(--muted)" }}>""</span>{"\n"}
                    <span style={{ color: "#7c6dfa" }}>"ID","Agency Name","Category","Zone","Phone","Email","Instagram","Google Rating","Status"</span>{"\n"}
                    <span style={{ color: "var(--text)" }}>"1","Agence Pixel","Digital Agency","Berges du Lac","55 123 456","contact@pixel.tn","https://instagram.com/pixel","4.8","active"</span>{"\n"}
                    <span style={{ color: "var(--text)" }}>"2","Studio Nord","Production House","Ennasr","98 765 432","info@studionord.tn","","4.2","active"</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "10px", lineHeight: 1.7 }}>
                    ℹ️ Rows 1–2 are the <span style={{ color: "#fbbf24" }}>branded header</span> — real CSV cells that Excel displays cleanly without any parsing issues.
                    Row 3 is a blank separator. Data starts at row 4 with column headers.
                </div>
            </div>
        </div>
    )
}
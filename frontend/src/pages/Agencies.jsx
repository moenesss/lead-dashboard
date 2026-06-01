import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { API } from "../App"

const ZONES = ["Berges du Lac", "CUN", "Ennasr", "Centre Ville", "La Marsa", "Ariana", "Other"]
const CATEGORIES = ["Marketing Agency", "Production House", "Digital Agency", "Communication Agency", "Event Agency", "Other"]

// Scrapers in recommended run order
const SCRAPERS = [
    { key: "googlemaps", label: "Google Maps",    icon: "🗺️", endpoint: "/scrapers/run/googlemaps",  desc: "Scrapes agencies from Google Maps — name, address, phone, website, rating" },
    { key: "enrichment", label: "Enrich Websites",icon: "🔬", endpoint: "/scrapers/run/enrichment",  desc: "Visits each agency website to extract email + social media links" },
    { key: "linkedin",   label: "LinkedIn",        icon: "💼", endpoint: "/scrapers/run/linkedin",    desc: "Finds agency pages and decision makers on LinkedIn" },
    { key: "facebook",   label: "Facebook Pages",  icon: "📘", endpoint: "/scrapers/run/facebook",    desc: "Scrapes Facebook business pages for contact info" },
]

const categoryColor = c => {
    if (!c) return "badge-gray"
    if (c.includes("Production"))    return "badge-pink"
    if (c.includes("Digital"))       return "badge-blue"
    if (c.includes("Event"))         return "badge-yellow"
    if (c.includes("Communication")) return "badge-green"
    return "badge-purple"
}

export default function Agencies() {
    const [agencies, setAgencies]       = useState([])
    const [agencyStats, setAgencyStats] = useState(null)
    const [loading, setLoading]         = useState(true)
    const [error, setError]             = useState(null)
    const [search, setSearch]           = useState("")
    const [filterZone, setFilterZone]   = useState("")
    const [filterCat, setFilterCat]     = useState("")
    const [showModal, setShowModal]     = useState(false)
    const [detailModal, setDetailModal] = useState(null)
    const [selected, setSelected]       = useState(null)
    const [form, setForm]               = useState({})

    // Scraper state
    const [scraperRunning, setScraperRunning] = useState({})
    const [scraperResult, setScraperResult]   = useState({})
    const [showScrapers, setShowScrapers]     = useState(false)
    const [scraperLog, setScraperLog]         = useState([])
    const [clearing, setClearing]             = useState(false)

    const addLog = msg => setScraperLog(l => [...l.slice(-60), `[${new Date().toLocaleTimeString()}] ${msg}`])

    const load = useCallback(() => {
        setLoading(true)
        setError(null)
        const params = {}
        if (filterZone) params.zone = filterZone
        if (filterCat)  params.category = filterCat
        axios.get(`${API}/agencies/`, { params })
            .then(r => { setAgencies(r.data); setLoading(false) })
            .catch(() => { setError("Cannot connect to API. Make sure the backend is running on port 8000."); setLoading(false) })
    }, [filterZone, filterCat])

    const loadStats = () => {
        axios.get(`${API}/agencies/stats`).then(r => setAgencyStats(r.data)).catch(() => {})
    }

    const loadDetail = (agency) => {
        axios.get(`${API}/agencies/${agency.id}`)
            .then(r => setDetailModal(r.data))
            .catch(() => {})
    }

    useEffect(() => { load(); loadStats() }, [load])

    const openAdd  = () => { setForm({}); setSelected(null); setShowModal(true) }
    const openEdit = (a) => { setForm(a); setSelected(a); setShowModal(true) }

    const save = async () => {
        if (selected) await axios.patch(`${API}/agencies/${selected.id}`, form)
        else          await axios.post(`${API}/agencies/`, form)
        setShowModal(false)
        load(); loadStats()
    }

    const del = async (id) => {
        if (!confirm("Delete this agency and all its contacts / outreach history?")) return
        await axios.delete(`${API}/agencies/${id}`)
        load(); loadStats()
    }

    // ── Clear all agencies ──
    const clearAll = async () => {
        const total = agencyStats?.total ?? agencies.length
        if (!confirm(
            `⚠️ This will permanently delete ALL ${total} agencies and their contacts, decision makers, and intelligence data.\n\nOutreach history and opportunities are kept.\n\nContinue?`
        )) return
        setClearing(true)
        addLog("🗑 Clearing all agency data…")
        try {
            const res = await axios.delete(`${API}/agencies/clear/all`)
            const d = res.data?.deleted ?? {}
            addLog(`✅ Cleared: ${d.agencies ?? 0} agencies · ${d.contacts ?? 0} contacts · ${d.decision_makers ?? 0} DMs · ${d.agency_intelligence ?? 0} intel records`)
            load(); loadStats()
            setShowScrapers(true)
            addLog("ℹ️ Scraper panel opened — run Google Maps first, then Enrich Websites")
        } catch (err) {
            addLog(`❌ Clear failed: ${err.response?.data?.detail || err.message}`)
        } finally {
            setClearing(false)
        }
    }

    // ── Run a single scraper ──
    const runScraper = async (scraper) => {
        setScraperRunning(prev => ({ ...prev, [scraper.key]: true }))
        setScraperResult(prev => ({ ...prev, [scraper.key]: null }))
        addLog(`🚀 Starting ${scraper.label}…`)
        try {
            const res = await axios.post(`${API}${scraper.endpoint}`, {}, { timeout: 7200000 })
            const newCount = res.data?.new ?? res.data?.records_new ?? 0
            setScraperResult(prev => ({ ...prev, [scraper.key]: { ok: true, new: newCount } }))
            addLog(`✅ ${scraper.label} done — ${newCount} new records`)
            load(); loadStats()
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || "Unknown error"
            setScraperResult(prev => ({ ...prev, [scraper.key]: { ok: false, msg } }))
            addLog(`❌ ${scraper.label} failed: ${msg}`)
        } finally {
            setScraperRunning(prev => ({ ...prev, [scraper.key]: false }))
        }
    }

    // ── Run all scrapers in sequence ──
    const runAll = async () => {
        addLog("⚡ Running full scrape pipeline: Maps → Enrich → LinkedIn → Facebook")
        for (const scraper of SCRAPERS) {
            await runScraper(scraper)
        }
        addLog("🎉 Full pipeline complete!")
    }

    const anyRunning = Object.values(scraperRunning).some(Boolean)

    const filtered = agencies.filter(a =>
        !search ||
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.category?.toLowerCase().includes(search.toLowerCase()) ||
        a.zone?.toLowerCase().includes(search.toLowerCase()) ||
        a.email_general?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="page-title">◈ Agencies</div>
                    <div className="page-sub">
                        {agencyStats
                            ? `${agencyStats.total} agencies · ${agencyStats.with_email} with email · ${agencyStats.with_phone} with phone`
                            : `${agencies.length} production houses & marketing agencies`}
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        className="btn btn-ghost"
                        onClick={clearAll}
                        disabled={clearing || anyRunning}
                        style={{ padding: "9px 16px", fontSize: "12px", color: "#f87171", borderColor: "#f8717144" }}
                    >
                        {clearing ? "⏳ Clearing…" : "🗑 Clear All & Re-scrape"}
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => setShowScrapers(s => !s)}
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                        ⚡ {showScrapers ? "Hide Scrapers" : "Run Scrapers"}
                    </button>
                    <button className="btn btn-primary" onClick={openAdd}>+ Add Agency</button>
                </div>
            </div>

            {/* Stats bar */}
            {agencyStats && (
                <div className="stats-grid" style={{ marginBottom: "20px" }}>
                    <div className="stat-card" style={{ "--accent-color": "#7c6dfa" }}>
                        <div className="stat-label">Total Agencies</div>
                        <div className="stat-value">{agencyStats.total}</div>
                        <div className="stat-hint">In database</div>
                    </div>
                    <div className="stat-card" style={{ "--accent-color": "#4ade80" }}>
                        <div className="stat-label">With Email</div>
                        <div className="stat-value">{agencyStats.with_email}</div>
                        <div className="stat-hint">Ready to contact</div>
                    </div>
                    <div className="stat-card" style={{ "--accent-color": "#60a5fa" }}>
                        <div className="stat-label">With Phone</div>
                        <div className="stat-value">{agencyStats.with_phone}</div>
                        <div className="stat-hint">WhatsApp ready</div>
                    </div>
                    <div className="stat-card" style={{ "--accent-color": "#fbbf24" }}>
                        <div className="stat-label">Top Zone</div>
                        <div className="stat-value" style={{ fontSize: "16px" }}>
                            {agencyStats.by_zone?.[0]?.zone || "—"}
                        </div>
                        <div className="stat-hint">{agencyStats.by_zone?.[0]?.count ?? 0} agencies</div>
                    </div>
                </div>
            )}

            {/* Scraper Panel */}
            {showScrapers && (
                <div className="card" style={{ marginBottom: "20px", borderColor: "#7c6dfa33" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                        <div className="card-title" style={{ margin: 0 }}>⚡ Scraper Pipeline</div>
                        <button
                            className="btn btn-primary"
                            onClick={runAll}
                            disabled={anyRunning}
                            style={{ padding: "8px 20px", fontSize: "13px" }}
                        >
                            {anyRunning ? "⏳ Running…" : "🚀 Run Full Pipeline"}
                        </button>
                    </div>

                    {/* Info banner */}
                    <div style={{
                        background: "#7c6dfa11", border: "1px solid #7c6dfa33",
                        borderRadius: "10px", padding: "10px 14px", marginBottom: "14px",
                        fontSize: "12px", color: "#a5b4fc", lineHeight: 1.7,
                    }}>
                        💡 <strong>Recommended order:</strong> Run <strong>Google Maps</strong> first to build the list →
                        then <strong>Enrich Websites</strong> to get email + social links →
                        optionally LinkedIn & Facebook for extra contacts.
                    </div>

                    {/* Scraper cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "14px" }}>
                        {SCRAPERS.map((scraper, i) => {
                            const running = scraperRunning[scraper.key]
                            const result  = scraperResult[scraper.key]
                            return (
                                <div key={scraper.key} style={{
                                    background: "var(--bg3)",
                                    border: `1px solid ${running ? "#7c6dfa55" : result?.ok ? "#4ade8033" : result ? "#f8717133" : "var(--border2)"}`,
                                    borderRadius: "12px", padding: "14px 16px",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                                        <span style={{
                                            background: "#7c6dfa22", color: "#7c6dfa",
                                            borderRadius: "6px", padding: "2px 8px",
                                            fontSize: "11px", fontFamily: "var(--mono)", fontWeight: 700,
                                        }}>
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                        <span style={{ fontSize: "15px" }}>{scraper.icon}</span>
                                        <span style={{ fontWeight: 700, fontSize: "13px", flex: 1 }}>{scraper.label}</span>
                                        <button
                                            className={`btn ${running ? "btn-ghost" : "btn-primary"}`}
                                            style={{ padding: "6px 14px", fontSize: "12px", opacity: running ? 0.7 : 1 }}
                                            onClick={() => runScraper(scraper)}
                                            disabled={running || anyRunning}
                                        >
                                            {running ? "⏳ Running…" : "▶ Run"}
                                        </button>
                                    </div>
                                    <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "6px" }}>
                                        {scraper.desc}
                                    </div>
                                    {result && (
                                        <div style={{
                                            fontSize: "11px", fontFamily: "var(--mono)",
                                            padding: "4px 8px", borderRadius: "6px",
                                            background: result.ok ? "#4ade8022" : "#f8717122",
                                            color: result.ok ? "#4ade80" : "#f87171",
                                        }}>
                                            {result.ok
                                                ? `✅ ${result.new} new records found`
                                                : `❌ ${result.msg?.slice(0, 60)}`}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Scraper log */}
                    {scraperLog.length > 0 && (
                        <div style={{
                            background: "var(--bg3)", border: "1px solid var(--border)",
                            borderRadius: "10px", padding: "10px 14px",
                            maxHeight: "180px", overflowY: "auto",
                            fontFamily: "var(--mono)", fontSize: "11px",
                        }}>
                            <div style={{ color: "var(--muted)", marginBottom: "6px", fontWeight: 600 }}>Activity Log</div>
                            {scraperLog.map((l, i) => (
                                <div key={i} style={{
                                    color: l.includes("✅") || l.includes("🎉") ? "var(--success)"
                                        : l.includes("❌") ? "var(--danger)"
                                            : l.includes("⏳") || l.includes("🚀") || l.includes("🗑") ? "#a5b4fc"
                                                : "var(--muted)",
                                    marginBottom: "1px",
                                }}>
                                    {l}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div style={{ background: "#f8717122", border: "1px solid #f8717144", borderRadius: "10px", padding: "14px 18px", marginBottom: "20px", color: "var(--danger)", fontSize: "13px" }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Search & Filters */}
            <div className="search-bar">
                <span className="search-icon">⌕</span>
                <input
                    placeholder="Search by name, category, zone, email…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="filters">
                <button className={`filter-btn ${!filterZone ? "active" : ""}`} onClick={() => setFilterZone("")}>All Zones</button>
                {ZONES.map(z => (
                    <button key={z} className={`filter-btn ${filterZone === z ? "active" : ""}`} onClick={() => setFilterZone(z === filterZone ? "" : z)}>{z}</button>
                ))}
            </div>

            <div className="filters">
                <button className={`filter-btn ${!filterCat ? "active" : ""}`} onClick={() => setFilterCat("")}>All Types</button>
                {CATEGORIES.map(c => (
                    <button key={c} className={`filter-btn ${filterCat === c ? "active" : ""}`} onClick={() => setFilterCat(c === filterCat ? "" : c)}>{c}</button>
                ))}
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {loading ? (
                    <div className="loading">Loading agencies…</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">◈</div>
                        <div className="empty-text">No agencies found</div>
                        <div className="empty-sub">
                            {agencies.length === 0
                                ? "Click \"Run Scrapers\" above to start building your list"
                                : "Try adjusting your filters"}
                        </div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                            <tr>
                                <th>Agency</th>
                                <th>Category</th>
                                <th>Zone</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Socials</th>
                                <th>Rating</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map(a => (
                                <tr key={a.id}>
                                    {/* Agency name + website */}
                                    <td>
                                        <div
                                            style={{ fontWeight: 600, cursor: "pointer", color: "var(--accent)" }}
                                            onClick={() => loadDetail(a)}
                                        >
                                            {a.name}
                                        </div>
                                        {a.website && (
                                            <a
                                                href={a.website.startsWith("http") ? a.website : "https://" + a.website}
                                                target="_blank" rel="noreferrer"
                                                style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textDecoration: "none" }}
                                            >
                                                {a.website.replace(/^https?:\/\//, "").slice(0, 32)}
                                            </a>
                                        )}
                                    </td>

                                    {/* Category */}
                                    <td>
                                            <span className={`badge ${categoryColor(a.category)}`}>
                                                {a.category || "—"}
                                            </span>
                                    </td>

                                    {/* Zone */}
                                    <td>
                                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>{a.zone || "—"}</span>
                                    </td>

                                    {/* Phone → WhatsApp link */}
                                    <td>
                                        {a.phone ? (
                                            <a
                                                href={`https://wa.me/216${(a.phone || "").replace(/\D/g, "").slice(-8)}`}
                                                target="_blank" rel="noreferrer"
                                                style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "#4ade80", textDecoration: "none" }}
                                                title="Open in WhatsApp"
                                            >
                                                📱 {a.phone}
                                            </a>
                                        ) : (
                                            <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                                        )}
                                    </td>

                                    {/* Email */}
                                    <td>
                                        {a.email_general ? (
                                            <a
                                                href={`mailto:${a.email_general}`}
                                                style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#60a5fa", textDecoration: "none" }}
                                                title={a.email_general}
                                            >
                                                ✉️ {a.email_general.length > 26 ? a.email_general.slice(0, 24) + "…" : a.email_general}
                                            </a>
                                        ) : (
                                            <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                                        )}
                                    </td>

                                    {/* Socials */}
                                    <td>
                                        <div style={{ display: "flex", gap: "6px" }}>
                                            {a.instagram_url && (
                                                <a href={a.instagram_url} target="_blank" rel="noreferrer" style={{ fontSize: "16px", textDecoration: "none" }} title="Instagram">📸</a>
                                            )}
                                            {a.facebook_url && (
                                                <a href={a.facebook_url} target="_blank" rel="noreferrer" style={{ fontSize: "16px", textDecoration: "none" }} title="Facebook">📘</a>
                                            )}
                                            {a.linkedin_url && (
                                                <a href={a.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: "16px", textDecoration: "none" }} title="LinkedIn">💼</a>
                                            )}
                                            {!a.instagram_url && !a.facebook_url && !a.linkedin_url && (
                                                <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Rating */}
                                    <td>
                                        {a.google_rating ? (
                                            <span style={{ fontFamily: "var(--mono)", fontSize: "13px", color: "#fbbf24", fontWeight: 700 }}>
                                                    ⭐ {a.google_rating}
                                                </span>
                                        ) : (
                                            <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td>
                                        <div style={{ display: "flex", gap: "6px" }}>
                                            <button
                                                className="btn btn-ghost"
                                                onClick={() => openEdit(a)}
                                                style={{ padding: "4px 10px", fontSize: "11px" }}
                                            >✏️</button>
                                            <button
                                                className="btn btn-ghost"
                                                onClick={() => del(a.id)}
                                                style={{ padding: "4px 10px", fontSize: "11px", color: "var(--danger)" }}
                                            >✕</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">{selected ? "Edit Agency" : "Add Agency"}</div>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div style={{ display: "grid", gap: "14px" }}>
                            {[
                                ["name",        "Name *"],
                                ["category",    "Category"],
                                ["zone",        "Zone"],
                                ["website",     "Website"],
                                ["address",     "Address"],
                                ["notes",       "Notes"],
                            ].map(([field, label]) => (
                                <div key={field}>
                                    <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>
                                        {label}
                                    </label>
                                    <input
                                        className="input"
                                        value={form[field] || ""}
                                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                                        style={{ width: "100%" }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={save}>
                                {selected ? "Save Changes" : "Add Agency"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detailModal && (
                <div className="modal-overlay" onClick={() => setDetailModal(null)}>
                    <div className="modal" style={{ maxWidth: "640px" }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">{detailModal.agency?.name}</div>
                            <button className="modal-close" onClick={() => setDetailModal(null)}>✕</button>
                        </div>

                        {/* Contact info */}
                        {detailModal.contacts?.length > 0 && (
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Contact Info</div>
                                {detailModal.contacts.map((c, i) => (
                                    <div key={i} style={{ fontSize: "13px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
                                        {c.phone && <span>📱 {c.phone}</span>}
                                        {c.email_general && <a href={`mailto:${c.email_general}`} style={{ color: "#60a5fa" }}>✉️ {c.email_general}</a>}
                                        {c.instagram_url && <a href={c.instagram_url} target="_blank" rel="noreferrer" style={{ color: "#fb923c" }}>📸 Instagram</a>}
                                        {c.facebook_url  && <a href={c.facebook_url}  target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>📘 Facebook</a>}
                                        {c.linkedin_url  && <a href={c.linkedin_url}  target="_blank" rel="noreferrer" style={{ color: "#a5b4fc" }}>💼 LinkedIn</a>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Decision makers */}
                        {detailModal.decision_makers?.length > 0 && (
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Decision Makers</div>
                                {detailModal.decision_makers.map((d, i) => (
                                    <div key={i} style={{ fontSize: "13px", marginBottom: "4px" }}>
                                        👤 <strong>{d.name || d.full_name}</strong>
                                        {d.title && <span style={{ color: "var(--muted)" }}> — {d.title}</span>}
                                        {d.email && <a href={`mailto:${d.email}`} style={{ color: "#60a5fa", marginLeft: "8px" }}>{d.email}</a>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Intelligence */}
                        {detailModal.intelligence && (
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Intelligence</div>
                                <div style={{ fontSize: "13px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                                    {detailModal.intelligence.opportunity_score > 0 && (
                                        <span>⭐ Score: <strong>{detailModal.intelligence.opportunity_score}/10</strong></span>
                                    )}
                                    {detailModal.intelligence.instagram_followers > 0 && (
                                        <span>📸 {detailModal.intelligence.instagram_followers?.toLocaleString()} followers</span>
                                    )}
                                    {detailModal.intelligence.pitch_angle && (
                                        <span style={{ color: "var(--muted)" }}>💡 {detailModal.intelligence.pitch_angle}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
                            <button
                                className="btn btn-ghost"
                                style={{ color: "var(--danger)", fontSize: "12px" }}
                                onClick={() => { del(detailModal.agency.id); setDetailModal(null) }}
                            >
                                🗑 Delete Agency
                            </button>
                            <button className="btn btn-ghost" onClick={() => setDetailModal(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
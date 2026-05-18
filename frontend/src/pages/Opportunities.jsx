import { useEffect, useState } from "react"
import axios from "axios"
import { API } from "../App"

const PLATFORMS = ["freelances.tn", "tanitjobs", "keejob", "linkedin", "facebook", "instagram"]
const CATEGORIES = ["video", "photo", "design", "mixed"]
const STATUSES = ["new", "seen", "applied", "replied", "won", "lost", "expired"]

const statusColor = s => {
    if (s === "new") return "badge-green"
    if (s === "applied") return "badge-blue"
    if (s === "replied") return "badge-purple"
    if (s === "won") return "badge-yellow"
    if (s === "lost" || s === "expired") return "badge-red"
    return "badge-gray"
}

const platformColor = p => {
    if (p === "freelances.tn") return "badge-green"
    if (p === "linkedin") return "badge-blue"
    if (p === "tanitjobs") return "badge-purple"
    if (p === "facebook") return "badge-pink"
    if (p === "keejob") return "badge-yellow"
    return "badge-gray"
}

const SCRAPERS = [
    { key: "freelances",  label: "Freelances.tn", icon: "🟢", endpoint: "/scrapers/run/freelances"  },
    { key: "tanitjobs",   label: "TanitJobs",     icon: "🟣", endpoint: "/scrapers/run/tanitjobs"   },
    { key: "linkedin",    label: "LinkedIn Jobs",  icon: "🔵", endpoint: "/scrapers/run/linkedin"    },
    { key: "facebook",    label: "Facebook",       icon: "🔷", endpoint: "/scrapers/run/facebook"    },
    { key: "keejob",      label: "Keejob",         icon: "🟡", endpoint: "/scrapers/run/keejob"      },
]

export default function Opportunities() {
    const [opps, setOpps] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterPlatform, setFilterPlatform] = useState("")
    const [filterStatus, setFilterStatus] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({})

    // Scraper state
    const [scraperRunning, setScraperRunning] = useState({})
    const [scraperResult, setScraperResult] = useState({})
    const [showScrapers, setShowScrapers] = useState(false)

    const load = () => {
        setLoading(true)
        const params = {}
        if (filterPlatform) params.platform = filterPlatform
        if (filterStatus) params.status = filterStatus
        axios.get(`${API}/opportunities/`, { params })
            .then(r => setOpps(r.data))
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [filterPlatform, filterStatus])

    const updateStatus = async (id, status) => {
        await axios.patch(`${API}/opportunities/${id}`, { status, is_read: 1 })
        load()
    }

    const del = async (id) => {
        if (!confirm("Delete this opportunity?")) return
        await axios.delete(`${API}/opportunities/${id}`)
        load()
    }

    const save = async () => {
        await axios.post(`${API}/opportunities/`, form)
        setShowModal(false)
        setForm({})
        load()
    }

    const runScraper = async (scraper) => {
        setScraperRunning(prev => ({ ...prev, [scraper.key]: true }))
        setScraperResult(prev => ({ ...prev, [scraper.key]: null }))
        try {
            const res = await axios.post(`${API}${scraper.endpoint}`, {}, { timeout: 300000 })
            setScraperResult(prev => ({ ...prev, [scraper.key]: { ok: true, data: res.data } }))
            load() // refresh opportunities after scraping
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || "Unknown error"
            setScraperResult(prev => ({ ...prev, [scraper.key]: { ok: false, msg } }))
        } finally {
            setScraperRunning(prev => ({ ...prev, [scraper.key]: false }))
        }
    }

    const filtered = opps.filter(o =>
        !search || o.title?.toLowerCase().includes(search.toLowerCase()) ||
        o.client_name?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Opportunities</div>
                    <div className="page-sub">{opps.filter(o => o.status === "new").length} new · {opps.length} total</div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        className="btn btn-ghost"
                        onClick={() => setShowScrapers(s => !s)}
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                        ⚡ {showScrapers ? "Hide Scrapers" : "Run Scrapers"}
                    </button>
                    <button className="btn btn-primary" onClick={() => { setForm({}); setShowModal(true) }}>
                        + Add Manually
                    </button>
                </div>
            </div>

            {/* ── Scraper Panel ── */}
            {showScrapers && (
                <div className="card" style={{ marginBottom: "20px", padding: "20px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "14px", color: "var(--text)" }}>
                        ⚡ Run Scrapers
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {SCRAPERS.map(scraper => {
                            const running = scraperRunning[scraper.key]
                            const result = scraperResult[scraper.key]
                            return (
                                <div key={scraper.key} style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "160px" }}>
                                    <button
                                        className={`btn ${running ? "btn-ghost" : "btn-primary"}`}
                                        style={{ fontSize: "12px", padding: "8px 14px", opacity: running ? 0.7 : 1 }}
                                        onClick={() => runScraper(scraper)}
                                        disabled={running}
                                    >
                                        {running
                                            ? `⏳ Running...`
                                            : `${scraper.icon} ${scraper.label}`}
                                    </button>
                                    {result && (
                                        <div style={{
                                            fontSize: "11px",
                                            padding: "4px 8px",
                                            borderRadius: "6px",
                                            background: result.ok ? "var(--success)22" : "var(--danger)22",
                                            color: result.ok ? "var(--success)" : "var(--danger)",
                                            fontFamily: "var(--mono)",
                                        }}>
                                            {result.ok
                                                ? `✅ ${result.data?.new ?? 0} new found`
                                                : `❌ ${result.msg?.slice(0, 40)}`}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "12px" }}>
                        ℹ️ Scrapers run in the background — this may take 1–3 minutes. Page refreshes automatically when done.
                    </div>
                </div>
            )}

            <div className="search-bar">
                <span className="search-icon">⌕</span>
                <input placeholder="Search opportunities..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="filters">
                <button className={`filter-btn ${!filterPlatform ? "active" : ""}`} onClick={() => setFilterPlatform("")}>All Platforms</button>
                {PLATFORMS.map(p => (
                    <button key={p} className={`filter-btn ${filterPlatform === p ? "active" : ""}`} onClick={() => setFilterPlatform(p === filterPlatform ? "" : p)}>{p}</button>
                ))}
            </div>

            <div className="filters">
                <button className={`filter-btn ${!filterStatus ? "active" : ""}`} onClick={() => setFilterStatus("")}>All Status</button>
                {STATUSES.map(s => (
                    <button key={s} className={`filter-btn ${filterStatus === s ? "active" : ""}`} onClick={() => setFilterStatus(s === filterStatus ? "" : s)}>{s}</button>
                ))}
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {loading ? (
                    <div className="loading">Loading opportunities...</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">◎</div>
                        <div className="empty-text">No opportunities yet</div>
                        <div className="empty-sub">Add manually or run scrapers to populate</div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                            <tr>
                                <th>Title</th>
                                <th>Platform</th>
                                <th>Category</th>
                                <th>Budget</th>
                                <th>Posted</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map(o => (
                                <tr key={o.id} style={{ opacity: o.status === "expired" || o.status === "lost" ? 0.5 : 1 }}>
                                    <td>
                                        <div style={{ fontWeight: 600, maxWidth: "260px" }}>
                                            {o.url ? <a href={o.url} target="_blank" rel="noreferrer" style={{ color: "var(--text)", textDecoration: "none" }}>{o.title}</a> : o.title}
                                        </div>
                                        {o.client_name && <div style={{ fontSize: "11px", color: "var(--muted)" }}>{o.client_name}</div>}
                                    </td>
                                    <td><span className={`badge ${platformColor(o.platform)}`}>{o.platform}</span></td>
                                    <td><span className="badge badge-gray">{o.category || "—"}</span></td>
                                    <td>
                      <span style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--success)" }}>
                        {o.budget_min || o.budget_max
                            ? `${o.budget_min ?? "?"}–${o.budget_max ?? "?"} ${o.budget_currency}`
                            : "—"}
                      </span>
                                    </td>
                                    <td><span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--muted)" }}>{o.posted_date || o.date_scraped?.slice(0, 10)}</span></td>
                                    <td>
                                        <select
                                            value={o.status}
                                            onChange={e => updateStatus(o.id, e.target.value)}
                                            style={{ background: "transparent", border: "none", color: "inherit", fontFamily: "var(--mono)", fontSize: "11px", cursor: "pointer", padding: 0, width: "auto" }}
                                        >
                                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <button className="btn btn-danger" style={{ padding: "5px 10px", fontSize: "11px" }} onClick={() => del(o.id)}>Del</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Manually Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">Add Opportunity</div>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Title *</label>
                            <input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Looking for videographer for product shoot" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Platform *</label>
                                <select value={form.platform || ""} onChange={e => setForm({ ...form, platform: e.target.value })}>
                                    <option value="">Select...</option>
                                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select value={form.category || ""} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="">Select...</option>
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Budget Min (TND)</label>
                                <input type="number" value={form.budget_min || ""} onChange={e => setForm({ ...form, budget_min: e.target.value })} placeholder="500" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Budget Max (TND)</label>
                                <input type="number" value={form.budget_max || ""} onChange={e => setForm({ ...form, budget_max: e.target.value })} placeholder="1500" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Client Name</label>
                                <input value={form.client_name || ""} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="Company or person name" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">URL</label>
                                <input value={form.url || ""} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea rows={3} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Job description..." />
                        </div>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={save}>Add Opportunity</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
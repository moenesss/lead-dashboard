import { useEffect, useState } from "react"
import axios from "axios"
import { API } from "../App"

const ZONES = ["Berges du Lac", "CUN", "Ennasr", "Centre Ville", "La Marsa", "Ariana", "Other"]
const CATEGORIES = ["Marketing Agency", "Production House", "Digital Agency", "Communication Agency", "Event Agency", "Other"]

const SCRAPERS = [
    { key: "googlemaps",  label: "Google Maps",   icon: "🗺️", endpoint: "/scrapers/run/googlemaps"  },
    { key: "linkedin",    label: "LinkedIn",       icon: "🔵", endpoint: "/scrapers/run/linkedin"    },
    { key: "facebook",    label: "Facebook Pages", icon: "🔷", endpoint: "/scrapers/run/facebook"    },
    { key: "enrichment",  label: "Enrich Websites",icon: "🔍", endpoint: "/scrapers/run/enrichment"  },
]

export default function Agencies() {
    const [agencies, setAgencies] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [search, setSearch] = useState("")
    const [filterZone, setFilterZone] = useState("")
    const [filterCat, setFilterCat] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [detailModal, setDetailModal] = useState(null)
    const [selected, setSelected] = useState(null)
    const [form, setForm] = useState({})

    // Scraper state
    const [scraperRunning, setScraperRunning] = useState({})
    const [scraperResult, setScraperResult] = useState({})
    const [showScrapers, setShowScrapers] = useState(false)

    const load = () => {
        setLoading(true)
        setError(null)
        const params = {}
        if (filterZone) params.zone = filterZone
        if (filterCat) params.category = filterCat
        axios.get(`${API}/agencies/`, { params })
            .then(r => { setAgencies(r.data); setLoading(false) })
            .catch(() => { setError("Cannot connect to API. Make sure the backend is running on port 8000."); setLoading(false) })
    }

    const loadDetail = (agency) => {
        axios.get(`${API}/agencies/${agency.id}`)
            .then(r => setDetailModal(r.data))
            .catch(() => {})
    }

    useEffect(() => { load() }, [filterZone, filterCat])

    const openAdd = () => { setForm({}); setSelected(null); setShowModal(true) }
    const openEdit = (a) => { setForm(a); setSelected(a); setShowModal(true) }

    const save = async () => {
        if (selected) { await axios.patch(`${API}/agencies/${selected.id}`, form) }
        else { await axios.post(`${API}/agencies/`, form) }
        setShowModal(false)
        load()
    }

    const del = async (id) => {
        if (!confirm("Delete this agency?")) return
        await axios.delete(`${API}/agencies/${id}`)
        load()
    }

    const runScraper = async (scraper) => {
        setScraperRunning(prev => ({ ...prev, [scraper.key]: true }))
        setScraperResult(prev => ({ ...prev, [scraper.key]: null }))
        try {
            const res = await axios.post(`${API}${scraper.endpoint}`, {}, { timeout: 300000 })
            setScraperResult(prev => ({ ...prev, [scraper.key]: { ok: true, data: res.data } }))
            load()
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || "Unknown error"
            setScraperResult(prev => ({ ...prev, [scraper.key]: { ok: false, msg } }))
        } finally {
            setScraperRunning(prev => ({ ...prev, [scraper.key]: false }))
        }
    }

    const filtered = agencies.filter(a =>
        !search || a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.category?.toLowerCase().includes(search.toLowerCase()) ||
        a.zone?.toLowerCase().includes(search.toLowerCase())
    )

    const categoryColor = c => {
        if (!c) return "badge-gray"
        if (c.includes("Production")) return "badge-pink"
        if (c.includes("Digital")) return "badge-blue"
        if (c.includes("Event")) return "badge-yellow"
        if (c.includes("Communication")) return "badge-green"
        return "badge-purple"
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Agencies</div>
                    <div className="page-sub">{agencies.length} production houses & marketing agencies</div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
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
                                        {running ? `⏳ Running...` : `${scraper.icon} ${scraper.label}`}
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
                        ℹ️ Scrapers run in the background — this may take 1–5 minutes. Page refreshes automatically when done.
                    </div>
                </div>
            )}

            {error && (
                <div style={{ background: "#f8717122", border: "1px solid #f8717144", borderRadius: "10px", padding: "14px 18px", marginBottom: "20px", color: "var(--danger)", fontSize: "13px" }}>
                    ⚠️ {error}
                </div>
            )}

            <div className="search-bar">
                <span className="search-icon">⌕</span>
                <input placeholder="Search by name, category, zone..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="filters">
                <button className={`filter-btn ${!filterZone ? "active" : ""}`} onClick={() => setFilterZone("")}>All Zones</button>
                {ZONES.map(z => <button key={z} className={`filter-btn ${filterZone === z ? "active" : ""}`} onClick={() => setFilterZone(z === filterZone ? "" : z)}>{z}</button>)}
            </div>

            <div className="filters">
                <button className={`filter-btn ${!filterCat ? "active" : ""}`} onClick={() => setFilterCat("")}>All Types</button>
                {CATEGORIES.map(c => <button key={c} className={`filter-btn ${filterCat === c ? "active" : ""}`} onClick={() => setFilterCat(c === filterCat ? "" : c)}>{c}</button>)}
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {loading ? <div className="loading">Loading agencies...</div>
                    : filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">◈</div>
                            <div className="empty-text">No agencies found</div>
                            <div className="empty-sub">Add one manually or run a scraper</div>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                <tr><th>Agency</th><th>Category</th><th>Zone</th><th>Phone</th><th>Email</th><th>Socials</th><th>Rating</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                {filtered.map(a => (
                                    <tr key={a.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, cursor: "pointer", color: "var(--accent)" }} onClick={() => loadDetail(a)}>{a.name}</div>
                                            {a.website && <a href={a.website.startsWith("http") ? a.website : "https://" + a.website} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textDecoration: "none" }}>{a.website.replace(/^https?:\/\//, "").slice(0, 30)}</a>}
                                        </td>
                                        <td><span className={`badge ${categoryColor(a.category)}`}>{a.category || "—"}</span></td>
                                        <td><span style={{ fontSize: "12px", color: "var(--muted)" }}>{a.zone || "—"}</span></td>
                                        <td><span style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>{a.phone || "—"}</span></td>
                                        <td>{a.email_general ? <a href={`mailto:${a.email_general}`} style={{ fontSize: "12px", color: "var(--accent)", fontFamily: "var(--mono)", textDecoration: "none" }}>{a.email_general.slice(0, 25)}</a> : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                {a.instagram_url && <a href={a.instagram_url} target="_blank" rel="noreferrer" className="badge badge-pink" style={{ fontSize: "10px", padding: "2px 7px", textDecoration: "none" }}>IG</a>}
                                                {a.facebook_url && <a href={a.facebook_url} target="_blank" rel="noreferrer" className="badge badge-blue" style={{ fontSize: "10px", padding: "2px 7px", textDecoration: "none" }}>FB</a>}
                                                {a.linkedin_url && <a href={a.linkedin_url} target="_blank" rel="noreferrer" className="badge badge-purple" style={{ fontSize: "10px", padding: "2px 7px", textDecoration: "none" }}>LI</a>}
                                                {!a.instagram_url && !a.facebook_url && !a.linkedin_url && <span style={{ color: "var(--muted)" }}>—</span>}
                                            </div>
                                        </td>
                                        <td>{a.google_rating ? <span style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--warning)" }}>★ {a.google_rating}</span> : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "11px" }} onClick={() => openEdit(a)}>Edit</button>
                                                <button className="btn btn-danger" style={{ padding: "5px 10px", fontSize: "11px" }} onClick={() => del(a.id)}>Del</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
            </div>

            {/* Detail Modal */}
            {detailModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetailModal(null)}>
                    <div className="modal" style={{ width: "680px" }}>
                        <div className="modal-header">
                            <div className="modal-title">{detailModal.agency?.name}</div>
                            <button className="modal-close" onClick={() => setDetailModal(null)}>✕</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                            <div>
                                <div className="card-title">Agency Info</div>
                                {[["Category", detailModal.agency?.category], ["Zone", detailModal.agency?.zone], ["Address", detailModal.agency?.address], ["Website", detailModal.agency?.website], ["Rating", detailModal.agency?.google_rating ? `★ ${detailModal.agency.google_rating}` : null], ["Source", detailModal.agency?.source]].map(([label, value]) => value ? (
                                    <div key={label} style={{ marginBottom: "10px" }}>
                                        <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
                                        <div style={{ fontSize: "13px", marginTop: "2px" }}>{value}</div>
                                    </div>
                                ) : null)}
                            </div>
                            <div>
                                <div className="card-title">Contact Info</div>
                                {detailModal.contacts?.length > 0 ? detailModal.contacts.map((c, i) => (
                                    <div key={i}>
                                        {[["Phone", c.phone], ["WhatsApp", c.whatsapp], ["Email", c.email_general], ["Instagram", c.instagram_url], ["Facebook", c.facebook_url], ["LinkedIn", c.linkedin_url], ["TikTok", c.tiktok_url], ["YouTube", c.youtube_url]].map(([label, value]) => value ? (
                                            <div key={label} style={{ marginBottom: "10px" }}>
                                                <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
                                                <div style={{ fontSize: "13px", marginTop: "2px", wordBreak: "break-all" }}>
                                                    {label === "Email" ? <a href={`mailto:${value}`} style={{ color: "var(--accent)", textDecoration: "none" }}>{value}</a>
                                                        : label === "Phone" || label === "WhatsApp" ? <a href={`tel:${value}`} style={{ color: "var(--success)", textDecoration: "none", fontFamily: "var(--mono)" }}>{value}</a>
                                                            : <a href={value} target="_blank" rel="noreferrer" style={{ color: "var(--accent2)", textDecoration: "none" }}>{value.slice(0, 45)}</a>}
                                                </div>
                                            </div>
                                        ) : null)}
                                    </div>
                                )) : <div style={{ color: "var(--muted)", fontSize: "13px" }}>No contact info yet</div>}
                            </div>
                        </div>
                        {detailModal.agency?.notes && (
                            <div style={{ marginTop: "16px", background: "var(--bg3)", borderRadius: "8px", padding: "12px" }}>
                                <div className="card-title">Notes</div>
                                <div style={{ fontSize: "13px", color: "var(--muted)" }}>{detailModal.agency.notes}</div>
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px", gap: "10px" }}>
                            <button className="btn btn-ghost" onClick={() => { openEdit(detailModal.agency); setDetailModal(null) }}>Edit</button>
                            <button className="btn btn-primary" onClick={() => setDetailModal(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">{selected ? "Edit Agency" : "Add Agency"}</div>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Agency Name *</label><input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Agency name" /></div>
                            <div className="form-group"><label className="form-label">Category</label><select value={form.category || ""} onChange={e => setForm({ ...form, category: e.target.value })}><option value="">Select...</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label className="form-label">Zone</label><select value={form.zone || ""} onChange={e => setForm({ ...form, zone: e.target.value })}><option value="">Select...</option>{ZONES.map(z => <option key={z}>{z}</option>)}</select></div>
                            <div className="form-group"><label className="form-label">Website</label><input value={form.website || ""} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="agency.tn" /></div>
                        </div>
                        <div className="form-group"><label className="form-label">Notes</label><textarea rows={3} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Your notes..." /></div>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={save}>{selected ? "Save Changes" : "Add Agency"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
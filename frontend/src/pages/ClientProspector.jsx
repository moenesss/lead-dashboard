import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { API } from "../App"

const CLIENT_CATEGORIES = [
    { id: "restaurants",     icon: "🍽",  label: "Restaurants",             color: "#f97316", why: "Ambiance films, dish photography, promo reels" },
    { id: "cafes",           icon: "☕",  label: "Cafés & Tea Rooms",        color: "#a78bfa", why: "Atmosphere content, social presence" },
    { id: "hotels",          icon: "🏨",  label: "Hotels & Resorts",         color: "#60a5fa", why: "Venue tours, booking content, brand films" },
    { id: "event_venues",    icon: "🎪",  label: "Event Venues",             color: "#34d399", why: "Event coverage, venue showcases" },
    { id: "fitness",         icon: "💪",  label: "Gyms & Fitness",           color: "#a78bfa", why: "Promo reels, class highlights, campaigns" },
    { id: "beauty",          icon: "💆",  label: "Spas & Beauty Salons",     color: "#fb7185", why: "Service demos, atmosphere content" },
    { id: "retail",          icon: "🛍",  label: "Retail & Showrooms",       color: "#2dd4bf", why: "Product photography, lookbooks, launch reels" },
    { id: "wedding",         icon: "💍",  label: "Wedding Planners",         color: "#f9a8d4", why: "Wedding films, styled shoots" },
    { id: "coworking",       icon: "🏗",  label: "Coworking Spaces",         color: "#67e8f9", why: "Space tours, member stories" },
    { id: "clinics",         icon: "🏥",  label: "Clinics & Medical",        color: "#86efac", why: "Facility tours, trust-building content" },
    { id: "startups",        icon: "🚀",  label: "Startups & Tech",          color: "#818cf8", why: "Pitch videos, team culture, demos" },
    { id: "automotive",      icon: "🚗",  label: "Automotive & Showrooms",   color: "#94a3b8", why: "Car photography, showroom tours" },
    { id: "architecture",    icon: "📐",  label: "Architecture & Design",    color: "#c084fc", why: "Portfolio shoots, project showcases" },
    { id: "sports_clubs",    icon: "⛳",  label: "Sports Clubs",             color: "#4ade80", why: "Facility tours, event coverage" },
    { id: "cultural_venues", icon: "🎨",  label: "Galleries & Culture",      color: "#fbbf24", why: "Exhibition films, event coverage" },
    { id: "patisseries",     icon: "🍰",  label: "Pâtisseries & Bakeries",   color: "#f9a8d4", why: "Product photography, ambiance reels, social content" },
    { id: "jewelry",         icon: "💎",  label: "Jewelry & Gold Stores",    color: "#fde68a", why: "Product photography, luxury showcase films, campaigns" },
]

const ZONES = [
    "Berges Du Lac", "La Marsa", "Gammarth", "Sidi Bou Said",
    "Carthage", "Ennasr", "Menzah", "Centre Urbain Nord",
    "Soukra", "Tunis",
]

const STATUS_OPTIONS = ["prospect", "contacted", "in_discussion", "won", "lost", "not_interested"]

const statusColor = s => {
    if (s === "prospect")      return { bg: "#7c6dfa22", color: "#7c6dfa", label: "Prospect" }
    if (s === "contacted")     return { bg: "#60a5fa22", color: "#60a5fa", label: "Contacted" }
    if (s === "in_discussion") return { bg: "#fbbf2422", color: "#fbbf24", label: "In Discussion" }
    if (s === "won")           return { bg: "#4ade8022", color: "#4ade80", label: "Won 🎉" }
    if (s === "lost")          return { bg: "#f8717122", color: "#f87171", label: "Lost" }
    if (s === "not_interested")return { bg: "#94a3b822", color: "#94a3b8", label: "Not Interested" }
    return { bg: "#ffffff11", color: "var(--muted)", label: s }
}

export default function ClientProspector() {
    const [clients, setClients]           = useState([])
    const [stats, setStats]               = useState(null)
    const [loading, setLoading]           = useState(true)
    const [search, setSearch]             = useState("")
    const [filterCat, setFilterCat]       = useState("")
    const [filterZone, setFilterZone]     = useState("")
    const [filterStatus, setFilterStatus] = useState("")
    const [showPanel, setShowPanel]       = useState(false)

    // Scraper state
    const [selectedCats, setSelectedCats]     = useState([])
    const [maxResults, setMaxResults]         = useState(20)
    const [customQuery, setCustomQuery]       = useState("")
    const [customZone, setCustomZone]         = useState("Tunis")
    const [scraperRunning, setScraperRunning] = useState({})
    const [scraperResult, setScraperResult]   = useState({})
    const [scraperLog, setScraperLog]         = useState([])
    const [enriching, setEnriching]           = useState(false)
    const [clearing, setClearing]             = useState(false)

    const addLog = msg => setScraperLog(l => [...l.slice(-40), `[${new Date().toLocaleTimeString()}] ${msg}`])

    const loadClients = useCallback(() => {
        setLoading(true)
        const params = {}
        if (filterCat)    params.category_id = filterCat
        if (filterZone)   params.zone = filterZone
        if (filterStatus) params.status = filterStatus
        axios.get(`${API}/client-prospector/`, { params })
            .then(r => setClients(r.data))
            .finally(() => setLoading(false))
    }, [filterCat, filterZone, filterStatus])

    const loadStats = () => {
        axios.get(`${API}/client-prospector/stats`).then(r => setStats(r.data)).catch(() => {})
    }

    useEffect(() => { loadClients(); loadStats() }, [loadClients])

    // ── Scraper controls ──
    const toggleCat = id => setSelectedCats(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
    const selectAll  = () => setSelectedCats(CLIENT_CATEGORIES.map(c => c.id))
    const selectNone = () => setSelectedCats([])
    const allSelected = selectedCats.length === CLIENT_CATEGORIES.length

    const runScraper = async (catId) => {
        setScraperRunning(r => ({ ...r, [catId]: true }))
        setScraperResult(r => ({ ...r, [catId]: null }))
        addLog(`🕷 Scraping ${catId} + enriching websites…`)
        try {
            const res = await axios.post(`${API}/client-prospector/scrape`, {
                category_id: catId, max_results: maxResults,
            }, { timeout: 7200000 })
            const n = res.data?.new ?? 0
            const u = res.data?.updated ?? 0
            const e = res.data?.enriched ?? 0
            setScraperResult(r => ({ ...r, [catId]: { ok: true, msg: `✅ ${n} new · ${u} updated · ${e} enriched` } }))
            addLog(`✅ ${catId}: ${n} new, ${u} updated, ${e} websites enriched`)
            loadClients(); loadStats()
        } catch (err) {
            const msg = err.response?.data?.detail || err.message
            setScraperResult(r => ({ ...r, [catId]: { ok: false, msg: `❌ ${msg}` } }))
            addLog(`❌ ${catId}: ${msg}`)
        } finally {
            setScraperRunning(r => ({ ...r, [catId]: false }))
        }
    }

    const runSelected = async () => {
        if (selectedCats.length === 0) return
        for (const id of selectedCats) await runScraper(id)
    }

    const runCustom = async () => {
        if (!customQuery.trim()) return
        setScraperRunning(r => ({ ...r, custom: true }))
        addLog(`🔍 Custom: "${customQuery}" in ${customZone}…`)
        try {
            const res = await axios.post(`${API}/client-prospector/scrape-custom`, {
                query: customQuery, zone: customZone, max_results: maxResults,
            }, { timeout: 7200000 })
            const n = res.data?.new ?? 0
            const e = res.data?.enriched ?? 0
            addLog(`✅ Custom: ${n} new, ${e} enriched`)
            setScraperResult(r => ({ ...r, custom: { ok: true, msg: `✅ ${n} new, ${e} enriched` } }))
            loadClients(); loadStats()
        } catch (err) {
            addLog(`❌ Custom: ${err.response?.data?.detail || err.message}`)
            setScraperResult(r => ({ ...r, custom: { ok: false, msg: `❌ ${err.message}` } }))
        } finally {
            setScraperRunning(r => ({ ...r, custom: false }))
        }
    }

    // ── Enrich only (no scrape) ──
    const runEnrichOnly = async () => {
        setEnriching(true)
        addLog(`🔬 Running website enrichment on ${stats?.pending_enrichment ?? "all"} prospects…`)
        try {
            const res = await axios.post(`${API}/client-prospector/enrich`, {}, { timeout: 7200000 })
            addLog(`✅ Enrichment done: ${res.data?.enriched ?? 0} prospects updated`)
            loadClients(); loadStats()
        } catch (err) {
            addLog(`❌ Enrichment failed: ${err.response?.data?.detail || err.message}`)
        } finally {
            setEnriching(false)
        }
    }

    // ── Clear all + re-scrape ──
    const clearAll = async () => {
        if (!window.confirm(`Delete ALL ${stats?.total ?? ""} prospects? This cannot be undone.`)) return
        setClearing(true)
        try {
            const res = await axios.delete(`${API}/client-prospector/clear/all`)
            addLog(`🗑 Cleared ${res.data?.deleted ?? 0} prospects from database`)
            loadClients(); loadStats()
            setShowPanel(true)
        } catch (err) {
            addLog(`❌ Clear failed: ${err.message}`)
        } finally {
            setClearing(false)
        }
    }

    const updateStatus = async (id, status) => {
        await axios.patch(`${API}/client-prospector/${id}`, { status })
        loadClients()
    }

    const del = async (id) => {
        if (!confirm("Delete this prospect?")) return
        await axios.delete(`${API}/client-prospector/${id}`)
        loadClients(); loadStats()
    }

    const filtered = clients.filter(c => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
            c.name?.toLowerCase().includes(q) ||
            c.zone?.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            c.email?.toLowerCase().includes(q)
        )
    })

    const anyRunning = Object.values(scraperRunning).some(Boolean)

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="page-title">🎯 Client Prospector</div>
                    <div className="page-sub">
                        Scrape premium direct clients · email + social media · quality filter ON
                    </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    {stats?.pending_enrichment > 0 && (
                        <button
                            className="btn btn-ghost"
                            onClick={runEnrichOnly}
                            disabled={enriching}
                            style={{ padding: "9px 16px", fontSize: "12px", color: "#60a5fa", borderColor: "#60a5fa44" }}
                        >
                            {enriching ? "⏳ Enriching…" : `🔬 Enrich ${stats.pending_enrichment} websites`}
                        </button>
                    )}
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
                        onClick={() => setShowPanel(p => !p)}
                        style={{ padding: "9px 18px" }}
                    >
                        {showPanel ? "✕ Close Scraper" : "⚡ Open Scraper"}
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            {stats && (
                <div className="stats-grid" style={{ marginBottom: "20px" }}>
                    <div className="stat-card" style={{ "--accent-color": "#7c6dfa" }}>
                        <div className="stat-label">Total Prospects</div>
                        <div className="stat-value">{stats.total ?? 0}</div>
                        <div className="stat-hint">{stats.by_status?.prospect ?? 0} new</div>
                    </div>
                    <div className="stat-card" style={{ "--accent-color": "#4ade80" }}>
                        <div className="stat-label">With Email</div>
                        <div className="stat-value">{stats.with_email ?? 0}</div>
                        <div className="stat-hint">Ready to contact</div>
                    </div>
                    <div className="stat-card" style={{ "--accent-color": "#fb923c" }}>
                        <div className="stat-label">With Instagram</div>
                        <div className="stat-value">{stats.with_instagram ?? 0}</div>
                        <div className="stat-hint">DM ready</div>
                    </div>
                    <div className="stat-card" style={{ "--accent-color": "#60a5fa" }}>
                        <div className="stat-label">With Phone</div>
                        <div className="stat-value">{stats.with_phone ?? 0}</div>
                        <div className="stat-hint">WhatsApp ready</div>
                    </div>
                </div>
            )}

            {/* Scraper Panel */}
            {showPanel && (
                <div className="card" style={{ marginBottom: "24px", borderColor: "#7c6dfa33" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                        <div className="card-title" style={{ margin: 0 }}>🕷 Scraper Control</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <button
                                onClick={allSelected ? selectNone : selectAll}
                                style={{
                                    background: allSelected ? "#7c6dfa22" : "var(--bg3)",
                                    border: `1px solid ${allSelected ? "#7c6dfa66" : "var(--border2)"}`,
                                    color: allSelected ? "var(--accent)" : "var(--muted)",
                                    borderRadius: "8px", padding: "6px 14px",
                                    fontSize: "12px", cursor: "pointer", fontFamily: "var(--font)",
                                }}
                            >
                                {allSelected ? "✓ All Selected" : "Select All"}
                            </button>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>Max per query:</span>
                                <input
                                    type="number" min={5} max={60} value={maxResults}
                                    onChange={e => setMaxResults(Number(e.target.value))}
                                    style={{
                                        background: "var(--bg3)", border: "1px solid var(--border2)",
                                        color: "var(--text)", borderRadius: "8px", padding: "5px 10px",
                                        width: "60px", fontSize: "13px", fontFamily: "var(--mono)", textAlign: "center",
                                    }}
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={runSelected}
                                disabled={anyRunning || selectedCats.length === 0}
                                style={{ padding: "8px 20px", fontSize: "13px" }}
                            >
                                {anyRunning ? "⏳ Running…" : `⚡ Run ${selectedCats.length > 0 ? `(${selectedCats.length})` : ""}`}
                            </button>
                        </div>
                    </div>

                    {/* Info banner */}
                    <div style={{
                        background: "#60a5fa11", border: "1px solid #60a5fa33",
                        borderRadius: "10px", padding: "10px 14px", marginBottom: "14px",
                        fontSize: "12px", color: "#60a5fa", lineHeight: 1.6,
                    }}>
                        ℹ️ Each scrape runs in <strong>2 phases</strong>: (1) Google Maps → name, address, phone, rating &nbsp;|&nbsp;
                        (2) Website visit → <strong>email</strong>, Instagram, Facebook, LinkedIn, TikTok.
                        Phase 2 takes longer but gives you full contact info.
                    </div>

                    {/* Category grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
                        {CLIENT_CATEGORIES.map(cat => {
                            const isSelected = selectedCats.includes(cat.id)
                            const isRunning = scraperRunning[cat.id]
                            const result = scraperResult[cat.id]
                            return (
                                <div
                                    key={cat.id}
                                    onClick={() => !isRunning && toggleCat(cat.id)}
                                    style={{
                                        background: isSelected ? cat.color + "15" : "var(--bg3)",
                                        border: `1px solid ${isSelected ? cat.color + "55" : "var(--border2)"}`,
                                        borderRadius: "10px", padding: "10px 12px",
                                        cursor: isRunning ? "default" : "pointer",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "16px" }}>{cat.icon}</span>
                                        <span style={{ fontSize: "12px", fontWeight: 600, flex: 1 }}>{cat.label}</span>
                                        <button
                                            onClick={e => { e.stopPropagation(); runScraper(cat.id) }}
                                            disabled={isRunning || anyRunning}
                                            style={{
                                                background: isRunning ? "#7c6dfa33" : "#7c6dfa22",
                                                border: "1px solid #7c6dfa44",
                                                color: "#7c6dfa", borderRadius: "6px",
                                                padding: "3px 10px", fontSize: "11px", cursor: "pointer",
                                                opacity: (!isRunning && anyRunning) ? 0.5 : 1,
                                            }}
                                        >
                                            {isRunning ? "⏳" : "▶"}
                                        </button>
                                    </div>
                                    <div style={{ fontSize: "10px", color: "var(--muted)", lineHeight: 1.4 }}>{cat.why}</div>
                                    {result && (
                                        <div style={{
                                            fontSize: "10px", fontFamily: "var(--mono)", marginTop: "4px",
                                            color: result.ok ? "var(--success)" : "var(--danger)",
                                        }}>
                                            {result.msg}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Custom query */}
                    <div style={{
                        background: "var(--bg3)", border: "1px solid var(--border)",
                        borderRadius: "10px", padding: "12px 16px",
                        display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
                        marginBottom: scraperLog.length > 0 ? "12px" : 0,
                    }}>
                        <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", flexShrink: 0 }}>Custom:</span>
                        <input
                            style={{
                                background: "var(--bg2)", border: "1px solid var(--border2)",
                                color: "var(--text)", borderRadius: "8px", padding: "6px 12px",
                                fontSize: "13px", fontFamily: "var(--font)", flex: 1, minWidth: "160px",
                            }}
                            placeholder='e.g. "agence immobilière luxe"'
                            value={customQuery} onChange={e => setCustomQuery(e.target.value)}
                        />
                        <select
                            value={customZone} onChange={e => setCustomZone(e.target.value)}
                            style={{
                                background: "var(--bg2)", border: "1px solid var(--border2)",
                                color: "var(--text)", borderRadius: "8px", padding: "6px 12px", fontSize: "13px",
                            }}
                        >
                            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                        <button
                            className="btn btn-ghost"
                            onClick={runCustom}
                            disabled={scraperRunning.custom || anyRunning || !customQuery.trim()}
                            style={{ padding: "7px 16px", fontSize: "12px" }}
                        >
                            {scraperRunning.custom ? "⏳" : "🔍 Run"}
                        </button>
                        {scraperResult.custom && (
                            <div style={{ fontSize: "11px", fontFamily: "var(--mono)", color: scraperResult.custom.ok ? "var(--success)" : "var(--danger)", flexBasis: "100%" }}>
                                {scraperResult.custom.msg}
                            </div>
                        )}
                    </div>

                    {/* Scraper log */}
                    {scraperLog.length > 0 && (
                        <div style={{
                            background: "var(--bg3)", border: "1px solid var(--border)",
                            borderRadius: "10px", padding: "10px 14px",
                            maxHeight: "160px", overflowY: "auto",
                            fontFamily: "var(--mono)", fontSize: "11px",
                        }}>
                            {scraperLog.map((l, i) => (
                                <div key={i} style={{ color: l.includes("✅") ? "var(--success)" : l.includes("❌") ? "var(--danger)" : "var(--muted)" }}>
                                    {l}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Filters */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>⌕</span>
                    <input
                        style={{
                            background: "var(--bg2)", border: "1px solid var(--border2)",
                            color: "var(--text)", borderRadius: "10px", padding: "8px 12px 8px 32px",
                            fontSize: "13px", width: "100%", fontFamily: "var(--font)",
                        }}
                        placeholder="Search name, zone, phone, email…"
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                        style={{ background: "var(--bg2)", border: "1px solid var(--border2)", color: filterCat ? "var(--text)" : "var(--muted)", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", fontFamily: "var(--font)" }}>
                    <option value="">All Categories</option>
                    {CLIENT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
                <select value={filterZone} onChange={e => setFilterZone(e.target.value)}
                        style={{ background: "var(--bg2)", border: "1px solid var(--border2)", color: filterZone ? "var(--text)" : "var(--muted)", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", fontFamily: "var(--font)" }}>
                    <option value="">All Zones</option>
                    {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        style={{ background: "var(--bg2)", border: "1px solid var(--border2)", color: filterStatus ? "var(--text)" : "var(--muted)", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", fontFamily: "var(--font)" }}>
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusColor(s).label}</option>)}
                </select>
                <a href={`${API}/client-prospector/export/csv`} style={{ textDecoration: "none" }}>
                    <button className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: "12px" }}>⬇ Export CSV</button>
                </a>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "var(--mono)", flexShrink: 0 }}>
                    {filtered.length} results
                </span>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {loading ? (
                    <div className="loading">Loading prospects…</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state" style={{ padding: "60px 0" }}>
                        <div className="empty-icon">🎯</div>
                        <div className="empty-text">No prospects yet</div>
                        <div className="empty-sub">Open the scraper panel above and run a category</div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                            <tr>
                                <th>Business</th>
                                <th>Category</th>
                                <th>Zone</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Socials</th>
                                <th>Rating</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map(c => {
                                const cat = CLIENT_CATEGORIES.find(x => x.id === c.category_id)
                                const sc = statusColor(c.status)
                                return (
                                    <tr key={c.id}>
                                        {/* Business */}
                                        <td>
                                            <div style={{ fontWeight: 600, marginBottom: "2px" }}>{c.name}</div>
                                            {c.address && (
                                                <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                                                    {c.address.slice(0, 48)}{c.address.length > 48 ? "…" : ""}
                                                </div>
                                            )}
                                            {c.website && (
                                                <a href={c.website.startsWith("http") ? c.website : "https://" + c.website}
                                                   target="_blank" rel="noreferrer"
                                                   style={{ fontSize: "10px", color: "#7c6dfa", fontFamily: "var(--mono)", textDecoration: "none" }}>
                                                    🌐 {c.website.replace(/^https?:\/\//, "").split("/")[0].slice(0, 28)}
                                                </a>
                                            )}
                                        </td>

                                        {/* Category */}
                                        <td>
                                            {cat ? (
                                                <span style={{
                                                    background: cat.color + "22", color: cat.color,
                                                    borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: 600,
                                                }}>
                                                        {cat.icon} {cat.label}
                                                    </span>
                                            ) : (
                                                <span style={{ color: "var(--muted)", fontSize: "12px" }}>{c.category_id || "—"}</span>
                                            )}
                                        </td>

                                        {/* Zone */}
                                        <td>
                                            <span style={{ fontSize: "12px", color: "var(--muted)" }}>{c.zone || "—"}</span>
                                        </td>

                                        {/* Phone */}
                                        <td>
                                            {c.phone ? (
                                                <a href={`https://wa.me/216${c.phone.replace(/\D/g, "").slice(-8)}`}
                                                   target="_blank" rel="noreferrer"
                                                   style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "#4ade80", textDecoration: "none" }}
                                                   title="Open in WhatsApp">
                                                    📱 {c.phone}
                                                </a>
                                            ) : (
                                                <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                                            )}
                                        </td>

                                        {/* Email */}
                                        <td>
                                            {c.email ? (
                                                <a href={`mailto:${c.email}`}
                                                   style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#60a5fa", textDecoration: "none" }}
                                                   title={c.email}>
                                                    ✉️ {c.email.length > 26 ? c.email.slice(0, 24) + "…" : c.email}
                                                </a>
                                            ) : (
                                                <span style={{ color: "var(--muted)", fontSize: "11px", fontFamily: "var(--mono)" }}>
                                                        {c.website && !c.enriched ? "⏳ pending" : "—"}
                                                    </span>
                                            )}
                                        </td>

                                        {/* Socials */}
                                        <td>
                                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                                {c.instagram_url && (
                                                    <a href={c.instagram_url} target="_blank" rel="noreferrer"
                                                       style={{ fontSize: "16px", textDecoration: "none" }} title="Instagram">📸</a>
                                                )}
                                                {c.facebook_url && (
                                                    <a href={c.facebook_url} target="_blank" rel="noreferrer"
                                                       style={{ fontSize: "16px", textDecoration: "none" }} title="Facebook">📘</a>
                                                )}
                                                {c.linkedin_url && (
                                                    <a href={c.linkedin_url} target="_blank" rel="noreferrer"
                                                       style={{ fontSize: "16px", textDecoration: "none" }} title="LinkedIn">💼</a>
                                                )}
                                                {c.tiktok_url && (
                                                    <a href={c.tiktok_url} target="_blank" rel="noreferrer"
                                                       style={{ fontSize: "16px", textDecoration: "none" }} title="TikTok">🎵</a>
                                                )}
                                                {c.google_maps_url && (
                                                    <a href={c.google_maps_url} target="_blank" rel="noreferrer"
                                                       style={{ fontSize: "16px", textDecoration: "none" }} title="Google Maps">🗺️</a>
                                                )}
                                                {!c.instagram_url && !c.facebook_url && !c.linkedin_url && !c.tiktok_url && !c.google_maps_url && (
                                                    <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Rating */}
                                        <td>
                                            {c.google_rating ? (
                                                <span style={{ fontFamily: "var(--mono)", fontSize: "13px", color: "#fbbf24", fontWeight: 700 }}>
                                                        ⭐ {c.google_rating}
                                                    </span>
                                            ) : (
                                                <span style={{ color: "var(--muted)", fontSize: "12px" }}>—</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td>
                                            <select
                                                value={c.status || "prospect"}
                                                onChange={e => updateStatus(c.id, e.target.value)}
                                                style={{
                                                    background: sc.bg, color: sc.color,
                                                    border: `1px solid ${sc.color}44`,
                                                    borderRadius: "8px", padding: "4px 8px",
                                                    fontSize: "11px", cursor: "pointer",
                                                    fontFamily: "var(--font)", fontWeight: 600,
                                                }}
                                            >
                                                {STATUS_OPTIONS.map(s => (
                                                    <option key={s} value={s}>{statusColor(s).label}</option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Actions */}
                                        <td>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                {c.email && (
                                                    <a href={`mailto:${c.email}`} style={{ textDecoration: "none" }}>
                                                        <button className="btn btn-ghost"
                                                                style={{ padding: "4px 10px", fontSize: "11px", color: "#60a5fa" }}
                                                                title="Send email">✉️</button>
                                                    </a>
                                                )}
                                                {c.instagram_url && (
                                                    <a href={c.instagram_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                                                        <button className="btn btn-ghost"
                                                                style={{ padding: "4px 10px", fontSize: "11px", color: "#fb923c" }}
                                                                title="Open Instagram">📸</button>
                                                    </a>
                                                )}
                                                <button
                                                    className="btn btn-ghost"
                                                    onClick={() => del(c.id)}
                                                    style={{ padding: "4px 10px", fontSize: "11px", color: "var(--danger)" }}
                                                >✕</button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
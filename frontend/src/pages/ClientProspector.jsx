import { useEffect, useState } from "react"
import axios from "axios"
import { API } from "../App"

// ─────────────────────────────────────────
// ALL CLIENT CATEGORIES (matches scraper)
// ─────────────────────────────────────────

const CLIENT_CATEGORIES = [
    { id: "restaurants",      icon: "🍽",  label: "Restaurants",          color: "#fa6d9a", why: "Menu photography, ambiance reels, social content" },
    { id: "cafes",            icon: "☕",  label: "Cafés & Coffee Shops",  color: "#f97316", why: "Atmosphere content, drink shots, social presence" },
    { id: "patisseries",      icon: "🥐",  label: "Pâtisseries & Bakeries",color: "#fb923c", why: "Product photography, reels, opening campaigns" },
    { id: "hotels",           icon: "🏨",  label: "Hotels & Resorts",      color: "#7c6dfa", why: "Room tours, brand films, booking platform visuals" },
    { id: "real_estate",      icon: "🏢",  label: "Real Estate Agencies",  color: "#4ade80", why: "Property walkthroughs, drone shots, listing photos" },
    { id: "event_venues",     icon: "🎭",  label: "Event Venues",          color: "#facc15", why: "Venue showcase films, corporate event coverage" },
    { id: "universities",     icon: "🎓",  label: "Universities & Schools", color: "#60a5fa", why: "Campus tours, promo films, graduation coverage" },
    { id: "education_kids",   icon: "🧒",  label: "International Schools", color: "#34d399", why: "School tours, programs showcase, enrolment films" },
    { id: "location_agencies",icon: "📍",  label: "Location Agencies",     color: "#f59e0b", why: "Venue & property showcase content" },
    { id: "fitness",          icon: "💪",  label: "Gyms & Fitness Centers", color: "#a78bfa", why: "Promo reels, class highlights, membership campaigns" },
    { id: "beauty",           icon: "💆",  label: "Spas & Beauty Salons",  color: "#fb7185", why: "Service demos, atmosphere content, social presence" },
    { id: "retail",           icon: "🛍",  label: "Retail & Showrooms",    color: "#2dd4bf", why: "Product photography, lookbooks, launch reels" },
    { id: "wedding",          icon: "💍",  label: "Wedding Planners",      color: "#f9a8d4", why: "Wedding films, styled shoots, venue content" },
    { id: "coworking",        icon: "🏗",  label: "Coworking Spaces",      color: "#67e8f9", why: "Space tours, member stories, corporate content" },
    { id: "clinics",          icon: "🏥",  label: "Clinics & Medical",     color: "#86efac", why: "Facility tours, doctor profiles, trust-building content" },
    { id: "startups",         icon: "🚀",  label: "Startups & Tech",       color: "#818cf8", why: "Pitch videos, team culture, product demos" },
    { id: "automotive",       icon: "🚗",  label: "Automotive & Showrooms",color: "#94a3b8", why: "Car photography, showroom tours, launch films" },
    { id: "architecture",     icon: "📐",  label: "Architecture & Design", color: "#c084fc", why: "Portfolio shoots, project showcases, brand films" },
    { id: "sports_clubs",     icon: "⛳",  label: "Sports Clubs",          color: "#4ade80", why: "Facility tours, event coverage, membership content" },
    { id: "cultural_venues",  icon: "🎨",  label: "Galleries & Culture",   color: "#fbbf24", why: "Event coverage, exhibition films, artist promos" },
]

const ZONES = ["Tunis", "Lac", "La Marsa", "Gammarth", "Ennasr", "Ariana", "Sidi Bou Said", "Carthage", "Hammamet", "Sousse", "Monastir", "Sfax"]

export default function ClientProspector() {
    const [clients, setClients]   = useState([])
    const [loading, setLoading]   = useState(false)
    const [search, setSearch]     = useState("")
    const [filterCat, setFilterCat]   = useState("")
    const [filterZone, setFilterZone] = useState("")

    const [selectedCats, setSelectedCats] = useState([])
    const [customQuery, setCustomQuery]   = useState("")
    const [customZone, setCustomZone]     = useState("Tunis")
    const [maxResults, setMaxResults]     = useState(30)
    const [scraperRunning, setScraperRunning] = useState({})
    const [scraperResult, setScraperResult]   = useState({})
    const [scraperLog, setScraperLog]         = useState([])
    const [showPanel, setShowPanel]           = useState(true)
    const [stats, setStats] = useState(null)

    const loadClients = () => {
        setLoading(true)
        const params = {}
        if (filterCat)  params.category = filterCat
        if (filterZone) params.zone = filterZone
        axios.get(`${API}/client-prospector/`, { params })
            .then(r => setClients(r.data)).catch(() => setClients([]))
            .finally(() => setLoading(false))
    }

    const loadStats = () => {
        axios.get(`${API}/client-prospector/stats`).then(r => setStats(r.data)).catch(() => {})
    }

    useEffect(() => { loadClients(); loadStats() }, [filterCat, filterZone])

    const toggleCat = (id) =>
        setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

    const selectAll = () => setSelectedCats(CLIENT_CATEGORIES.map(c => c.id))
    const selectNone = () => setSelectedCats([])

    const addLog = (msg) => setScraperLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)])

    const runScraper = async (catId) => {
        setScraperRunning(r => ({ ...r, [catId]: true }))
        setScraperResult(r => ({ ...r, [catId]: null }))
        addLog(`Starting: ${catId}…`)
        try {
            const res = await axios.post(`${API}/client-prospector/scrape`, {
                category_id: catId, max_results: maxResults,
            }, { timeout: 7200000 }) // 2 hour timeout
            const n = res.data?.new ?? 0
            const u = res.data?.updated ?? 0
            setScraperResult(r => ({ ...r, [catId]: { ok: true, msg: `✅ ${n} new, ${u} updated` } }))
            addLog(`✅ ${catId}: ${n} new, ${u} updated`)
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
        for (const id of selectedCats) {
            await runScraper(id)
        }
    }

    const runCustom = async () => {
        if (!customQuery.trim()) return
        setScraperRunning(r => ({ ...r, custom: true }))
        addLog(`Custom: "${customQuery}" in ${customZone}…`)
        try {
            const res = await axios.post(`${API}/client-prospector/scrape-custom`, {
                query: customQuery, zone: customZone, max_results: maxResults,
            }, { timeout: 7200000 })
            const n = res.data?.new ?? 0
            addLog(`✅ Custom: ${n} new`)
            setScraperResult(r => ({ ...r, custom: { ok: true, msg: `✅ ${n} new` } }))
            loadClients(); loadStats()
        } catch (err) {
            addLog(`❌ Custom: ${err.response?.data?.detail || err.message}`)
            setScraperResult(r => ({ ...r, custom: { ok: false, msg: `❌ ${err.message}` } }))
        } finally {
            setScraperRunning(r => ({ ...r, custom: false }))
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

    const filtered = clients.filter(c =>
        !search ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.zone?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    )

    const anyRunning = Object.values(scraperRunning).some(Boolean)
    const allSelected = selectedCats.length === CLIENT_CATEGORIES.length

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="page-title">🎯 Client Prospector</div>
                    <div className="page-sub">Scrape premium direct clients — restaurants, hotels, venues & more · quality filter ON</div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn btn-ghost" onClick={() => setShowPanel(p => !p)} style={{ padding: "9px 18px" }}>
                        {showPanel ? "Hide Scrapers ↑" : "Show Scrapers ↓"}
                    </button>
                    {selectedCats.length > 0 && (
                        <button
                            className={`btn ${anyRunning ? "btn-ghost" : "btn-primary"}`}
                            onClick={runSelected} disabled={anyRunning}
                            style={{ padding: "9px 18px" }}
                        >
                            {anyRunning ? "⏳ Running…" : `⚡ Run ${selectedCats.length} Selected`}
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="stats-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: "24px" }}>
                    <div className="stat-card" style={{ "--accent-color": "#7c6dfa" }}>
                        <div className="stat-label">Total Prospects</div>
                        <div className="stat-value">{stats.total ?? 0}</div>
                    </div>
                    <div className="stat-card" style={{ "--accent-color": "#4ade80" }}>
                        <div className="stat-label">New Today</div>
                        <div className="stat-value">{stats.new_today ?? 0}</div>
                    </div>
                    <div className="stat-card" style={{ "--accent-color": "#fa6d9a" }}>
                        <div className="stat-label">Restaurants</div>
                        <div className="stat-value">{(stats.by_category?.restaurants ?? 0) + (stats.by_category?.cafes ?? 0)}</div>
                    </div>
                    <div className="stat-card" style={{ "--accent-color": "#facc15" }}>
                        <div className="stat-label">Venues & Hotels</div>
                        <div className="stat-value">{(stats.by_category?.event_venues ?? 0) + (stats.by_category?.hotels ?? 0)}</div>
                    </div>
                    <div className="stat-card" style={{ "--accent-color": "#60a5fa" }}>
                        <div className="stat-label">Other</div>
                        <div className="stat-value">{Math.max(0, (stats.total ?? 0) - (stats.by_category?.restaurants ?? 0) - (stats.by_category?.cafes ?? 0) - (stats.by_category?.event_venues ?? 0) - (stats.by_category?.hotels ?? 0))}</div>
                    </div>
                </div>
            )}

            {/* Scraper Panel */}
            {showPanel && (
                <div className="card" style={{ marginBottom: "24px", borderColor: "#7c6dfa33" }}>
                    {/* Panel header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                        <div className="card-title" style={{ margin: 0 }}>🕷 Scraper Control</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            {/* Select All / None */}
                            <button
                                onClick={allSelected ? selectNone : selectAll}
                                style={{
                                    background: allSelected ? "#7c6dfa22" : "var(--bg3)",
                                    border: `1px solid ${allSelected ? "#7c6dfa66" : "var(--border2)"}`,
                                    color: allSelected ? "var(--accent)" : "var(--muted)",
                                    borderRadius: "8px", padding: "6px 14px",
                                    fontSize: "12px", cursor: "pointer", fontFamily: "var(--font)",
                                    transition: "all 0.15s",
                                }}
                            >
                                {allSelected ? "☑ Deselect All" : "☐ Select All"}
                            </button>

                            <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                Max per query:
              </span>
                            <select
                                value={maxResults}
                                onChange={e => setMaxResults(Number(e.target.value))}
                                style={{
                                    background: "var(--bg3)", border: "1px solid var(--border2)",
                                    color: "var(--text)", borderRadius: "8px", padding: "6px 10px",
                                    fontSize: "12px", fontFamily: "var(--mono)",
                                }}
                            >
                                {[20, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>

                            {/* Quality filter badge */}
                            <div style={{
                                background: "#4ade8018", border: "1px solid #4ade8033",
                                borderRadius: "20px", padding: "4px 12px",
                                fontSize: "11px", color: "var(--success)", fontFamily: "var(--mono)",
                            }}>
                                ✓ Quality filter ON · min ⭐3.8
                            </div>
                        </div>
                    </div>

                    {/* Selection count */}
                    {selectedCats.length > 0 && (
                        <div style={{ fontSize: "12px", color: "var(--accent)", fontFamily: "var(--mono)", marginBottom: "12px" }}>
                            {selectedCats.length} categories selected — estimated time: ~{Math.ceil(selectedCats.length * 15)}–{Math.ceil(selectedCats.length * 30)} min
                        </div>
                    )}

                    {/* Category Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px" }}>
                        {CLIENT_CATEGORIES.map(cat => {
                            const isSelected = selectedCats.includes(cat.id)
                            const isRunning  = scraperRunning[cat.id]
                            const result     = scraperResult[cat.id]

                            return (
                                <div
                                    key={cat.id}
                                    style={{
                                        background: isSelected ? cat.color + "12" : "var(--bg3)",
                                        border: `1px solid ${isSelected ? cat.color + "55" : "var(--border)"}`,
                                        borderRadius: "10px", padding: "10px 12px",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <div
                                            style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", flex: 1 }}
                                            onClick={() => toggleCat(cat.id)}
                                        >
                                            <div style={{
                                                width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
                                                border: `2px solid ${isSelected ? cat.color : "var(--border2)"}`,
                                                background: isSelected ? cat.color : "transparent",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: "9px", color: "#000",
                                            }}>
                                                {isSelected && "✓"}
                                            </div>
                                            <span style={{ fontSize: "12px", fontWeight: 600 }}>{cat.icon} {cat.label}</span>
                                        </div>
                                        <button
                                            onClick={() => runScraper(cat.id)}
                                            disabled={isRunning || anyRunning}
                                            style={{
                                                background: "transparent",
                                                border: `1px solid ${cat.color}44`,
                                                color: cat.color, borderRadius: "6px",
                                                padding: "2px 8px", fontSize: "10px",
                                                cursor: "pointer", flexShrink: 0,
                                                opacity: (isRunning || anyRunning) ? 0.5 : 1,
                                            }}
                                        >
                                            {isRunning ? "⏳" : "▶"}
                                        </button>
                                    </div>
                                    <div style={{ fontSize: "10px", color: "var(--muted)", marginLeft: "21px", lineHeight: 1.4 }}>
                                        {cat.why}
                                    </div>
                                    {result && (
                                        <div style={{
                                            fontSize: "10px", fontFamily: "var(--mono)", marginLeft: "21px", marginTop: "4px",
                                            color: result.ok ? "var(--success)" : "var(--danger)",
                                        }}>
                                            {result.msg}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Custom Query */}
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
                            placeholder='e.g. "salle de mariage", "hôtel boutique"…'
                            value={customQuery}
                            onChange={e => setCustomQuery(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && runCustom()}
                        />
                        <select
                            value={customZone}
                            onChange={e => setCustomZone(e.target.value)}
                            style={{
                                background: "var(--bg2)", border: "1px solid var(--border2)",
                                color: "var(--text)", borderRadius: "8px", padding: "6px 10px",
                                fontSize: "13px", fontFamily: "var(--font)",
                            }}
                        >
                            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                        <button
                            className="btn btn-primary"
                            onClick={runCustom}
                            disabled={!customQuery.trim() || scraperRunning.custom}
                            style={{ padding: "7px 18px", fontSize: "12px", flexShrink: 0 }}
                        >
                            {scraperRunning.custom ? "⏳" : "Search →"}
                        </button>
                        {scraperResult.custom && (
                            <span style={{ fontSize: "11px", fontFamily: "var(--mono)", color: scraperResult.custom.ok ? "var(--success)" : "var(--danger)" }}>
                {scraperResult.custom.msg}
              </span>
                        )}
                    </div>

                    {/* Live Log */}
                    {scraperLog.length > 0 && (
                        <div style={{
                            background: "#0a0a0f", border: "1px solid var(--border)", borderRadius: "8px",
                            padding: "10px 14px", maxHeight: "130px", overflowY: "auto",
                            fontFamily: "var(--mono)", fontSize: "11px",
                        }}>
                            {scraperLog.map((l, i) => (
                                <div key={i} style={{ marginBottom: "2px", color: l.includes("✅") ? "var(--success)" : l.includes("❌") ? "var(--danger)" : "var(--muted)" }}>
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
                        placeholder="Search name, zone, phone…"
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    value={filterCat} onChange={e => setFilterCat(e.target.value)}
                    style={{ background: "var(--bg2)", border: "1px solid var(--border2)", color: filterCat ? "var(--text)" : "var(--muted)", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", fontFamily: "var(--font)" }}
                >
                    <option value="">All Categories</option>
                    {CLIENT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
                <select
                    value={filterZone} onChange={e => setFilterZone(e.target.value)}
                    style={{ background: "var(--bg2)", border: "1px solid var(--border2)", color: filterZone ? "var(--text)" : "var(--muted)", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", fontFamily: "var(--font)" }}
                >
                    <option value="">All Zones</option>
                    {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <a href={`${API}/client-prospector/export/csv`} style={{ textDecoration: "none" }}>
                    <button className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: "12px" }}>⬇ CSV</button>
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
                        <div className="empty-sub">Select categories above and click ⚡ Run to start scraping</div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                            <tr>
                                <th>Business</th>
                                <th>Category</th>
                                <th>Zone</th>
                                <th>Contact</th>
                                <th>Rating</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map(c => {
                                const cat = CLIENT_CATEGORIES.find(x => x.id === c.category_id)
                                return (
                                    <tr key={c.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, marginBottom: "2px" }}>{c.name}</div>
                                            {c.address && (
                                                <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                                                    {c.address.slice(0, 55)}{c.address.length > 55 ? "…" : ""}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {cat ? (
                                                <span style={{
                                                    background: cat.color + "18", color: cat.color,
                                                    border: `1px solid ${cat.color}33`,
                                                    borderRadius: "20px", padding: "3px 10px",
                                                    fontSize: "11px", fontFamily: "var(--mono)", whiteSpace: "nowrap",
                                                }}>
                            {cat.icon} {cat.label}
                          </span>
                                            ) : (
                                                <span className="badge badge-gray">{c.category_id || "—"}</span>
                                            )}
                                        </td>
                                        <td><span className="badge badge-gray">{c.zone || "—"}</span></td>
                                        <td>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                                {c.phone && (
                                                    <a href={`tel:${c.phone}`} style={{ fontSize: "11px", color: "var(--accent)", fontFamily: "var(--mono)", textDecoration: "none" }}>
                                                        📞 {c.phone}
                                                    </a>
                                                )}
                                                {c.website && (
                                                    <a href={c.website} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#60a5fa", fontFamily: "var(--mono)", textDecoration: "none" }}>
                                                        🌐 Website
                                                    </a>
                                                )}
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    {c.instagram_url && (
                                                        <a href={c.instagram_url} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#fb7185", textDecoration: "none" }}>📸 IG</a>
                                                    )}
                                                    {c.facebook_url && (
                                                        <a href={c.facebook_url} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#60a5fa", textDecoration: "none" }}>👍 FB</a>
                                                    )}
                                                    {c.google_maps_url && (
                                                        <a href={c.google_maps_url} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#facc15", textDecoration: "none" }}>🗺 Maps</a>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {c.google_rating
                                                ? <span style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>⭐ {c.google_rating}</span>
                                                : <span style={{ color: "var(--muted)" }}>—</span>
                                            }
                                        </td>
                                        <td>
                                            <select
                                                value={c.status || "prospect"}
                                                onChange={e => updateStatus(c.id, e.target.value)}
                                                style={{
                                                    background: "transparent", border: "1px solid var(--border2)",
                                                    borderRadius: "20px", padding: "3px 8px",
                                                    fontSize: "11px", fontFamily: "var(--mono)", color: "var(--text)", cursor: "pointer",
                                                }}
                                            >
                                                <option value="prospect">prospect</option>
                                                <option value="contacted">contacted</option>
                                                <option value="active">active client</option>
                                                <option value="not_relevant">not relevant</option>
                                            </select>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: "4px" }}>
                                                <a
                                                    href={`mailto:?subject=Collaboration créative — ${c.name}&body=Bonjour,\n\nJe m'appelle Moenes, vidéaste et photographe basé à Tunis. Je travaille directement avec des établissements comme ${c.name} pour créer du contenu vidéo et photo professionnel.\n\nVous seriez intéressé(e) à en discuter ?\n\nCordialement,\nMoenes`}
                                                    style={{ textDecoration: "none" }}
                                                >
                                                    <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "11px" }}>✉</button>
                                                </a>
                                                <button
                                                    className="btn btn-ghost"
                                                    onClick={() => del(c.id)}
                                                    style={{ padding: "4px 10px", fontSize: "11px", color: "var(--danger)", borderColor: "var(--danger)33" }}
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

            <div style={{ marginTop: "12px", fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textAlign: "center" }}>
                ℹ️ Quality filter active — skips businesses rated below ⭐3.8, cheap keywords, or unknown businesses outside premium zones.
                Results save to <code style={{ color: "var(--accent)" }}>client_prospects</code> table.
            </div>
        </div>
    )
}
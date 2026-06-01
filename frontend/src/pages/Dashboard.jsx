import { useEffect, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { API } from "../App"

const platformColor = p => {
    if (p === "freelances.tn") return "badge-green"
    if (p === "linkedin")      return "badge-blue"
    if (p === "tanitjobs")     return "badge-purple"
    if (p === "facebook")      return "badge-pink"
    if (p === "keejob")        return "badge-yellow"
    return "badge-gray"
}

const prospectStatusStyle = s => {
    if (s === "prospect")       return { bg: "#7c6dfa22", color: "#7c6dfa" }
    if (s === "contacted")      return { bg: "#60a5fa22", color: "#60a5fa" }
    if (s === "in_discussion")  return { bg: "#fbbf2422", color: "#fbbf24" }
    if (s === "won")            return { bg: "#4ade8022", color: "#4ade80" }
    if (s === "lost")           return { bg: "#f8717122", color: "#f87171" }
    return { bg: "#ffffff11",   color: "var(--muted)" }
}

const categoryIcon = id => {
    const map = {
        restaurants: "🍽", cafes: "☕", hotels: "🏨", event_venues: "🎪",
        fitness: "💪", beauty: "💆", retail: "🛍", wedding: "💍",
        coworking: "🏗", clinics: "🏥", startups: "🚀", automotive: "🚗",
        architecture: "📐", sports_clubs: "⛳", cultural_venues: "🎨",
        patisseries: "🍰", jewelry: "💎",
    }
    return map[id] || "🏢"
}

export default function Dashboard({ stats }) {
    const navigate = useNavigate()
    const [recentOpps, setRecentOpps]         = useState([])
    const [followups, setFollowups]           = useState([])
    const [prospectStats, setProspectStats]   = useState(null)
    const [hotProspects, setHotProspects]     = useState([])
    const [loadingProspects, setLoadingProspects] = useState(true)

    useEffect(() => {
        // Existing data
        axios.get(`${API}/opportunities/recent`).then(r => setRecentOpps(r.data.slice(0, 5))).catch(() => {})
        axios.get(`${API}/outreach/pending-followup`).then(r => setFollowups(r.data.slice(0, 5))).catch(() => {})

        // Client Prospector data
        axios.get(`${API}/client-prospector/stats`).then(r => setProspectStats(r.data)).catch(() => {})
        axios.get(`${API}/client-prospector/`, { params: { status: "prospect" } })
            .then(r => {
                // Prioritise prospects with email or instagram — most actionable
                const sorted = [...r.data].sort((a, b) => {
                    const scoreA = (a.email ? 2 : 0) + (a.instagram_url ? 1 : 0) + (a.google_rating || 0) * 0.1
                    const scoreB = (b.email ? 2 : 0) + (b.instagram_url ? 1 : 0) + (b.google_rating || 0) * 0.1
                    return scoreB - scoreA
                })
                setHotProspects(sorted.slice(0, 6))
            })
            .catch(() => {})
            .finally(() => setLoadingProspects(false))
    }, [])

    return (
        <div>
            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <div className="page-title">Dashboard</div>
                    <div className="page-sub">Welcome back — here's your full lead overview</div>
                </div>
            </div>

            {/* ── Top Stats: Lead Pipeline ── */}
            <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>
                Lead Pipeline
            </div>
            <div className="stats-grid" style={{ marginBottom: "28px" }}>
                <div className="stat-card" style={{ "--accent-color": "#7c6dfa" }}>
                    <div className="stat-label">Total Agencies</div>
                    <div className="stat-value">{stats?.total_agencies ?? "—"}</div>
                    <div className="stat-hint">In your database</div>
                </div>
                <div className="stat-card" style={{ "--accent-color": "#4ade80" }}>
                    <div className="stat-label">New Opportunities</div>
                    <div className="stat-value">{stats?.new_opportunities ?? "—"}</div>
                    <div className="stat-hint">Unread posts</div>
                </div>
                <div className="stat-card" style={{ "--accent-color": "#60a5fa" }}>
                    <div className="stat-label">Total Outreach</div>
                    <div className="stat-value">{stats?.total_outreach ?? "—"}</div>
                    <div className="stat-hint">{stats?.outreach_responded ?? 0} responded</div>
                </div>
                <div className="stat-card" style={{ "--accent-color": "#facc15" }}>
                    <div className="stat-label">Follow-ups Due</div>
                    <div className="stat-value">{stats?.pending_followups ?? "—"}</div>
                    <div className="stat-hint">Action needed</div>
                </div>
            </div>

            {/* ── Client Prospector Stats ── */}
            <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>
                Client Prospector
            </div>
            <div className="stats-grid" style={{ marginBottom: "20px" }}>
                <div className="stat-card" style={{ "--accent-color": "#fb923c" }}>
                    <div className="stat-label">Total Prospects</div>
                    <div className="stat-value">{prospectStats?.total ?? "—"}</div>
                    <div className="stat-hint">{prospectStats?.by_status?.prospect ?? 0} new</div>
                </div>
                <div className="stat-card" style={{ "--accent-color": "#4ade80" }}>
                    <div className="stat-label">With Email</div>
                    <div className="stat-value">{prospectStats?.with_email ?? "—"}</div>
                    <div className="stat-hint">Ready to email</div>
                </div>
                <div className="stat-card" style={{ "--accent-color": "#f472b6" }}>
                    <div className="stat-label">With Instagram</div>
                    <div className="stat-value">{prospectStats?.with_instagram ?? "—"}</div>
                    <div className="stat-hint">DM ready</div>
                </div>
                <div className="stat-card" style={{ "--accent-color": "#34d399" }}>
                    <div className="stat-label">Won Clients</div>
                    <div className="stat-value">{prospectStats?.by_status?.won ?? "—"}</div>
                    <div className="stat-hint">
                        {prospectStats?.by_status?.in_discussion ?? 0} in discussion
                    </div>
                </div>
            </div>

            {/* ── Hot Prospects + Recent Opportunities ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

                {/* Hot Prospects */}
                <div className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                        <div className="card-title" style={{ margin: 0 }}>🎯 Hot Prospects</div>
                        <button
                            className="btn btn-ghost"
                            onClick={() => navigate("/client-prospector")}
                            style={{ padding: "4px 12px", fontSize: "11px" }}
                        >
                            View all →
                        </button>
                    </div>

                    {loadingProspects ? (
                        <div className="loading" style={{ padding: "20px 0" }}>Loading…</div>
                    ) : hotProspects.length === 0 ? (
                        <div className="empty-state" style={{ padding: "30px 0" }}>
                            <div className="empty-icon">🎯</div>
                            <div className="empty-text">No prospects yet</div>
                            <div className="empty-sub">
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => navigate("/client-prospector")}
                                    style={{ padding: "6px 14px", fontSize: "12px", marginTop: "8px" }}
                                >
                                    Go to Client Prospector →
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {hotProspects.map(p => {
                                const sc = prospectStatusStyle(p.status)
                                return (
                                    <div key={p.id} style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "10px 0", borderBottom: "1px solid var(--border)",
                                    }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                                                <span style={{ fontSize: "14px" }}>{categoryIcon(p.category_id)}</span>
                                                <div style={{ fontWeight: 600, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {p.name}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                                {p.zone && (
                                                    <span style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                                                        📍 {p.zone}
                                                    </span>
                                                )}
                                                {p.google_rating && (
                                                    <span style={{ fontSize: "10px", color: "#fbbf24", fontFamily: "var(--mono)" }}>
                                                        ⭐ {p.google_rating}
                                                    </span>
                                                )}
                                                {/* Contact icons */}
                                                <div style={{ display: "flex", gap: "4px" }}>
                                                    {p.email && (
                                                        <a href={`mailto:${p.email}`} style={{ fontSize: "12px", textDecoration: "none" }} title={p.email}>✉️</a>
                                                    )}
                                                    {p.phone && (
                                                        <a href={`https://wa.me/216${p.phone.replace(/\D/g, "").slice(-8)}`} target="_blank" rel="noreferrer" style={{ fontSize: "12px", textDecoration: "none" }} title="WhatsApp">📱</a>
                                                    )}
                                                    {p.instagram_url && (
                                                        <a href={p.instagram_url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", textDecoration: "none" }} title="Instagram">📸</a>
                                                    )}
                                                    {p.facebook_url && (
                                                        <a href={p.facebook_url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", textDecoration: "none" }} title="Facebook">📘</a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{
                                            background: sc.bg, color: sc.color,
                                            borderRadius: "6px", padding: "3px 8px",
                                            fontSize: "10px", fontWeight: 600, flexShrink: 0, marginLeft: "8px",
                                        }}>
                                            {p.status}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Recent Opportunities */}
                <div className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                        <div className="card-title" style={{ margin: 0 }}>◎ Recent Opportunities</div>
                        <button
                            className="btn btn-ghost"
                            onClick={() => navigate("/opportunities")}
                            style={{ padding: "4px 12px", fontSize: "11px" }}
                        >
                            View all →
                        </button>
                    </div>

                    {recentOpps.length === 0 ? (
                        <div className="empty-state" style={{ padding: "30px 0" }}>
                            <div className="empty-icon">◎</div>
                            <div className="empty-text">No opportunities yet</div>
                            <div className="empty-sub">Scrapers will fill this automatically</div>
                        </div>
                    ) : (
                        <div>
                            {recentOpps.map(o => (
                                <div key={o.id} style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "10px 0", borderBottom: "1px solid var(--border)",
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {o.url
                                                ? <a href={o.url} target="_blank" rel="noreferrer" style={{ color: "var(--text)", textDecoration: "none" }}>{o.title}</a>
                                                : o.title
                                            }
                                        </div>
                                        <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                                            {o.client_name && `${o.client_name} · `}
                                            {o.posted_date || o.date_scraped?.slice(0, 10)}
                                        </div>
                                    </div>
                                    <span className={`badge ${platformColor(o.platform)}`} style={{ marginLeft: "8px", flexShrink: 0 }}>
                                        {o.platform}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Pending Follow-ups + Prospect Pipeline ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

                {/* Pending Follow-ups */}
                <div className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                        <div className="card-title" style={{ margin: 0 }}>◇ Pending Follow-ups</div>
                        <button
                            className="btn btn-ghost"
                            onClick={() => navigate("/outreach")}
                            style={{ padding: "4px 12px", fontSize: "11px" }}
                        >
                            View all →
                        </button>
                    </div>
                    {followups.length === 0 ? (
                        <div className="empty-state" style={{ padding: "30px 0" }}>
                            <div className="empty-icon">◇</div>
                            <div className="empty-text">No follow-ups due</div>
                            <div className="empty-sub">You're all caught up ✓</div>
                        </div>
                    ) : (
                        <div>
                            {followups.map(f => (
                                <div key={f.id} style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "10px 0", borderBottom: "1px solid var(--border)",
                                }}>
                                    <div>
                                        <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "3px" }}>{f.agency_name}</div>
                                        <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                                            via {f.channel} · due {f.follow_up_date}
                                        </div>
                                    </div>
                                    <span className="badge badge-yellow">Due</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Prospect Pipeline Breakdown */}
                <div className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                        <div className="card-title" style={{ margin: 0 }}>🎯 Prospect Pipeline</div>
                        <button
                            className="btn btn-ghost"
                            onClick={() => navigate("/client-prospector")}
                            style={{ padding: "4px 12px", fontSize: "11px" }}
                        >
                            Open →
                        </button>
                    </div>

                    {prospectStats ? (
                        <div>
                            {[
                                { key: "prospect",      label: "New Prospects",   color: "#7c6dfa", icon: "🆕" },
                                { key: "contacted",     label: "Contacted",        color: "#60a5fa", icon: "📤" },
                                { key: "in_discussion", label: "In Discussion",    color: "#fbbf24", icon: "💬" },
                                { key: "won",           label: "Won",              color: "#4ade80", icon: "🎉" },
                                { key: "lost",          label: "Lost / Not Int.",  color: "#f87171", icon: "❌" },
                            ].map(row => {
                                const count = (prospectStats.by_status?.[row.key] ?? 0) +
                                    (row.key === "lost" ? (prospectStats.by_status?.not_interested ?? 0) : 0)
                                const total = prospectStats.total || 1
                                const pct = Math.round((count / total) * 100)
                                return (
                                    <div key={row.key} style={{ marginBottom: "10px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                            <span style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                                                <span>{row.icon}</span>
                                                <span>{row.label}</span>
                                            </span>
                                            <span style={{ fontSize: "12px", fontFamily: "var(--mono)", fontWeight: 700, color: row.color }}>
                                                {count}
                                            </span>
                                        </div>
                                        <div style={{ height: "4px", background: "var(--bg3)", borderRadius: "99px", overflow: "hidden" }}>
                                            <div style={{
                                                height: "100%", width: `${pct}%`,
                                                background: row.color, borderRadius: "99px",
                                                transition: "width 0.4s ease",
                                            }} />
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Pending enrichment notice */}
                            {prospectStats.pending_enrichment > 0 && (
                                <div style={{
                                    marginTop: "14px", background: "#60a5fa11",
                                    border: "1px solid #60a5fa33", borderRadius: "8px",
                                    padding: "8px 12px", fontSize: "11px", color: "#60a5fa",
                                }}>
                                    🔬 {prospectStats.pending_enrichment} prospect{prospectStats.pending_enrichment > 1 ? "s" : ""} still need website enrichment (email + socials)
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => navigate("/client-prospector")}
                                        style={{ padding: "2px 10px", fontSize: "10px", marginLeft: "8px", color: "#60a5fa", borderColor: "#60a5fa44" }}
                                    >
                                        Enrich →
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: "30px 0" }}>
                            <div className="empty-icon">🎯</div>
                            <div className="empty-text">No prospect data</div>
                            <div className="empty-sub">
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => navigate("/client-prospector")}
                                    style={{ padding: "6px 14px", fontSize: "12px", marginTop: "8px" }}
                                >
                                    Start Prospecting →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Agencies by Zone ── */}
            {stats?.agencies_by_zone?.length > 0 && (
                <div className="card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                        <div className="card-title" style={{ margin: 0 }}>◈ Agencies by Zone</div>
                        <button
                            className="btn btn-ghost"
                            onClick={() => navigate("/agencies")}
                            style={{ padding: "4px 12px", fontSize: "11px" }}
                        >
                            View all →
                        </button>
                    </div>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        {stats.agencies_by_zone.map(z => (
                            <div key={z.zone} style={{
                                background: "var(--bg3)", border: "1px solid var(--border)",
                                borderRadius: "10px", padding: "12px 16px", minWidth: "120px",
                            }}>
                                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent)" }}>{z.count}</div>
                                <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", marginTop: "2px" }}>{z.zone}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
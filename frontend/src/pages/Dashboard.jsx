import { useEffect, useState } from "react"
import axios from "axios"
import { API } from "../App"

export default function Dashboard({ stats }) {
  const [recentOpps, setRecentOpps] = useState([])
  const [followups, setFollowups] = useState([])

  useEffect(() => {
    axios.get(`${API}/opportunities/recent`).then(r => setRecentOpps(r.data.slice(0, 5))).catch(() => {})
    axios.get(`${API}/outreach/pending-followup`).then(r => setFollowups(r.data.slice(0, 5))).catch(() => {})
  }, [])

  const platformColor = p => {
    if (p === "freelances.tn") return "badge-green"
    if (p === "linkedin") return "badge-blue"
    if (p === "tanitjobs") return "badge-purple"
    if (p === "facebook") return "badge-pink"
    return "badge-gray"
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Welcome back — here's your lead overview</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{"--accent-color": "#7c6dfa"}}>
          <div className="stat-label">Total Agencies</div>
          <div className="stat-value">{stats?.total_agencies ?? "—"}</div>
          <div className="stat-hint">In your database</div>
        </div>
        <div className="stat-card" style={{"--accent-color": "#4ade80"}}>
          <div className="stat-label">New Opportunities</div>
          <div className="stat-value">{stats?.new_opportunities ?? "—"}</div>
          <div className="stat-hint">Unread posts</div>
        </div>
        <div className="stat-card" style={{"--accent-color": "#60a5fa"}}>
          <div className="stat-label">Total Outreach</div>
          <div className="stat-value">{stats?.total_outreach ?? "—"}</div>
          <div className="stat-hint">{stats?.outreach_responded ?? 0} responded</div>
        </div>
        <div className="stat-card" style={{"--accent-color": "#facc15"}}>
          <div className="stat-label">Follow-ups Due</div>
          <div className="stat-value">{stats?.pending_followups ?? "—"}</div>
          <div className="stat-hint">Action needed</div>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px"}}>
        {/* Recent Opportunities */}
        <div className="card">
          <div className="card-title">Recent Opportunities</div>
          {recentOpps.length === 0 ? (
            <div className="empty-state" style={{padding:"30px 0"}}>
              <div className="empty-icon">◎</div>
              <div className="empty-text">No opportunities yet</div>
              <div className="empty-sub">Scrapers will fill this automatically</div>
            </div>
          ) : (
            <div>
              {recentOpps.map(o => (
                <div key={o.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)"}}>
                  <div>
                    <div style={{fontSize:"13px", fontWeight:600, marginBottom:"3px"}}>{o.title}</div>
                    <div style={{fontSize:"11px", color:"var(--muted)", fontFamily:"var(--mono)"}}>{o.posted_date || o.date_scraped?.slice(0,10)}</div>
                  </div>
                  <span className={`badge ${platformColor(o.platform)}`}>{o.platform}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Follow-ups */}
        <div className="card">
          <div className="card-title">Pending Follow-ups</div>
          {followups.length === 0 ? (
            <div className="empty-state" style={{padding:"30px 0"}}>
              <div className="empty-icon">◇</div>
              <div className="empty-text">No follow-ups due</div>
              <div className="empty-sub">You're all caught up</div>
            </div>
          ) : (
            <div>
              {followups.map(f => (
                <div key={f.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)"}}>
                  <div>
                    <div style={{fontSize:"13px", fontWeight:600, marginBottom:"3px"}}>{f.agency_name}</div>
                    <div style={{fontSize:"11px", color:"var(--muted)", fontFamily:"var(--mono)"}}>via {f.channel} · due {f.follow_up_date}</div>
                  </div>
                  <span className="badge badge-yellow">Due</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agencies by Zone */}
      {stats?.agencies_by_zone?.length > 0 && (
        <div className="card" style={{marginTop:"20px"}}>
          <div className="card-title">Agencies by Zone</div>
          <div style={{display:"flex", gap:"12px", flexWrap:"wrap"}}>
            {stats.agencies_by_zone.map(z => (
              <div key={z.zone} style={{background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"10px", padding:"12px 16px", minWidth:"120px"}}>
                <div style={{fontSize:"22px", fontWeight:800, color:"var(--accent)"}}>{z.count}</div>
                <div style={{fontSize:"11px", color:"var(--muted)", fontFamily:"var(--mono)", marginTop:"2px"}}>{z.zone}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

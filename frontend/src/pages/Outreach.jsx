import { useEffect, useState } from "react"
import axios from "axios"
import { API } from "../App"

const CHANNELS = ["linkedin", "email", "instagram_dm", "whatsapp", "phone"]
const OUTCOMES = ["", "meeting_scheduled", "project_won", "rejected", "no_response"]

const outcomeColor = o => {
  if (o === "project_won") return "badge-green"
  if (o === "meeting_scheduled") return "badge-blue"
  if (o === "rejected") return "badge-red"
  if (o === "no_response") return "badge-gray"
  return "badge-gray"
}

const channelIcon = c => {
  if (c === "linkedin") return "in"
  if (c === "email") return "@"
  if (c === "instagram_dm") return "ig"
  if (c === "whatsapp") return "wa"
  if (c === "phone") return "☎"
  return "→"
}

export default function OutreachPage() {
  const [outreach, setOutreach] = useState([])
  const [followups, setFollowups] = useState([])
  const [agencies, setAgencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({})

  const load = () => {
    setLoading(true)
    Promise.all([
      axios.get(`${API}/outreach/`),
      axios.get(`${API}/outreach/pending-followup`),
      axios.get(`${API}/agencies/`)
    ]).then(([o, f, a]) => {
      setOutreach(o.data)
      setFollowups(f.data)
      setAgencies(a.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    await axios.post(`${API}/outreach/`, form)
    setShowModal(false)
    setForm({})
    load()
  }

  const markDone = async (id) => {
    await axios.patch(`${API}/outreach/${id}/followup-done`)
    load()
  }

  const responded = outreach.filter(o => o.responded).length
  const rate = outreach.length > 0 ? Math.round((responded / outreach.length) * 100) : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Outreach</div>
          <div className="page-sub">{outreach.length} contacts · {rate}% response rate</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({}); setShowModal(true) }}>+ Log Outreach</button>
      </div>

      {/* Stats row */}
      <div className="stats-grid" style={{gridTemplateColumns:"repeat(4, 1fr)", marginBottom:"24px"}}>
        <div className="stat-card" style={{"--accent-color":"#7c6dfa"}}>
          <div className="stat-label">Total Sent</div>
          <div className="stat-value">{outreach.length}</div>
        </div>
        <div className="stat-card" style={{"--accent-color":"#4ade80"}}>
          <div className="stat-label">Responded</div>
          <div className="stat-value">{responded}</div>
        </div>
        <div className="stat-card" style={{"--accent-color":"#facc15"}}>
          <div className="stat-label">Response Rate</div>
          <div className="stat-value">{rate}%</div>
        </div>
        <div className="stat-card" style={{"--accent-color":"#fa6d9a"}}>
          <div className="stat-label">Follow-ups Due</div>
          <div className="stat-value">{followups.length}</div>
        </div>
      </div>

      {/* Follow-ups Due */}
      {followups.length > 0 && (
        <div className="card" style={{marginBottom:"20px", borderColor:"#facc1533"}}>
          <div className="card-title" style={{color:"var(--warning)"}}>⚡ Follow-ups Due</div>
          {followups.map(f => (
            <div key={f.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--border)"}}>
              <div>
                <span style={{fontWeight:600}}>{f.agency_name}</span>
                <span style={{color:"var(--muted)", fontSize:"12px", fontFamily:"var(--mono)", marginLeft:"10px"}}>via {f.channel} · due {f.follow_up_date}</span>
              </div>
              <button className="btn btn-ghost" style={{padding:"5px 12px", fontSize:"12px"}} onClick={() => markDone(f.id)}>Mark Done</button>
            </div>
          ))}
        </div>
      )}

      {/* Outreach Table */}
      <div className="card" style={{padding:0, overflow:"hidden"}}>
        {loading ? (
          <div className="loading">Loading outreach...</div>
        ) : outreach.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◇</div>
            <div className="empty-text">No outreach logged yet</div>
            <div className="empty-sub">Start contacting agencies and track it here</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Agency</th>
                  <th>Channel</th>
                  <th>Date Sent</th>
                  <th>Responded</th>
                  <th>Follow-up</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {outreach.map(o => (
                  <tr key={o.id}>
                    <td style={{fontWeight:600}}>{o.agency_name || "—"}</td>
                    <td>
                      <span className="badge badge-purple" style={{fontFamily:"var(--mono)", fontSize:"10px"}}>
                        {channelIcon(o.channel)} {o.channel}
                      </span>
                    </td>
                    <td><span style={{fontFamily:"var(--mono)", fontSize:"11px", color:"var(--muted)"}}>{o.date_sent?.slice(0,10)}</span></td>
                    <td>
                      {o.responded
                        ? <span className="badge badge-green">Yes</span>
                        : <span className="badge badge-gray">No</span>}
                    </td>
                    <td>
                      {o.follow_up_date
                        ? <span style={{fontFamily:"var(--mono)", fontSize:"11px", color: o.follow_up_done ? "var(--muted)" : "var(--warning)"}}>{o.follow_up_date}</span>
                        : <span style={{color:"var(--muted)"}}>—</span>}
                    </td>
                    <td>
                      {o.outcome
                        ? <span className={`badge ${outcomeColor(o.outcome)}`}>{o.outcome.replace("_", " ")}</span>
                        : <span className="badge badge-gray">pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Log Outreach</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Agency</label>
                <select value={form.agency_id || ""} onChange={e => setForm({...form, agency_id: parseInt(e.target.value)})}>
                  <option value="">Select agency...</option>
                  {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Channel *</label>
                <select value={form.channel || ""} onChange={e => setForm({...form, channel: e.target.value})}>
                  <option value="">Select...</option>
                  {CHANNELS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Message Sent</label>
              <textarea rows={3} value={form.message_sent || ""} onChange={e => setForm({...form, message_sent: e.target.value})} placeholder="What did you write..." />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Follow-up Date</label>
                <input type="date" value={form.follow_up_date || ""} onChange={e => setForm({...form, follow_up_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Outcome</label>
                <select value={form.outcome || ""} onChange={e => setForm({...form, outcome: e.target.value})}>
                  {OUTCOMES.map(o => <option key={o} value={o}>{o || "Pending..."}</option>)}
                </select>
              </div>
            </div>

            <div style={{display:"flex", gap:"10px", justifyContent:"flex-end", marginTop:"8px"}}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Log Outreach</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

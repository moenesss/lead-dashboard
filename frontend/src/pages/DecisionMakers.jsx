import { useEffect, useState } from "react"
import axios from "axios"
import { API } from "../App"

export default function DecisionMakers() {
  const [people, setPeople]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [running, setRunning]   = useState(false)
  const [runResult, setRunResult] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [form, setForm]         = useState({})

  const load = () => {
    setLoading(true)
    axios.get(`${API}/decision-makers/`)
      .then(r => setPeople(r.data))
      .catch(() => setPeople([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const runScraper = async () => {
    setRunning(true)
    setRunResult(null)
    try {
      await axios.post(`${API}/decision-makers/run`, {}, { timeout: 600000 })
      setRunResult({ ok: true, msg: "Scraper started! Refresh in a few minutes." })
      setTimeout(load, 5000)
    } catch (err) {
      setRunResult({ ok: false, msg: err.response?.data?.detail || err.message })
    } finally {
      setRunning(false)
    }
  }

  const save = async () => {
    await axios.patch(`${API}/decision-makers/${editModal.id}`, form)
    setEditModal(null)
    setForm({})
    load()
  }

  const del = async (id) => {
    if (!confirm("Delete this contact?")) return
    await axios.delete(`${API}/decision-makers/${id}`)
    load()
  }

  const filtered = people.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.agency_name?.toLowerCase().includes(search.toLowerCase())
  )

  const sourceColor = s => {
    if (!s) return "badge-gray"
    if (s.includes("linkedin")) return "badge-blue"
    if (s.includes("website")) return "badge-green"
    if (s.includes("google")) return "badge-yellow"
    return "badge-gray"
  }

  const sourceLabel = s => {
    if (!s) return "—"
    if (s.includes("linkedin")) return "LinkedIn"
    if (s.includes("website")) return "Website"
    if (s.includes("google")) return "Google"
    return s.slice(0, 12)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Decision Makers</div>
          <div className="page-sub">{people.length} contacts found across agencies</div>
        </div>
        <button
          className={`btn ${running ? "btn-ghost" : "btn-primary"}`}
          onClick={runScraper}
          disabled={running}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          {running ? "⏳ Running..." : "⚡ Find Decision Makers"}
        </button>
      </div>

      {/* Run result banner */}
      {runResult && (
        <div style={{
          background: runResult.ok ? "var(--success)22" : "var(--danger)22",
          border: `1px solid ${runResult.ok ? "var(--success)" : "var(--danger)"}44`,
          borderRadius: "10px", padding: "12px 16px", marginBottom: "16px",
          color: runResult.ok ? "var(--success)" : "var(--danger)", fontSize: "13px"
        }}>
          {runResult.ok ? "✅" : "❌"} {runResult.msg}
        </div>
      )}

      {/* Info box if empty */}
      {!loading && people.length === 0 && (
        <div className="card" style={{ padding: "24px", marginBottom: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>👤</div>
          <div style={{ fontWeight: 600, marginBottom: "6px" }}>No decision makers yet</div>
          <div style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "16px" }}>
            Click <strong>⚡ Find Decision Makers</strong> to scan your {" "}
            agencies' websites, LinkedIn, and Google for CEOs, Directors, and Founders.
          </div>
          <button className="btn btn-primary" onClick={runScraper} disabled={running}>
            {running ? "⏳ Running..." : "⚡ Start Scraping"}
          </button>
        </div>
      )}

      {people.length > 0 && (
        <>
          <div className="search-bar">
            <span className="search-icon">⌕</span>
            <input
              placeholder="Search by name, title, agency..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◈</div>
                <div className="empty-text">No results</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Title</th>
                      <th>Agency</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>LinkedIn</th>
                      <th>Source</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.name || "—"}</div>
                          {p.notes && (
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>{p.notes.slice(0, 40)}</div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: "12px", color: "var(--accent2)" }}>
                            {p.title || "—"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            {p.agency_name || "—"}
                          </span>
                        </td>
                        <td>
                          {p.email
                            ? <a href={`mailto:${p.email}`} style={{ fontSize: "12px", color: "var(--accent)", fontFamily: "var(--mono)", textDecoration: "none" }}>{p.email.slice(0, 28)}</a>
                            : <span style={{ color: "var(--muted)" }}>—</span>}
                        </td>
                        <td>
                          {p.phone
                            ? <a href={`tel:${p.phone}`} style={{ fontSize: "12px", fontFamily: "var(--mono)", color: "var(--success)", textDecoration: "none" }}>{p.phone}</a>
                            : <span style={{ color: "var(--muted)" }}>—</span>}
                        </td>
                        <td>
                          {p.linkedin_url
                            ? <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="badge badge-blue" style={{ fontSize: "10px", padding: "2px 8px", textDecoration: "none" }}>View</a>
                            : <span style={{ color: "var(--muted)" }}>—</span>}
                        </td>
                        <td>
                          <span className={`badge ${sourceColor(p.source)}`} style={{ fontSize: "10px" }}>
                            {sourceLabel(p.source)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: "5px 10px", fontSize: "11px" }}
                              onClick={() => { setEditModal(p); setForm({ name: p.name, title: p.title, email: p.email, phone: p.phone, linkedin_url: p.linkedin_url, notes: p.notes }) }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: "5px 10px", fontSize: "11px" }}
                              onClick={() => del(p.id)}
                            >
                              Del
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Edit Decision Maker</div>
              <button className="modal-close" onClick={() => setEditModal(null)}>✕</button>
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "14px" }}>
              Agency: <strong>{editModal.agency_name}</strong>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mohamed Ben Ali" />
              </div>
              <div className="form-group">
                <label className="form-label">Title / Position</label>
                <input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Directeur Général" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contact@agency.tn" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+21698000000" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">LinkedIn URL</label>
              <input value={form.linkedin_url || ""} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." />
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

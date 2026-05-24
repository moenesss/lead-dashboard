import { useState } from "react"
import { useNavigate } from "react-router-dom"

const services = ["Videography", "Video Editing", "Content Creation", "Photography", "Multiple Services"]
const budgets = ["Under 500 TND", "500–1,000 TND", "1,000–2,500 TND", "2,500–5,000 TND", "5,000+ TND / Custom"]
const timelines = ["ASAP / Urgent", "Within 2 weeks", "Within a month", "Flexible / No rush"]

export default function C2CContact() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "",
    service: "", budget: "", timeline: "", message: "",
  })
  const [submitted, setSubmitted] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.service) return
    // Build mailto link as integration point
    const subject = encodeURIComponent(`[C2C Enquiry] ${form.service} — ${form.company || form.name}`)
    const body = encodeURIComponent(
      `Name: ${form.name}\nCompany: ${form.company}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nService: ${form.service}\nBudget: ${form.budget}\nTimeline: ${form.timeline}\n\nMessage:\n${form.message}`
    )
    window.open(`mailto:moenes@example.com?subject=${subject}&body=${body}`)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "20px" }}>
        <div style={{ fontSize: "52px" }}>✅</div>
        <div style={{ fontSize: "22px", fontWeight: 800 }}>Message sent!</div>
        <div style={{ fontSize: "14px", color: "var(--muted)", textAlign: "center", maxWidth: "360px" }}>
          Your mail client should have opened with a pre-filled message. I'll get back to you within 24 hours.
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          <button className="btn btn-primary" onClick={() => navigate("/c2c")}>← Back to Services</button>
          <button className="btn btn-ghost" onClick={() => setSubmitted(false)}>Send Another</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost" onClick={() => navigate("/c2c")} style={{ marginBottom: "12px", padding: "6px 14px", fontSize: "12px" }}>
            ← Back to Services
          </button>
          <div className="page-title">Let's Work Together</div>
          <div className="page-sub">Direct booking — no agency, no forms, just a conversation</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
        {/* Form */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: "20px" }}>Your Details</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>
                Name *
              </label>
              <input
                className="input"
                placeholder="Your full name"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>
                Company / Business
              </label>
              <input
                className="input"
                placeholder="Restaurant, hotel, agency…"
                value={form.company}
                onChange={e => set("company", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>
                Email *
              </label>
              <input
                className="input"
                placeholder="your@email.com"
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>
                Phone / WhatsApp
              </label>
              <input
                className="input"
                placeholder="+216 …"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <div className="card-title" style={{ marginBottom: "14px", marginTop: "8px" }}>Project Details</div>

          {/* Service selector */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>
              Service Needed *
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {services.map(s => (
                <button
                  key={s}
                  onClick={() => set("service", s)}
                  style={{
                    background: form.service === s ? "#7c6dfa22" : "var(--bg3)",
                    border: `1px solid ${form.service === s ? "#7c6dfa66" : "var(--border)"}`,
                    color: form.service === s ? "var(--accent)" : "var(--muted)",
                    borderRadius: "20px", padding: "7px 16px",
                    fontSize: "12px", cursor: "pointer", transition: "all 0.15s",
                    fontFamily: "var(--font)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>
              Budget Range
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {budgets.map(b => (
                <button
                  key={b}
                  onClick={() => set("budget", b)}
                  style={{
                    background: form.budget === b ? "#fa6d9a18" : "var(--bg3)",
                    border: `1px solid ${form.budget === b ? "#fa6d9a44" : "var(--border)"}`,
                    color: form.budget === b ? "#fa6d9a" : "var(--muted)",
                    borderRadius: "20px", padding: "7px 16px",
                    fontSize: "12px", cursor: "pointer", transition: "all 0.15s",
                    fontFamily: "var(--font)",
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>
              Timeline
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {timelines.map(t => (
                <button
                  key={t}
                  onClick={() => set("timeline", t)}
                  style={{
                    background: form.timeline === t ? "#4ade8018" : "var(--bg3)",
                    border: `1px solid ${form.timeline === t ? "#4ade8044" : "var(--border)"}`,
                    color: form.timeline === t ? "#4ade80" : "var(--muted)",
                    borderRadius: "20px", padding: "7px 16px",
                    fontSize: "12px", cursor: "pointer", transition: "all 0.15s",
                    fontFamily: "var(--font)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>
              Tell Me About Your Project
            </label>
            <textarea
              className="input"
              rows={4}
              placeholder="What do you need? Location, dates, specific requirements… even a rough idea is enough to get started."
              value={form.message}
              onChange={e => set("message", e.target.value)}
              style={{ width: "100%", resize: "vertical", minHeight: "100px" }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!form.name || !form.email || !form.service}
            style={{ padding: "14px 32px", fontSize: "14px", width: "100%", opacity: (!form.name || !form.email || !form.service) ? 0.5 : 1 }}
          >
            Send Enquiry →
          </button>
        </div>

        {/* Sidebar info */}
        <div>
          {/* Direct contact */}
          <div className="card" style={{ marginBottom: "16px" }}>
            <div className="card-title">Direct Contact</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { icon: "📧", label: "Email", value: "moenes@example.com" },
                { icon: "💬", label: "WhatsApp", value: "+216 XX XXX XXX" },
                { icon: "📍", label: "Location", value: "Tunis, Tunisia" },
                { icon: "⏱", label: "Response Time", value: "Within 24 hours" },
              ].map(c => (
                <div key={c.label} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "16px" }}>{c.icon}</span>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>{c.label}</div>
                    <div style={{ fontSize: "13px", fontWeight: 500 }}>{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Why direct */}
          <div className="card" style={{ marginBottom: "16px" }}>
            <div className="card-title">Why Work Directly?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                "No agency markup — you pay for the work, not the overhead",
                "One contact from brief to delivery",
                "Faster decisions, faster turnaround",
                "I care about the result personally",
              ].map(r => (
                <div key={r} style={{ display: "flex", gap: "8px", fontSize: "12px", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0 }}>✓</span>
                  <span style={{ color: "var(--muted)" }}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="card" style={{ background: "#7c6dfa12", borderColor: "#7c6dfa33" }}>
            <div style={{ fontSize: "11px", color: "var(--accent)", fontFamily: "var(--mono)", marginBottom: "8px" }}>AVAILABILITY</div>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>
              🟢 Currently Accepting Projects
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
              Next available slot: this week. Retainers start next month.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from "react"
import { useNavigate } from "react-router-dom"

const services = [
  {
    id: "videographer",
    icon: "🎬",
    title: "Videographer",
    tagline: "Brand films, venue tours & event coverage",
    color: "#7c6dfa",
    clients: ["Restaurants", "Event Venues", "Hospitality"],
    route: "/c2c/videographer",
  },
  {
    id: "editor",
    icon: "✂️",
    title: "Video Editor",
    tagline: "Post-production, reels & social cuts",
    color: "#fa6d9a",
    clients: ["Location Agencies", "Real Estate", "Brands"],
    route: "/c2c/editor",
  },
  {
    id: "content",
    icon: "📱",
    title: "Content Creator",
    tagline: "Social-first content strategy & production",
    color: "#4ade80",
    clients: ["Restaurants", "Hospitality", "Retail"],
    route: "/c2c/content",
  },
  {
    id: "photographer",
    icon: "📷",
    title: "Photographer",
    tagline: "Commercial, interior & product photography",
    color: "#facc15",
    clients: ["Real Estate", "Restaurants", "Event Venues"],
    route: "/c2c/photographer",
  },
]

const stats = [
  { value: "50+", label: "Projects Delivered" },
  { value: "100%", label: "Direct — No Middleman" },
  { value: "48h", label: "First Draft Turnaround" },
  { value: "TN", label: "Based in Tunisia" },
]

export default function C2CServices() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #111118 0%, #0d0d1a 100%)",
        border: "1px solid var(--border)",
        borderRadius: "20px",
        padding: "52px 48px",
        marginBottom: "28px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* bg glow */}
        <div style={{
          position: "absolute", top: "-60px", right: "-60px",
          width: "320px", height: "320px",
          background: "radial-gradient(circle, #7c6dfa22 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-80px", left: "30%",
          width: "240px", height: "240px",
          background: "radial-gradient(circle, #fa6d9a18 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "#7c6dfa18", border: "1px solid #7c6dfa33",
            borderRadius: "20px", padding: "5px 14px",
            fontSize: "11px", fontFamily: "var(--mono)", color: "var(--accent)",
            marginBottom: "20px",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            C2C — Creator to Client · Direct Work
          </div>

          <div style={{ fontSize: "38px", fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: "16px" }}>
            You work with me.<br />
            <span style={{ color: "var(--accent)" }}>Not an agency.</span>
          </div>

          <div style={{ fontSize: "15px", color: "var(--muted)", maxWidth: "520px", lineHeight: 1.7, marginBottom: "32px" }}>
            I'm Moenes — a Tunisian creative professional specialising in video, photography and content for restaurants, hotels, real estate and event venues. Every project is handled personally, from first call to final delivery.
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/c2c/contact")}
              style={{ padding: "12px 28px", fontSize: "14px" }}
            >
              Book a Free Consultation →
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => navigate("/c2c/portfolio")}
              style={{ padding: "12px 28px", fontSize: "14px" }}
            >
              View Portfolio
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "28px",
      }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card" style={{ "--accent-color": "var(--accent)", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--accent)", letterSpacing: "-1px" }}>{s.value}</div>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", marginTop: "4px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Service cards */}
      <div className="card-title" style={{ marginBottom: "16px" }}>My Services</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "28px" }}>
        {services.map(s => (
          <div
            key={s.id}
            onClick={() => navigate(s.route)}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: "var(--bg2)",
              border: `1px solid ${hovered === s.id ? s.color + "55" : "var(--border)"}`,
              borderRadius: "16px",
              padding: "28px",
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "2px",
              background: s.color, opacity: hovered === s.id ? 1 : 0.4,
              transition: "opacity 0.2s",
            }} />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>{s.icon}</div>
                <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "6px" }}>{s.title}</div>
                <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>{s.tagline}</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {s.clients.map(c => (
                    <span key={c} style={{
                      background: s.color + "15", color: s.color,
                      border: `1px solid ${s.color}33`,
                      borderRadius: "20px", padding: "3px 10px",
                      fontSize: "11px", fontFamily: "var(--mono)",
                    }}>{c}</span>
                  ))}
                </div>
              </div>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: s.color + "18", border: `1px solid ${s.color}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: s.color, fontSize: "18px", flexShrink: 0,
                transition: "transform 0.2s",
                transform: hovered === s.id ? "translateX(4px)" : "none",
              }}>→</div>
            </div>
          </div>
        ))}
      </div>

      {/* Target clients */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="card-title">Who I Work With</div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {["🍽 Restaurants", "🏨 Hotels & Hospitality", "🏢 Real Estate Agencies", "🎭 Event Venues", "📍 Location Agencies", "🛍 Commercial Brands"].map(c => (
            <div key={c} style={{
              background: "var(--bg3)", border: "1px solid var(--border2)",
              borderRadius: "10px", padding: "10px 16px",
              fontSize: "13px", fontWeight: 500,
            }}>{c}</div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        background: "linear-gradient(135deg, #7c6dfa18, #fa6d9a10)",
        border: "1px solid #7c6dfa33",
        borderRadius: "16px", padding: "32px 36px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px",
      }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>Ready to start a project?</div>
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>Let's talk about what you need. No agency, no brief forms — just a direct conversation.</div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/c2c/contact")}
          style={{ flexShrink: 0, padding: "12px 28px" }}
        >
          Get in Touch →
        </button>
      </div>
    </div>
  )
}

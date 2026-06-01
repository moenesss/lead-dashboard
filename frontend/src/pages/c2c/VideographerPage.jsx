import { useNavigate } from "react-router-dom"
import PriceCalculator from "./PriceCalculator"

const useCases = [
    { icon: "🍽", label: "Restaurant Ambiance Films", desc: "Showcase atmosphere, dishes and the dining experience" },
    { icon: "🏨", label: "Hotel & Venue Tours", desc: "360° walkthroughs to drive bookings and enquiries" },
    { icon: "🏢", label: "Real Estate Listings", desc: "Property showcase reels that sell faster" },
    { icon: "🎉", label: "Event Coverage", desc: "Corporate events, openings, launches captured professionally" },
    { icon: "📣", label: "Brand Campaigns", desc: "Story-driven content for social & paid ads" },
    { icon: "🌐", label: "Website Hero Videos", desc: "Cinematic headers that make a strong first impression" },
]

const process = [
    { step: "01", title: "Discovery Call", desc: "We align on your brand, audience and goals — 30 min free consultation." },
    { step: "02", title: "Shot Planning", desc: "I create a detailed shot list and schedule tailored to your location." },
    { step: "03", title: "Production Day", desc: "On-site filming with professional gear — I work fast and stay non-intrusive." },
    { step: "04", title: "Post-Production", desc: "Edit, colour grade, sound design — first draft within 48h." },
    { step: "05", title: "Revisions & Delivery", desc: "2 rounds of revisions included. Final files delivered in all formats you need." },
]

export default function VideographerPage() {
    const navigate = useNavigate()

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <button className="btn btn-ghost" onClick={() => navigate("/c2c")}
                        style={{ marginBottom: "12px", padding: "6px 14px", fontSize: "12px" }}>
                        ← Back to Services
                    </button>
                    <div className="page-title">🎬 Videographer</div>
                    <div className="page-sub">Cinematic brand films, venue tours & event coverage · Direct with Moenes</div>
                </div>
                <button className="btn btn-primary" onClick={() => navigate("/c2c/contact")} style={{ padding: "12px 24px" }}>
                    Book a Shoot →
                </button>
            </div>

            {/* Hero */}
            <div style={{
                background: "linear-gradient(135deg, #7c6dfa18 0%, #111118 60%)",
                border: "1px solid #7c6dfa33", borderRadius: "18px",
                padding: "40px 44px", marginBottom: "28px", position: "relative", overflow: "hidden",
            }}>
                <div style={{
                    position: "absolute", top: "-40px", right: "-40px",
                    width: "280px", height: "280px",
                    background: "radial-gradient(circle, #7c6dfa30 0%, transparent 70%)",
                    pointerEvents: "none",
                }} />
                <div style={{ maxWidth: "560px" }}>
                    <div style={{ fontSize: "14px", color: "#7c6dfa", fontFamily: "var(--mono)", marginBottom: "12px" }}>// VIDEOGRAPHER</div>
                    <div style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1.4, marginBottom: "16px" }}>
                        Video content that makes your business impossible to ignore
                    </div>
                    <div style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.7 }}>
                        I produce cinematic brand films, social-first Reels and venue walkthroughs specifically designed
                        for the Tunisian hospitality, real estate and F&B market. You brief me directly — no account managers,
                        no inflated agency fees.
                    </div>
                </div>
            </div>

            {/* What I Film */}
            <div className="card-title" style={{ marginBottom: "14px" }}>What I Film</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
                {useCases.map(u => (
                    <div key={u.label} className="card" style={{ padding: "20px", marginBottom: 0 }}>
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>{u.icon}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>{u.label}</div>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>{u.desc}</div>
                    </div>
                ))}
            </div>

            {/* ── PRICE CALCULATOR ── */}
            <div className="card-title" style={{ marginBottom: "14px" }}>Pricing Calculator</div>
            <PriceCalculator
                service="videographer"
                accentColor="#7c6dfa"
                onBook={price => navigate(`/c2c/contact?service=videographer&estimate=${price}`)}
            />

            {/* Process */}
            <div className="card" style={{ marginBottom: "28px" }}>
                <div className="card-title">How It Works</div>
                <div style={{ display: "flex", gap: "0", overflowX: "auto" }}>
                    {process.map((p, i) => (
                        <div key={p.step} style={{
                            flex: "1", padding: "16px 20px",
                            borderRight: i < process.length - 1 ? "1px solid var(--border)" : "none",
                            minWidth: "140px",
                        }}>
                            <div style={{ fontSize: "11px", fontFamily: "var(--mono)", color: "#7c6dfa", marginBottom: "8px" }}>{p.step}</div>
                            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>{p.title}</div>
                            <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.6 }}>{p.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div style={{
                background: "linear-gradient(135deg, #7c6dfa18, #0a0a0f)",
                border: "1px solid #7c6dfa44", borderRadius: "16px",
                padding: "32px 36px", display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: "24px",
            }}>
                <div>
                    <div style={{ fontSize: "17px", fontWeight: 700, marginBottom: "6px" }}>Let's shoot something great.</div>
                    <div style={{ fontSize: "13px", color: "var(--muted)" }}>Tell me about your project — I'll get back within 24 hours.</div>
                </div>
                <button className="btn btn-primary" onClick={() => navigate("/c2c/contact")} style={{ padding: "12px 24px", flexShrink: 0 }}>
                    Book Now →
                </button>
            </div>
        </div>
    )
}

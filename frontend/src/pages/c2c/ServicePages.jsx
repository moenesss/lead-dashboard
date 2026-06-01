import { useNavigate } from "react-router-dom"
import PriceCalculator from "./PriceCalculator"

// ─────────────────────────────────────────
// VIDEO EDITOR PAGE
// ─────────────────────────────────────────
const editingServices = [
    { icon: "🎞", title: "Brand Film Editing", desc: "Raw footage → polished cinematic film with colour grade, sound mix and motion titles." },
    { icon: "📱", title: "Reels & Short-Form Cuts", desc: "15s–60s vertical edits optimised for Instagram, TikTok and YouTube Shorts." },
    { icon: "🏠", title: "Real Estate Walkthroughs", desc: "Smooth property tours with text overlays, music and call-to-action end cards." },
    { icon: "🍽", title: "Food & Venue Edits", desc: "Dynamic cuts that highlight ambiance, dishes and the full customer experience." },
    { icon: "📊", title: "Ad Creative Cuts", desc: "Performance-optimised edits for paid social — tested hooks, subtitles, formats." },
    { icon: "🔄", title: "Repurpose Packages", desc: "Turn one hero video into 10+ social assets — maximise every shoot." },
]

export function VideoEditorPage() {
    const navigate = useNavigate()
    return (
        <div>
            <div className="page-header">
                <div>
                    <button className="btn btn-ghost" onClick={() => navigate("/c2c")}
                        style={{ marginBottom: "12px", padding: "6px 14px", fontSize: "12px" }}>
                        ← Back to Services
                    </button>
                    <div className="page-title">✂️ Video Editor</div>
                    <div className="page-sub">Post-production, Reels & social cut-downs · Direct with Moenes</div>
                </div>
                <button className="btn btn-primary" onClick={() => navigate("/c2c/contact")} style={{ padding: "12px 24px" }}>
                    Send Your Footage →
                </button>
            </div>

            {/* Hero */}
            <div style={{
                background: "linear-gradient(135deg, #fa6d9a18 0%, #111118 60%)",
                border: "1px solid #fa6d9a33", borderRadius: "18px",
                padding: "40px 44px", marginBottom: "28px",
            }}>
                <div style={{ fontSize: "14px", color: "#fa6d9a", fontFamily: "var(--mono)", marginBottom: "12px" }}>// VIDEO EDITOR</div>
                <div style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1.4, marginBottom: "14px", maxWidth: "520px" }}>
                    You shot it. I'll make it look like a million dinars.
                </div>
                <div style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.7, maxWidth: "500px" }}>
                    Send me your raw footage and I'll return a polished, platform-ready edit.
                    I work directly with you — no creative brief templates, no agency back-and-forth.
                </div>
            </div>

            {/* What I Edit */}
            <div className="card-title" style={{ marginBottom: "14px" }}>What I Edit</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
                {editingServices.map(s => (
                    <div key={s.title} className="card" style={{ padding: "20px", marginBottom: 0 }}>
                        <div style={{ fontSize: "22px", marginBottom: "8px" }}>{s.icon}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>{s.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>{s.desc}</div>
                    </div>
                ))}
            </div>

            {/* ── PRICE CALCULATOR ── */}
            <div className="card-title" style={{ marginBottom: "14px" }}>Pricing Calculator</div>
            <PriceCalculator
                service="editor"
                accentColor="#fa6d9a"
                onBook={price => navigate(`/c2c/contact?service=editor&estimate=${price}`)}
            />

            {/* Remote Workflow */}
            <div className="card" style={{ marginBottom: "24px" }}>
                <div className="card-title">Remote-Friendly Workflow</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                    {[
                        { n: "1", t: "Share Footage", d: "WeTransfer, Google Drive or any cloud link" },
                        { n: "2", t: "Brief Me", d: "2-min voice note or a few bullet points — that's enough" },
                        { n: "3", t: "First Cut", d: "Delivered within the agreed window for your review" },
                        { n: "4", t: "Approve & Export", d: "Final files in all formats — web, social, broadcast" },
                    ].map(s => (
                        <div key={s.n}>
                            <div style={{ fontSize: "22px", fontWeight: 800, color: "#fa6d9a", fontFamily: "var(--mono)", marginBottom: "8px" }}>{s.n}</div>
                            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>{s.t}</div>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>{s.d}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div style={{
                background: "linear-gradient(135deg, #fa6d9a18, #0a0a0f)",
                border: "1px solid #fa6d9a44", borderRadius: "16px",
                padding: "32px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px",
            }}>
                <div>
                    <div style={{ fontSize: "17px", fontWeight: 700, marginBottom: "6px" }}>Have footage ready to edit?</div>
                    <div style={{ fontSize: "13px", color: "var(--muted)" }}>Drop me a message and I'll have a first cut back to you in 24–48h.</div>
                </div>
                <button className="btn btn-primary" onClick={() => navigate("/c2c/contact")} style={{ padding: "12px 24px", flexShrink: 0 }}>
                    Start a Project →
                </button>
            </div>
        </div>
    )
}


// ─────────────────────────────────────────
// CONTENT CREATOR PAGE
// ─────────────────────────────────────────
const contentTypes = [
    "🍔 Food & Drink Content", "🏨 Hotel & Venue Walkthroughs",
    "🏠 Property Showcases", "🎉 Event Recaps",
    "📦 Product Demos", "👨‍🍳 Behind-the-Scenes",
    "💬 Testimonial Clips", "📣 Promotional Reels",
]

export function ContentCreatorPage() {
    const navigate = useNavigate()
    return (
        <div>
            <div className="page-header">
                <div>
                    <button className="btn btn-ghost" onClick={() => navigate("/c2c")}
                        style={{ marginBottom: "12px", padding: "6px 14px", fontSize: "12px" }}>
                        ← Back to Services
                    </button>
                    <div className="page-title">📱 Content Creator</div>
                    <div className="page-sub">Social-first content strategy & production · Direct with Moenes</div>
                </div>
                <button className="btn btn-primary" onClick={() => navigate("/c2c/contact")} style={{ padding: "12px 24px" }}>
                    Start a Retainer →
                </button>
            </div>

            {/* Hero */}
            <div style={{
                background: "linear-gradient(135deg, #4ade8018 0%, #111118 60%)",
                border: "1px solid #4ade8033", borderRadius: "18px",
                padding: "40px 44px", marginBottom: "28px",
            }}>
                <div style={{ fontSize: "14px", color: "#4ade80", fontFamily: "var(--mono)", marginBottom: "12px" }}>// CONTENT CREATOR</div>
                <div style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1.4, marginBottom: "14px", maxWidth: "520px" }}>
                    Consistent, scroll-stopping content — every single month.
                </div>
                <div style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.7, maxWidth: "500px" }}>
                    I handle everything: strategy, filming, editing and posting. Built for Tunisian businesses
                    that want a real social presence without hiring a full team. You talk to me — one person, one invoice.
                </div>
            </div>

            {/* Content types */}
            <div className="card-title" style={{ marginBottom: "14px" }}>Content I Create</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "28px" }}>
                {contentTypes.map(c => (
                    <div key={c} style={{
                        background: "#4ade8012", border: "1px solid #4ade8025",
                        borderRadius: "10px", padding: "10px 16px",
                        fontSize: "13px", fontWeight: 500,
                    }}>{c}</div>
                ))}
            </div>

            {/* ── PRICE CALCULATOR ── */}
            <div className="card-title" style={{ marginBottom: "14px" }}>Monthly Retainer Calculator</div>
            <PriceCalculator
                service="content"
                accentColor="#4ade80"
                onBook={price => navigate(`/c2c/contact?service=content&estimate=${price}`)}
            />

            {/* Why retainer */}
            <div className="card" style={{ marginBottom: "24px" }}>
                <div className="card-title">Why a Monthly Retainer?</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                    {[
                        { icon: "📈", t: "Algorithm Consistency", d: "Regular posting is the #1 driver of organic growth on Instagram and TikTok." },
                        { icon: "💰", t: "Lower Cost Per Asset", d: "A monthly deal costs 40–60% less per piece than one-off project rates." },
                        { icon: "🤝", t: "I Learn Your Brand", d: "Over time I understand your tone, audience and what converts — no brief needed." },
                    ].map(r => (
                        <div key={r.t}>
                            <div style={{ fontSize: "24px", marginBottom: "8px" }}>{r.icon}</div>
                            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>{r.t}</div>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>{r.d}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div style={{
                background: "linear-gradient(135deg, #4ade8018, #0a0a0f)",
                border: "1px solid #4ade8044", borderRadius: "16px",
                padding: "32px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px",
            }}>
                <div>
                    <div style={{ fontSize: "17px", fontWeight: 700, marginBottom: "6px" }}>Ready for consistent content?</div>
                    <div style={{ fontSize: "13px", color: "var(--muted)" }}>Let's start with a free strategy call — I'll show you exactly what your competitors are missing.</div>
                </div>
                <button className="btn btn-primary" onClick={() => navigate("/c2c/contact")} style={{ padding: "12px 24px", flexShrink: 0 }}>
                    Book Free Call →
                </button>
            </div>
        </div>
    )
}


// ─────────────────────────────────────────
// PHOTOGRAPHER PAGE
// ─────────────────────────────────────────
const photoServices = [
    { icon: "🏠", title: "Real Estate Photography", desc: "Interior, exterior and aerial shots that attract buyers and tenants fast." },
    { icon: "🍽", title: "Food & Beverage", desc: "Styled dish photography and ambient restaurant shots for menus and social." },
    { icon: "🏨", title: "Hotel & Venue", desc: "Room tours, communal spaces and detail shots for booking platforms." },
    { icon: "🎉", title: "Event Photography", desc: "Corporate events, openings and galas covered professionally." },
    { icon: "🏢", title: "Commercial & Brand", desc: "Team portraits, office environments and product photography." },
    { icon: "🌅", title: "Aerial / Drone", desc: "Overhead perspective for real estate, venues and landscapes." },
]

export function PhotographerPage() {
    const navigate = useNavigate()
    return (
        <div>
            <div className="page-header">
                <div>
                    <button className="btn btn-ghost" onClick={() => navigate("/c2c")}
                        style={{ marginBottom: "12px", padding: "6px 14px", fontSize: "12px" }}>
                        ← Back to Services
                    </button>
                    <div className="page-title">📷 Photographer</div>
                    <div className="page-sub">Commercial, interior & product photography · Direct with Moenes</div>
                </div>
                <button className="btn btn-primary" onClick={() => navigate("/c2c/contact")} style={{ padding: "12px 24px" }}>
                    Book a Session →
                </button>
            </div>

            {/* Hero */}
            <div style={{
                background: "linear-gradient(135deg, #facc1518 0%, #111118 60%)",
                border: "1px solid #facc1533", borderRadius: "18px",
                padding: "40px 44px", marginBottom: "28px",
            }}>
                <div style={{ fontSize: "14px", color: "#facc15", fontFamily: "var(--mono)", marginBottom: "12px" }}>// PHOTOGRAPHER</div>
                <div style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1.4, marginBottom: "14px", maxWidth: "520px" }}>
                    Images that convert. For listings, menus, campaigns and beyond.
                </div>
                <div style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.7, maxWidth: "500px" }}>
                    Professional photography for Tunisian businesses — real estate, restaurants, hotels and events.
                    Fast turnaround, fully retouched, delivered in every format you need.
                </div>
            </div>

            {/* Specialisations */}
            <div className="card-title" style={{ marginBottom: "14px" }}>Specialisations</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "28px" }}>
                {photoServices.map(s => (
                    <div key={s.title} className="card" style={{ padding: "20px", marginBottom: 0 }}>
                        <div style={{ fontSize: "22px", marginBottom: "8px" }}>{s.icon}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>{s.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>{s.desc}</div>
                    </div>
                ))}
            </div>

            {/* ── PRICE CALCULATOR ── */}
            <div className="card-title" style={{ marginBottom: "14px" }}>Pricing Calculator</div>
            <PriceCalculator
                service="photographer"
                accentColor="#facc15"
                onBook={price => navigate(`/c2c/contact?service=photographer&estimate=${price}`)}
            />

            {/* What you get */}
            <div className="card" style={{ marginBottom: "24px" }}>
                <div className="card-title">What You Get</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                    {[
                        { icon: "✏️", t: "Full Retouching", d: "Colour, exposure, blemish removal on every image" },
                        { icon: "📁", t: "All Formats", d: "Web (JPG), print (TIFF), social (square + vertical)" },
                        { icon: "⚡", t: "48h Delivery", d: "First batch delivered within 48 hours of the shoot" },
                        { icon: "☁️", t: "Cloud Gallery", d: "Private online gallery for easy download and sharing" },
                    ].map(d => (
                        <div key={d.t}>
                            <div style={{ fontSize: "22px", marginBottom: "8px" }}>{d.icon}</div>
                            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>{d.t}</div>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>{d.d}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div style={{
                background: "linear-gradient(135deg, #facc1518, #0a0a0f)",
                border: "1px solid #facc1544", borderRadius: "16px",
                padding: "32px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px",
            }}>
                <div>
                    <div style={{ fontSize: "17px", fontWeight: 700, marginBottom: "6px" }}>Let's make your space look incredible.</div>
                    <div style={{ fontSize: "13px", color: "var(--muted)" }}>Drop me a message with your location and I'll give you a tailored quote.</div>
                </div>
                <button className="btn btn-primary" onClick={() => navigate("/c2c/contact")} style={{ padding: "12px 24px", flexShrink: 0 }}>
                    Get a Quote →
                </button>
            </div>
        </div>
    )
}

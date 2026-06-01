/**
 * PriceCalculator.jsx
 * ---------------------
 * Reusable interactive pricing calculator with sliders.
 * Used by all 4 C2C service pages.
 *
 * Props:
 *   service: "videographer" | "editor" | "content" | "photographer"
 *   accentColor: CSS color string
 *   onBook: function called when user clicks Book
 */

import { useState, useMemo } from "react"

// ─────────────────────────────────────────
// SLIDER COMPONENT
// ─────────────────────────────────────────
function Slider({ label, min, max, step = 1, value, onChange, format, hint, accentColor }) {
    const pct = ((value - min) / (max - min)) * 100
    return (
        <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>{label}</span>
                    {hint && <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{hint}</div>}
                </div>
                <span style={{
                    fontFamily: "var(--mono)", fontSize: "13px", fontWeight: 700,
                    color: accentColor, background: accentColor + "18",
                    padding: "3px 10px", borderRadius: "8px",
                    border: `1px solid ${accentColor}33`,
                }}>
                    {format(value)}
                </span>
            </div>
            <div style={{ position: "relative", height: "6px" }}>
                {/* Track background */}
                <div style={{
                    position: "absolute", inset: 0,
                    background: "var(--bg3)", borderRadius: "99px",
                    border: "1px solid var(--border2)",
                }} />
                {/* Filled track */}
                <div style={{
                    position: "absolute", top: 0, left: 0, bottom: 0,
                    width: `${pct}%`, background: accentColor,
                    borderRadius: "99px", opacity: 0.7,
                    transition: "width 0.1s",
                }} />
                {/* Native input (invisible, on top) */}
                <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    style={{
                        position: "absolute", inset: 0, width: "100%", height: "100%",
                        opacity: 0, cursor: "pointer", margin: 0,
                    }}
                />
                {/* Thumb */}
                <div style={{
                    position: "absolute", top: "50%",
                    left: `calc(${pct}% - 9px)`,
                    transform: "translateY(-50%)",
                    width: "18px", height: "18px",
                    background: accentColor, borderRadius: "50%",
                    border: "2px solid var(--bg1)",
                    boxShadow: `0 0 0 3px ${accentColor}33`,
                    transition: "left 0.1s",
                    pointerEvents: "none",
                }} />
            </div>
        </div>
    )
}

// ─────────────────────────────────────────
// TOGGLE BUTTON GROUP
// ─────────────────────────────────────────
function ToggleGroup({ label, options, value, onChange, accentColor }) {
    return (
        <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>{label}</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {options.map(opt => {
                    const active = value === opt.value
                    return (
                        <button
                            key={opt.value}
                            onClick={() => onChange(opt.value)}
                            style={{
                                background: active ? accentColor + "22" : "var(--bg3)",
                                border: `1px solid ${active ? accentColor + "66" : "var(--border2)"}`,
                                color: active ? accentColor : "var(--muted)",
                                borderRadius: "8px", padding: "6px 14px",
                                fontSize: "12px", cursor: "pointer",
                                fontFamily: "var(--font)", fontWeight: active ? 600 : 400,
                                transition: "all 0.15s",
                            }}
                        >
                            {opt.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────
// PRICE CONFIGS PER SERVICE
// ─────────────────────────────────────────

const CONFIGS = {
    videographer: {
        title: "Price Calculator",
        subtitle: "Slide to configure your shoot",
        sliders: [
            {
                key: "quality",
                label: "Video Quality",
                hint: "Basic = handheld social clips · Cinematic = full grade + sound mix",
                min: 1, max: 3,
                marks: ["Basic", "Professional", "Cinematic"],
                format: v => ["Basic", "Professional", "Cinematic"][v - 1],
            },
            {
                key: "quantity",
                label: "Number of Videos",
                hint: "Pack discount: -8% per extra video",
                min: 1, max: 8,
                format: v => v === 1 ? "1 video" : `${v} videos`,
            },
            {
                key: "duration",
                label: "Video Length",
                hint: "Short = Reels/TikTok (15–60s) · Long = brand film (2–4 min)",
                min: 1, max: 3,
                marks: ["Short (Reels)", "Medium (60–90s)", "Long (2–4 min)"],
                format: v => ["Short (Reels)", "Medium (60–90s)", "Long (2–4 min)"][v - 1],
            },
        ],
        toggles: [
            {
                key: "editing",
                label: "Editing Included?",
                options: [
                    { value: "none",  label: "Raw footage only" },
                    { value: "basic", label: "Basic edit" },
                    { value: "full",  label: "Full grade + sound mix" },
                ],
            },
            {
                key: "rush",
                label: "Turnaround",
                options: [
                    { value: false, label: "Standard (5–7 days)" },
                    { value: true,  label: "Rush (48h) +25%" },
                ],
            },
        ],
        calculate: ({ quality, quantity, duration, editing, rush }) => {
            // Base price per video by quality
            const qualityBase = [350, 700, 1200][quality - 1]
            // Duration multiplier
            const durationMult = [1, 1.4, 2][duration - 1]
            // Editing add-on
            const editingAdd = { none: 0, basic: 100, full: 300 }[editing]
            // Per-video price
            const perVideo = qualityBase * durationMult + editingAdd
            // Bulk discount: 8% off per extra video, max 35%
            const discount = Math.min(0.35, (quantity - 1) * 0.08)
            const subtotal = perVideo * quantity * (1 - discount)
            // Rush surcharge
            const total = rush ? subtotal * 1.25 : subtotal
            return {
                total: Math.round(total / 10) * 10,
                perVideo: Math.round((total / quantity) / 10) * 10,
                discount: Math.round(discount * 100),
                breakdown: [
                    { label: "Base price / video", value: `${Math.round(qualityBase * durationMult)} TND` },
                    { label: "Editing add-on", value: `+${editingAdd} TND` },
                    { label: `× ${quantity} video${quantity > 1 ? "s" : ""}`, value: "" },
                    discount > 0 ? { label: `Pack discount`, value: `-${Math.round(discount * 100)}%` } : null,
                    rush ? { label: "Rush surcharge", value: "+25%" } : null,
                ].filter(Boolean),
            }
        },
        defaults: { quality: 2, quantity: 1, duration: 2, editing: "basic", rush: false },
    },

    editor: {
        title: "Price Calculator",
        subtitle: "Configure your edit",
        sliders: [
            {
                key: "clips",
                label: "Number of Clips",
                hint: "Pack discount: -8% per extra clip",
                min: 1, max: 10,
                format: v => v === 1 ? "1 clip" : `${v} clips`,
            },
            {
                key: "length",
                label: "Clip Length",
                hint: "Reel = 15–60s · Medium = 60–90s · Long = 2–5 min",
                min: 1, max: 3,
                marks: ["Reel (15–60s)", "Medium (60–90s)", "Long (2–5 min)"],
                format: v => ["Reel (15–60s)", "Medium (60–90s)", "Long (2–5 min)"][v - 1],
            },
        ],
        toggles: [
            {
                key: "complexity",
                label: "Edit Complexity",
                options: [
                    { value: "basic",    label: "Basic cut + titles" },
                    { value: "standard", label: "Colour grade + sound" },
                    { value: "advanced", label: "Motion graphics + VFX" },
                ],
            },
            {
                key: "rush",
                label: "Turnaround",
                options: [
                    { value: false, label: "Standard" },
                    { value: true,  label: "Rush (24h) +30%" },
                ],
            },
        ],
        calculate: ({ clips, length, complexity, rush }) => {
            const lengthBase = [120, 200, 400][length - 1]
            const complexityMult = { basic: 1, standard: 1.4, advanced: 2 }[complexity]
            const perClip = lengthBase * complexityMult
            const discount = Math.min(0.40, (clips - 1) * 0.08)
            const subtotal = perClip * clips * (1 - discount)
            const total = rush ? subtotal * 1.30 : subtotal
            return {
                total: Math.round(total / 10) * 10,
                perVideo: Math.round((total / clips) / 10) * 10,
                discount: Math.round(discount * 100),
                breakdown: [
                    { label: "Base price / clip", value: `${Math.round(lengthBase)} TND` },
                    { label: "Complexity ×", value: `${complexityMult}` },
                    { label: `× ${clips} clip${clips > 1 ? "s" : ""}`, value: "" },
                    discount > 0 ? { label: "Pack discount", value: `-${Math.round(discount * 100)}%` } : null,
                    rush ? { label: "Rush surcharge", value: "+30%" } : null,
                ].filter(Boolean),
            }
        },
        defaults: { clips: 1, length: 1, complexity: "standard", rush: false },
    },

    photographer: {
        title: "Price Calculator",
        subtitle: "Configure your session",
        sliders: [
            {
                key: "hours",
                label: "Session Duration",
                hint: "More hours = more locations covered",
                min: 2, max: 10,
                format: v => `${v} hours`,
            },
            {
                key: "photos",
                label: "Final Edited Photos",
                hint: "All photos fully retouched and delivered in web + print formats",
                min: 10, max: 100, step: 5,
                format: v => `${v} photos`,
            },
        ],
        toggles: [
            {
                key: "style",
                label: "Photography Style",
                options: [
                    { value: "interior",  label: "Interior / Architecture" },
                    { value: "food",      label: "Food & Product" },
                    { value: "event",     label: "Event / Corporate" },
                    { value: "aerial",    label: "Aerial + Drone" },
                ],
            },
            {
                key: "rush",
                label: "Delivery",
                options: [
                    { value: false, label: "Standard (48h)" },
                    { value: true,  label: "Rush (same day) +30%" },
                ],
            },
        ],
        calculate: ({ hours, photos, style, rush }) => {
            const styleBase = { interior: 80, food: 100, event: 70, aerial: 140 }[style]
            const hourRate = styleBase
            const photoRate = photos > 40 ? (photos - 40) * 3 : 0
            const subtotal = hours * hourRate + photoRate + 150 // 150 base setup
            const total = rush ? subtotal * 1.30 : subtotal
            return {
                total: Math.round(total / 10) * 10,
                perVideo: null,
                discount: 0,
                breakdown: [
                    { label: "Session rate", value: `${hourRate} TND/hr` },
                    { label: `× ${hours} hours`, value: "" },
                    { label: "Setup & editing base", value: "150 TND" },
                    photos > 40 ? { label: `Extra ${photos - 40} photos`, value: `+${photoRate} TND` } : null,
                    rush ? { label: "Rush delivery", value: "+30%" } : null,
                ].filter(Boolean),
            }
        },
        defaults: { hours: 4, photos: 40, style: "food", rush: false },
    },

    content: {
        title: "Price Calculator",
        subtitle: "Configure your monthly retainer",
        sliders: [
            {
                key: "videos",
                label: "Short-form Videos / Month",
                hint: "Filmed + edited vertical videos for Instagram / TikTok",
                min: 4, max: 24, step: 2,
                format: v => `${v} videos`,
            },
            {
                key: "photos",
                label: "Photo Posts / Month",
                hint: "Styled product or lifestyle photos",
                min: 0, max: 20, step: 2,
                format: v => v === 0 ? "No photos" : `${v} photos`,
            },
        ],
        toggles: [
            {
                key: "platforms",
                label: "Platforms",
                options: [
                    { value: 1, label: "1 platform" },
                    { value: 2, label: "2 platforms +20%" },
                    { value: 3, label: "3+ platforms +35%" },
                ],
            },
            {
                key: "strategy",
                label: "Strategy Included?",
                options: [
                    { value: false, label: "Content only" },
                    { value: true,  label: "Strategy + captions +200 TND" },
                ],
            },
        ],
        calculate: ({ videos, photos, platforms, strategy }) => {
            const videoRate = 90   // per video
            const photoRate = 30   // per photo
            const platformMult = { 1: 1, 2: 1.20, 3: 1.35 }[platforms]
            const subtotal = (videos * videoRate + photos * photoRate) * platformMult
            const total = strategy ? subtotal + 200 : subtotal
            return {
                total: Math.round(total / 10) * 10,
                perVideo: Math.round((videos > 0 ? total / videos : 0) / 5) * 5,
                discount: 0,
                breakdown: [
                    { label: `${videos} videos × ${videoRate} TND`, value: `${videos * videoRate} TND` },
                    photos > 0 ? { label: `${photos} photos × ${photoRate} TND`, value: `${photos * photoRate} TND` } : null,
                    platforms > 1 ? { label: "Multi-platform", value: `+${Math.round((platformMult - 1) * 100)}%` } : null,
                    strategy ? { label: "Strategy & captions", value: "+200 TND" } : null,
                ].filter(Boolean),
            }
        },
        defaults: { videos: 8, photos: 8, platforms: 1, strategy: false },
    },
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function PriceCalculator({ service, accentColor, onBook }) {
    const cfg = CONFIGS[service]
    if (!cfg) return null

    // Build initial state from defaults
    const [values, setValues] = useState(cfg.defaults)
    const set = (key, val) => setValues(v => ({ ...v, [key]: val }))

    const result = useMemo(() => cfg.calculate(values), [values])

    const isMonthly = service === "content"

    return (
        <div className="card" style={{
            padding: "28px 32px", marginBottom: "28px",
            border: `1px solid ${accentColor}33`,
            background: `linear-gradient(135deg, ${accentColor}08 0%, var(--bg2) 100%)`,
        }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                <div>
                    <div style={{ fontSize: "16px", fontWeight: 800 }}>{cfg.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>{cfg.subtitle}</div>
                </div>
                <div style={{
                    background: accentColor + "15", border: `1px solid ${accentColor}44`,
                    borderRadius: "10px", padding: "6px 12px",
                    fontSize: "10px", color: accentColor, fontFamily: "var(--mono)",
                    fontWeight: 600, letterSpacing: "0.5px",
                }}>
                    LIVE ESTIMATE
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                {/* Left — controls */}
                <div>
                    {/* Sliders */}
                    {cfg.sliders.map(sl => (
                        <Slider
                            key={sl.key}
                            label={sl.label}
                            hint={sl.hint}
                            min={sl.min}
                            max={sl.max}
                            step={sl.step || 1}
                            value={values[sl.key]}
                            onChange={v => set(sl.key, v)}
                            format={sl.format}
                            accentColor={accentColor}
                        />
                    ))}

                    {/* Toggle groups */}
                    {cfg.toggles.map(tg => (
                        <ToggleGroup
                            key={tg.key}
                            label={tg.label}
                            options={tg.options}
                            value={values[tg.key]}
                            onChange={v => set(tg.key, v)}
                            accentColor={accentColor}
                        />
                    ))}
                </div>

                {/* Right — price output */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    {/* Price display */}
                    <div style={{
                        background: "var(--bg3)", border: `1px solid ${accentColor}33`,
                        borderRadius: "14px", padding: "24px",
                        marginBottom: "16px", textAlign: "center",
                    }}>
                        <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Estimated Total
                        </div>
                        <div style={{
                            fontSize: "44px", fontWeight: 900, letterSpacing: "-2px",
                            color: accentColor, lineHeight: 1, marginBottom: "4px",
                            fontFamily: "var(--mono)",
                            transition: "all 0.2s",
                        }}>
                            {result.total.toLocaleString()}
                        </div>
                        <div style={{ fontSize: "14px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                            TND{isMonthly ? " / month" : ""}
                        </div>

                        {/* Per-unit price */}
                        {result.perVideo > 0 && (
                            <div style={{
                                marginTop: "12px", padding: "8px 0",
                                borderTop: `1px solid ${accentColor}22`,
                                fontSize: "12px", color: "var(--muted)",
                            }}>
                                {service === "content"
                                    ? `≈ ${result.perVideo} TND per video`
                                    : service === "editor"
                                    ? `≈ ${result.perVideo} TND per clip`
                                    : `≈ ${result.perVideo} TND per video`}
                            </div>
                        )}

                        {/* Discount badge */}
                        {result.discount > 0 && (
                            <div style={{
                                marginTop: "8px",
                                background: "#4ade8022", color: "#4ade80",
                                border: "1px solid #4ade8044",
                                borderRadius: "20px", padding: "4px 12px",
                                fontSize: "11px", fontWeight: 600, display: "inline-block",
                            }}>
                                🎉 {result.discount}% pack discount applied
                            </div>
                        )}
                    </div>

                    {/* Breakdown */}
                    <div style={{
                        background: "var(--bg3)", borderRadius: "10px",
                        padding: "14px 16px", marginBottom: "16px",
                        border: "1px solid var(--border2)",
                    }}>
                        <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
                            Breakdown
                        </div>
                        {result.breakdown.map((item, i) => (
                            <div key={i} style={{
                                display: "flex", justifyContent: "space-between",
                                fontSize: "12px", marginBottom: "6px",
                                color: item.value ? "var(--text)" : "var(--muted)",
                            }}>
                                <span>{item.label}</span>
                                {item.value && <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{item.value}</span>}
                            </div>
                        ))}
                        <div style={{
                            display: "flex", justifyContent: "space-between",
                            fontSize: "13px", fontWeight: 700,
                            borderTop: "1px solid var(--border2)", paddingTop: "8px", marginTop: "4px",
                            color: accentColor,
                        }}>
                            <span>Total estimate</span>
                            <span style={{ fontFamily: "var(--mono)" }}>{result.total.toLocaleString()} TND</span>
                        </div>
                    </div>

                    {/* Disclaimer + CTA */}
                    <div style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "12px", lineHeight: 1.6 }}>
                        * This is a rough estimate — final price confirmed after a free 30-min discovery call. Travel outside Tunis may incur extra fees.
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => onBook && onBook(result.total)}
                        style={{ width: "100%", padding: "12px", fontSize: "14px", fontWeight: 700 }}
                    >
                        Book at ~{result.total.toLocaleString()} TND →
                    </button>
                </div>
            </div>
        </div>
    )
}

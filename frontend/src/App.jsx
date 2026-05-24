import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom"
import axios from "axios"
import Dashboard from "./pages/Dashboard"
import Agencies from "./pages/Agencies"
import Opportunities from "./pages/Opportunities"
import OutreachPage from "./pages/Outreach"
import DecisionMakers from "./pages/DecisionMakers"
import EmailTemplates from "./pages/EmailTemplates.jsx"
import ExportPage from "./pages/ExportPage"

// ── C2C Pages ──
import C2CServices from "./pages/c2c/C2CServices"
import VideographerPage from "./pages/c2c/VideographerPage"
import { VideoEditorPage, ContentCreatorPage, PhotographerPage } from "./pages/c2c/ServicePages"
import C2CContact from "./pages/c2c/C2CContact"
import ClientProspector from "./pages/ClientProspector"

import "./App.css"

export const API = "http://127.0.0.1:8000"

export default function App() {
    const [stats, setStats] = useState(null)

    useEffect(() => {
        axios.get(`${API}/stats`).then(r => setStats(r.data)).catch(() => {})
    }, [])

    return (
        <BrowserRouter>
            <div className="app">
                <aside className="sidebar">
                    <div className="sidebar-brand">
                        <span className="brand-icon">⬡</span>
                        <div>
                            <div className="brand-title">LeadRadar</div>
                            <div className="brand-sub">Tunisia Creative</div>
                        </div>
                    </div>

                    <nav className="sidebar-nav">
                        {/* ── Lead Pipeline ── */}
                        <div style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1.5px", padding: "0 12px", marginBottom: "4px", marginTop: "4px" }}>
                            Lead Pipeline
                        </div>
                        <NavLink to="/" end className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">▦</span> Dashboard
                        </NavLink>
                        <NavLink to="/agencies" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">◈</span> Agencies
                            {stats?.total_agencies > 0 && <span className="nav-badge">{stats.total_agencies}</span>}
                        </NavLink>
                        <NavLink to="/opportunities" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">◎</span> Opportunities
                            {stats?.new_opportunities > 0 && <span className="nav-badge alert">{stats.new_opportunities}</span>}
                        </NavLink>
                        <NavLink to="/outreach" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">◇</span> Outreach
                            {stats?.pending_followups > 0 && <span className="nav-badge alert">{stats.pending_followups}</span>}
                        </NavLink>
                        <NavLink to="/decision-makers" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">👤</span> Decision Makers
                            {stats?.total_decision_makers > 0 && <span className="nav-badge">{stats.total_decision_makers}</span>}
                        </NavLink>
                        <NavLink to="/templates" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">✉️</span> Templates
                        </NavLink>
                        <NavLink to="/export" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">⬇️</span> Export
                        </NavLink>

                        {/* ── C2C Services ── */}
                        <div style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1.5px", padding: "0 12px", marginBottom: "4px", marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                            C2C · My Services
                        </div>
                        <NavLink to="/c2c" end className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">⬡</span> Services Hub
                        </NavLink>
                        <NavLink to="/c2c/videographer" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">🎬</span> Videographer
                        </NavLink>
                        <NavLink to="/c2c/editor" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">✂️</span> Video Editor
                        </NavLink>
                        <NavLink to="/c2c/content" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">📱</span> Content Creator
                        </NavLink>
                        <NavLink to="/c2c/photographer" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">📷</span> Photographer
                        </NavLink>
                        <NavLink to="/c2c/contact" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">📩</span> Book / Contact
                        </NavLink>
                        <NavLink to="/client-prospector" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                            <span className="nav-icon">🎯</span> Client Prospector
                        </NavLink>
                    </nav>

                    <div className="sidebar-footer">
                        <div className="connection-dot"></div>
                        <span>API Connected</span>
                    </div>
                </aside>

                <main className="main-content">
                    <Routes>
                        {/* Lead pipeline */}
                        <Route path="/" element={<Dashboard stats={stats} />} />
                        <Route path="/agencies" element={<Agencies />} />
                        <Route path="/opportunities" element={<Opportunities />} />
                        <Route path="/outreach" element={<OutreachPage />} />
                        <Route path="/decision-makers" element={<DecisionMakers />} />
                        <Route path="/templates" element={<EmailTemplates />} />
                        <Route path="/export" element={<ExportPage />} />

                        {/* C2C pages */}
                        <Route path="/c2c" element={<C2CServices />} />
                        <Route path="/c2c/videographer" element={<VideographerPage />} />
                        <Route path="/c2c/editor" element={<VideoEditorPage />} />
                        <Route path="/c2c/content" element={<ContentCreatorPage />} />
                        <Route path="/c2c/photographer" element={<PhotographerPage />} />
                        <Route path="/c2c/contact" element={<C2CContact />} />
                        <Route path="/client-prospector" element={<ClientProspector />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    )
}
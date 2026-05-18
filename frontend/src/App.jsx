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
                    </nav>

                    <div className="sidebar-footer">
                        <div className="connection-dot"></div>
                        <span>API Connected</span>
                    </div>
                </aside>

                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard stats={stats} />} />
                        <Route path="/agencies" element={<Agencies />} />
                        <Route path="/opportunities" element={<Opportunities />} />
                        <Route path="/outreach" element={<OutreachPage />} />
                        <Route path="/decision-makers" element={<DecisionMakers />} />
                        <Route path="/templates" element={<EmailTemplates />} />
                        <Route path="/export" element={<ExportPage />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    )
}
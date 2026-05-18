import { useState, useEffect } from "react"
import axios from "axios"
import { API } from "../App"

// ─────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────

const TEMPLATES = [
  {
    id: "intro_video",
    label: "Vidéaste — Première approche",
    icon: "🎬",
    category: "video",
    subject: "Collaboration vidéo — Moenes Bouslimi, Vidéaste",
    body: `Bonjour {{contact_name}},

Je me permets de vous contacter car j'ai découvert {{agency_name}} et j'ai été impressionné par vos projets.

Je suis Moenes Bouslimi, vidéaste et photographe basé à Tunis. Je réalise des contenus vidéo pour des agences, des marques et des productions locales — clips, reportages, contenu social media, reels et tournages corporate.

Je serais ravi de collaborer avec votre équipe sur vos prochaines productions. Mon portfolio est disponible sur demande.

Seriez-vous disponible pour un échange rapide cette semaine ?

Cordialement,
Moenes Bouslimi
Vidéaste & Photographe — Tunis
📞 +216 XX XXX XXX
📧 bouslimi.moenes@gmail.com`,
  },
  {
    id: "intro_photo",
    label: "Photographe — Première approche",
    icon: "📸",
    category: "photo",
    subject: "Collaboration photo — Moenes Bouslimi, Photographe",
    body: `Bonjour {{contact_name}},

J'ai eu l'occasion de découvrir le travail de {{agency_name}} et je souhaitais vous contacter directement.

Je suis Moenes Bouslimi, photographe professionnel basé à Tunis. Je réalise des shootings produit, corporate, événementiel et contenu social media pour des agences et des marques tunisiennes.

Si vous avez des projets photo à venir, je serais heureux de vous soumettre une proposition ou de vous envoyer mon portfolio.

N'hésitez pas à me contacter.

Cordialement,
Moenes Bouslimi
Vidéaste & Photographe — Tunis
📞 +216 XX XXX XXX
📧 bouslimi.moenes@gmail.com`,
  },
  {
    id: "intro_design",
    label: "Graphiste — Première approche",
    icon: "🎨",
    category: "design",
    subject: "Collaboration créative — Moenes Bouslimi, Graphiste & Vidéaste",
    body: `Bonjour {{contact_name}},

Je me présente : Moenes Bouslimi, graphiste et vidéaste freelance basé à Tunis.

J'ai remarqué les projets de {{agency_name}} et je pense que mon profil pourrait correspondre à vos besoins créatifs — identité visuelle, motion design, contenus social media, vidéo et photo.

Je travaille régulièrement avec des agences pour du renfort créatif sur des missions ponctuelles ou des projets long terme.

Auriez-vous quelques minutes pour en discuter ?

Bien cordialement,
Moenes Bouslimi
Graphiste · Vidéaste · Photographe — Tunis
📞 +216 XX XXX XXX
📧 bouslimi.moenes@gmail.com`,
  },
  {
    id: "followup_1",
    label: "Relance — 1 semaine après",
    icon: "🔁",
    category: "followup",
    subject: "Re: Collaboration — Moenes Bouslimi",
    body: `Bonjour {{contact_name}},

Je me permets de revenir vers vous suite à mon message de la semaine dernière concernant une éventuelle collaboration avec {{agency_name}}.

Je comprends que vous êtes certainement très occupé(e), mais je voulais m'assurer que mon message ne s'est pas perdu.

Si vous avez des projets vidéo, photo ou graphisme à venir, je reste disponible et réactif.

Bonne journée,
Moenes Bouslimi
📞 +216 XX XXX XXX`,
  },
  {
    id: "followup_2",
    label: "Relance — 2 semaines après",
    icon: "⏰",
    category: "followup",
    subject: "Dernière relance — Moenes Bouslimi, Vidéaste",
    body: `Bonjour {{contact_name}},

Je vous envoie ce dernier message au sujet d'une collaboration potentielle avec {{agency_name}}.

Si le moment n'est pas opportun, je comprends tout à fait. N'hésitez pas à me recontacter quand un besoin se présente — je reste disponible pour des missions ponctuelles ou régulières.

Mon portfolio et mes disponibilités sont à jour.

Très cordialement,
Moenes Bouslimi
Vidéaste & Photographe — Tunis
📞 +216 XX XXX XXX
📧 bouslimi.moenes@gmail.com`,
  },
  {
    id: "opportunity_reply",
    label: "Réponse à une opportunité",
    icon: "💼",
    category: "opportunity",
    subject: "Candidature — {{job_title}} — Moenes Bouslimi",
    body: `Bonjour {{contact_name}},

J'ai pris connaissance de votre annonce pour un(e) {{job_title}} et je souhaite vous soumettre ma candidature.

Je suis Moenes Bouslimi, vidéaste, photographe et graphiste freelance basé à Tunis, avec une expérience solide dans la production de contenus visuels pour des agences et des marques.

Ce que je peux apporter à {{agency_name}} :
• Tournage et montage vidéo (clips, reels, corporate, reportage)
• Photographie produit, événementielle et corporate
• Motion design et création graphique
• Réactivité et autonomie sur les projets

Je suis disponible pour vous envoyer mon portfolio ou pour un entretien à votre convenance.

Dans l'attente de votre retour,
Moenes Bouslimi
📞 +216 XX XXX XXX
📧 bouslimi.moenes@gmail.com`,
  },
  {
    id: "partnership",
    label: "Partenariat agence — Long terme",
    icon: "🤝",
    category: "partnership",
    subject: "Proposition de partenariat créatif — Moenes Bouslimi",
    body: `Bonjour {{contact_name}},

Je me permets de vous contacter pour vous proposer un partenariat créatif avec {{agency_name}}.

Je suis Moenes Bouslimi, prestataire freelance spécialisé en vidéo, photographie et graphisme, basé à Tunis. Je collabore régulièrement avec des agences comme partenaire créatif externe — intervenant sur les projets qui nécessitent un renfort ou une expertise spécifique.

L'avantage pour votre agence :
• Disponibilité flexible selon vos besoins
• Pas de charges fixes — vous faites appel à moi selon les projets
• Réactivité et livraison dans les délais
• Tarifs préférentiels pour les partenariats réguliers

Si cette approche vous intéresse, je serais ravi d'en discuter autour d'un café ou par téléphone.

Cordialement,
Moenes Bouslimi
Vidéaste · Photographe · Graphiste
📞 +216 XX XXX XXX
📧 bouslimi.moenes@gmail.com`,
  },
]

const CATEGORY_COLORS = {
  video:       { bg: "#7c3aed22", border: "#7c3aed44", text: "#a78bfa" },
  photo:       { bg: "#0ea5e922", border: "#0ea5e944", text: "#38bdf8" },
  design:      { bg: "#f59e0b22", border: "#f59e0b44", text: "#fbbf24" },
  followup:    { bg: "#10b98122", border: "#10b98144", text: "#34d399" },
  opportunity: { bg: "#ef444422", border: "#ef444444", text: "#f87171" },
  partnership: { bg: "#ec489922", border: "#ec489944", text: "#f472b6" },
}

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────

export default function EmailTemplates() {
  const [selected, setSelected]         = useState(TEMPLATES[0])
  const [agencyName, setAgencyName]     = useState("")
  const [contactName, setContactName]   = useState("")
  const [jobTitle, setJobTitle]         = useState("")
  const [copied, setCopied]             = useState(false)
  const [copiedSubject, setCopiedSubject] = useState(false)
  const [agencies, setAgencies]         = useState([])
  const [agencySuggest, setAgencySuggest] = useState([])
  const [showSuggest, setShowSuggest]   = useState(false)
  const [savedToOutreach, setSavedToOutreach] = useState(false)

  useEffect(() => {
    axios.get(`${API}/agencies/`).then(r => setAgencies(r.data)).catch(() => {})
  }, [])

  // Agency autocomplete
  const handleAgencyInput = (val) => {
    setAgencyName(val)
    setSavedToOutreach(false)
    if (val.length > 1) {
      const matches = agencies.filter(a =>
        a.name?.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5)
      setAgencySuggest(matches)
      setShowSuggest(matches.length > 0)
    } else {
      setShowSuggest(false)
    }
  }

  const selectAgency = (agency) => {
    setAgencyName(agency.name)
    // Auto-fill contact name if we have one
    if (agency.contact_name) setContactName(agency.contact_name)
    setShowSuggest(false)
  }

  // Build the final email body with variables replaced
  const buildEmail = () => {
    return selected.body
      .replace(/{{agency_name}}/g, agencyName || "[Nom de l'agence]")
      .replace(/{{contact_name}}/g, contactName || "[Nom du contact]")
      .replace(/{{job_title}}/g, jobTitle || "[Intitulé du poste]")
  }

  const buildSubject = () => {
    return selected.subject
      .replace(/{{agency_name}}/g, agencyName || "[Nom de l'agence]")
      .replace(/{{contact_name}}/g, contactName || "[Nom du contact]")
      .replace(/{{job_title}}/g, jobTitle || "[Intitulé du poste]")
  }

  const copyBody = () => {
    navigator.clipboard.writeText(buildEmail())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copySubject = () => {
    navigator.clipboard.writeText(buildSubject())
    setCopiedSubject(true)
    setTimeout(() => setCopiedSubject(false), 2000)
  }

  const openMailto = () => {
    const subject = encodeURIComponent(buildSubject())
    const body = encodeURIComponent(buildEmail())
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const saveToOutreach = async () => {
    if (!agencyName) return
    try {
      // Find agency id
      const agency = agencies.find(a => a.name?.toLowerCase() === agencyName.toLowerCase())
      await axios.post(`${API}/outreach/`, {
        agency_id: agency?.id || null,
        agency_name_manual: agency ? null : agencyName,
        contact_name: contactName || null,
        channel: "email",
        subject: buildSubject(),
        message: buildEmail(),
        status: "draft",
        template_used: selected.id,
      })
      setSavedToOutreach(true)
      setTimeout(() => setSavedToOutreach(false), 3000)
    } catch (e) {
      console.error(e)
    }
  }

  const colors = CATEGORY_COLORS[selected.category] || CATEGORY_COLORS.video

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Email Templates</div>
          <div className="page-sub">{TEMPLATES.length} templates prêts à envoyer</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px", alignItems: "start" }}>

        {/* ── Left: Template List ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", paddingLeft: "4px" }}>
            Choisir un template
          </div>
          {TEMPLATES.map(t => {
            const c = CATEGORY_COLORS[t.category]
            const isActive = selected.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => { setSelected(t); setSavedToOutreach(false) }}
                style={{
                  background: isActive ? c.bg : "var(--bg2)",
                  border: `1px solid ${isActive ? c.border : "var(--border)"}`,
                  borderRadius: "10px",
                  padding: "12px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  color: "var(--text)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px" }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: isActive ? 700 : 500, color: isActive ? c.text : "var(--text)" }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px", fontFamily: "var(--mono)" }}>
                      {t.category}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Right: Editor + Preview ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Variables */}
          <div className="card" style={{ padding: "18px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "14px", color: "var(--text)" }}>
              ✏️ Personnaliser
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

              {/* Agency name with autocomplete */}
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "5px" }}>
                  Nom de l'agence
                </label>
                <input
                  value={agencyName}
                  onChange={e => handleAgencyInput(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                  placeholder="Ex: Publicis Tunis"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
                {showSuggest && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                    background: "var(--bg2)", border: "1px solid var(--border)",
                    borderRadius: "8px", marginTop: "4px", overflow: "hidden",
                  }}>
                    {agencySuggest.map(a => (
                      <div
                        key={a.id}
                        onMouseDown={() => selectAgency(a)}
                        style={{ padding: "8px 12px", fontSize: "12px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                      >
                        {a.name}
                        {a.zone && <span style={{ color: "var(--muted)", marginLeft: "6px", fontSize: "11px" }}>{a.zone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact name */}
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "5px" }}>
                  Nom du contact
                </label>
                <input
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Ex: Mohamed Ben Ali"
                />
              </div>

              {/* Job title (only for opportunity template) */}
              {selected.body.includes("{{job_title}}") && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "5px" }}>
                    Intitulé du poste
                  </label>
                  <input
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="Ex: Vidéaste freelance"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="card" style={{ padding: "18px", background: `linear-gradient(135deg, var(--bg2) 0%, ${colors.bg} 100%)`, border: `1px solid ${colors.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: colors.text }}>
                {selected.icon} {selected.label}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: "11px", padding: "5px 10px" }}
                  onClick={copySubject}
                >
                  {copiedSubject ? "✅ Copié!" : "📋 Objet"}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: "11px", padding: "5px 10px" }}
                  onClick={copyBody}
                >
                  {copied ? "✅ Copié!" : "📋 Corps"}
                </button>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: "11px", padding: "5px 12px" }}
                  onClick={openMailto}
                >
                  ✉️ Ouvrir
                </button>
              </div>
            </div>

            {/* Subject line */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                Objet
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, padding: "8px 12px", background: "var(--bg3)", borderRadius: "6px", border: "1px solid var(--border)" }}>
                {buildSubject()}
              </div>
            </div>

            {/* Body */}
            <div>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                Corps du message
              </div>
              <pre style={{
                fontSize: "12px",
                lineHeight: "1.7",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                padding: "14px",
                background: "var(--bg3)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontFamily: "inherit",
                color: "var(--text)",
                maxHeight: "400px",
                overflowY: "auto",
              }}>
                {buildEmail()}
              </pre>
            </div>

            {/* Save to outreach */}
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: "11px", padding: "6px 14px" }}
                onClick={saveToOutreach}
                disabled={!agencyName}
              >
                {savedToOutreach ? "✅ Sauvegardé dans Outreach" : "💾 Sauvegarder dans Outreach"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

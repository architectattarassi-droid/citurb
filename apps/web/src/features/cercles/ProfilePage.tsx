import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME } from "./theme";
import { cerclesApi, invitationsApi, ProProfile, InviteResultItem, CercleListItem } from "./api";

const METIER_LABELS: Record<string, string> = {
  ARCHITECTE: "Architecte", BET_STRUCTURE: "BET Structure", BET_FLUIDES: "BET Fluides", BET_VRD: "BET VRD",
  TOPOGRAPHE: "Topographe", GEOMETRE: "Géomètre", CONTROLE_TECHNIQUE: "Contrôle technique", LABORATOIRE: "Laboratoire",
  ENTREPRISE_GO: "Entreprise GO", ENTREPRISE_SECOND_OEUVRE: "Second œuvre", FOURNISSEUR_MATERIAUX: "Fournisseur",
  PROMOTEUR: "Promoteur", MOA_PUBLIQUE: "MOA publique", MOA_PRIVEE: "MOA privée", ARTISAN_QUALIFIE: "Artisan",
};

export default function ProfilePage() {
  const { userIdOrId } = useParams<{ userIdOrId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [myCercles, setMyCercles] = useState<CercleListItem[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCercleId, setInviteCercleId] = useState<string>("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResults, setInviteResults] = useState<InviteResultItem[] | null>(null);

  useEffect(() => {
    // Récupère le userId courant (pour détecter "c'est mon profil")
    fetch(`${(import.meta as any).env?.VITE_API_URL || "http://localhost:4000"}/auth/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("citurbarea.token") || ""}` },
    })
      .then((r) => r.json())
      .then((j) => setMeId(j?.user?.userId || j?.user?.id || null))
      .catch(() => {});
    cerclesApi.list().then((r) => setMyCercles(r.data.filter((c) => c.members?.[0]?.role === "OWNER" || c.members?.[0]?.role === "MODERATOR"))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userIdOrId) return;
    cerclesApi.publicProfile(userIdOrId)
      .then(r => setProfile(r.data))
      .catch(e => setErr(e?.message || "Profil introuvable"));
  }, [userIdOrId]);

  const isMine = !!(meId && profile && profile.userId === meId);

  const sendInvitations = async () => {
    if (!inviteCercleId) { alert("Sélectionne un cercle"); return; }
    const emails = inviteEmails.split(/[\s,;\n]+/).map(s => s.trim()).filter(s => s.includes("@"));
    if (emails.length === 0) return;
    setInviteBusy(true);
    try {
      const r = await invitationsApi.inviteByEmail(inviteCercleId, emails, inviteMsg.trim() || undefined);
      setInviteResults(r.data.results);
      setInviteEmails("");
      setInviteMsg("");
    } catch (e: any) {
      alert("Erreur : " + (e?.message || "inconnue"));
    } finally {
      setInviteBusy(false);
    }
  };

  const sendConnect = async () => {
    if (!profile) return;
    setConnecting(true);
    try {
      await cerclesApi.sendConnection(profile.userId, connectMessage || undefined);
      alert("Demande envoyée !");
      setConnectMessage("");
    } catch (e: any) {
      alert("Erreur : " + (e?.message || ""));
    } finally { setConnecting(false); }
  };

  if (err) return <CerclesShell><div style={{ padding: 48, color: CC_THEME.danger }}>{err}</div></CerclesShell>;
  if (!profile) return <CerclesShell><div style={{ padding: 48, color: CC_THEME.inkMid, fontStyle: "italic" }}>Chargement…</div></CerclesShell>;

  return (
    <CerclesShell>
      <div style={S.root}>
        <div style={S.cover} />

        <div style={S.headerCard}>
          <div style={{ ...S.avatar, background: profile.isVerified ? CC_THEME.successBg : CC_THEME.orSoft }}>
            {(profile.displayName || "?").slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h1 style={S.name}>{profile.displayName}</h1>
              {profile.isVerified && <span title="Vérifié" style={{ color: CC_THEME.success, fontSize: 18 }}>✓</span>}
            </div>
            {profile.title && <div style={S.title}>{profile.title}</div>}
            <div style={S.badges}>
              <span style={S.metierBadge}>{METIER_LABELS[profile.metier] || profile.metier}</span>
              {profile.classeBTP && <span style={S.classBadge}>{profile.classeBTP}</span>}
              {profile.villePrincipale && <span style={S.locTag}>📍 {profile.villePrincipale}</span>}
            </div>
          </div>
          <div style={S.actions}>
            {isMine ? (
              <button onClick={() => { setShowInvite(true); if (myCercles[0]) setInviteCercleId(myCercles[0].id); }} style={S.btnConnect}>
                ✉ Inviter des architectes
              </button>
            ) : (
              <button onClick={sendConnect} disabled={connecting} style={S.btnConnect}>
                {connecting ? "Envoi…" : "+ Se connecter"}
              </button>
            )}
          </div>
        </div>

        {showInvite && (
          <div style={{ ...S.section, margin: "16px 36px 0", padding: 20 }}>
            <div style={S.sectionEyebrow}>Inviter par email</div>
            {myCercles.length === 0 ? (
              <div style={{ color: CC_THEME.inkMid, fontSize: 13, fontStyle: "italic" }}>
                Tu dois être modérateur d'au moins un cercle pour inviter. Crée-en un d'abord.
              </div>
            ) : (
              <>
                <label style={{ display: "block", fontSize: 11, color: CC_THEME.inkMid, marginBottom: 6, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>Cercle d'accueil</label>
                <select value={inviteCercleId} onChange={(e) => setInviteCercleId(e.target.value)} style={{ width: "100%", padding: 10, border: `1px solid ${CC_THEME.border}`, borderRadius: 4, marginBottom: 12, fontSize: 14, background: CC_THEME.bgRaised }}>
                  {myCercles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <textarea
                  placeholder="Emails (séparés par virgule, espace ou nouvelle ligne)"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  style={{ width: "100%", padding: 10, border: `1px solid ${CC_THEME.border}`, borderRadius: 4, fontSize: 14, fontFamily: "inherit", minHeight: 70, marginBottom: 8, boxSizing: "border-box" as const }}
                />
                <textarea
                  placeholder="Mot d'accompagnement (optionnel)"
                  value={inviteMsg}
                  onChange={(e) => setInviteMsg(e.target.value)}
                  style={{ width: "100%", padding: 10, border: `1px solid ${CC_THEME.border}`, borderRadius: 4, fontSize: 14, fontFamily: "inherit", minHeight: 50, marginBottom: 10, boxSizing: "border-box" as const }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button onClick={() => { setShowInvite(false); setInviteResults(null); }} style={{ background: "transparent", border: `1px solid ${CC_THEME.border}`, padding: "8px 16px", borderRadius: 4, color: CC_THEME.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Fermer</button>
                  <button onClick={sendInvitations} disabled={inviteBusy || !inviteEmails.trim()} style={{ background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "8px 18px", borderRadius: 4, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                    {inviteBusy ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
                {inviteResults && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${CC_THEME.border}` }}>
                    {inviteResults.map((r, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13 }}>
                        <span style={{ color: r.status === "sent" ? CC_THEME.success : r.status === "link" ? CC_THEME.or : r.status === "already-member" ? CC_THEME.inkMid : CC_THEME.danger, minWidth: 90, fontSize: 11, fontWeight: 600 }}>
                          {r.status === "sent" ? "✓ envoyé" : r.status === "link" ? "🔗 lien" : r.status === "already-member" ? "membre" : "✗ échec"}
                        </span>
                        <span style={{ flex: 1 }}>{r.email}</span>
                        {r.link && r.status === "link" && (
                          <button onClick={() => { navigator.clipboard?.writeText(r.link).catch(() => window.prompt("Copiez :", r.link)); }} style={{ background: "transparent", border: `1px solid ${CC_THEME.border}`, padding: "3px 10px", borderRadius: 3, fontSize: 11, cursor: "pointer", color: CC_THEME.inkMid }}>
                            Copier le lien
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div style={S.layout}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {profile.bio && (
              <Section title="À propos">
                <div style={S.bio}>{profile.bio}</div>
              </Section>
            )}

            {profile.specialites.length > 0 && (
              <Section title="Spécialités">
                <div style={S.tagList}>
                  {profile.specialites.map(s => <span key={s} style={S.specialiteTag}>{s}</span>)}
                </div>
              </Section>
            )}

            {profile.agrements.length > 0 && (
              <Section title="Agréments">
                <ul style={S.agrementList}>
                  {profile.agrements.map(a => <li key={a} style={S.agrementItem}>📜 {a}</li>)}
                </ul>
              </Section>
            )}

            {profile.regions.length > 0 && (
              <Section title="Régions d'intervention">
                <div style={S.tagList}>
                  {profile.regions.map(r => <span key={r} style={S.regionTag}>🗺 {r}</span>)}
                </div>
              </Section>
            )}
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Section title="Contact">
              <div style={S.contactList}>
                {profile.emailPublic && <a href={`mailto:${profile.emailPublic}`} style={S.contactLink}>✉ {profile.emailPublic}</a>}
                {profile.phonePublic && <a href={`tel:${profile.phonePublic}`} style={S.contactLink}>📞 {profile.phonePublic}</a>}
                {profile.websiteUrl && <a href={profile.websiteUrl} target="_blank" rel="noreferrer" style={S.contactLink}>🌐 Site web</a>}
                {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={S.contactLink}>💼 LinkedIn</a>}
                {!profile.emailPublic && !profile.phonePublic && !profile.websiteUrl && !profile.linkedinUrl && (
                  <div style={{ color: CC_THEME.inkMuted, fontStyle: "italic", fontSize: 12 }}>Aucun contact public.</div>
                )}
              </div>
            </Section>

            <Section title="Statistiques">
              <div style={S.statRow}>
                <span style={S.statLabel}>Connexions</span>
                <span style={S.statValue}>{profile.connectionsCount}</span>
              </div>
            </Section>
          </aside>
        </div>
      </div>
    </CerclesShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.section}>
      <div style={S.sectionEyebrow}>{title}</div>
      {children}
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: 0, maxWidth: 1100, margin: "0 auto" },
  cover: { height: 140, background: `linear-gradient(135deg, ${CC_THEME.bgDeep} 0%, ${CC_THEME.navyHover} 100%)`, position: "relative" },

  headerCard: { display: "flex", alignItems: "flex-end", gap: 20, padding: "0 36px 24px", marginTop: -52, position: "relative" },
  avatar: { width: 96, height: 96, borderRadius: "50%", color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 38, fontWeight: 700, border: `4px solid ${CC_THEME.bg}`, flexShrink: 0 },
  name: { margin: 0, fontFamily: CC_THEME.fontDisplay, fontSize: 28, color: CC_THEME.navy, fontWeight: 600, letterSpacing: "-0.01em" },
  title: { color: CC_THEME.inkMid, fontSize: 14, fontStyle: "italic", marginBottom: 6 },
  badges: { display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 8 },
  metierBadge: { fontSize: 11.5, color: CC_THEME.or, background: CC_THEME.orSoft + "70", padding: "4px 10px", borderRadius: 4, letterSpacing: "0.04em", fontWeight: 600 },
  classBadge: { fontSize: 11.5, color: CC_THEME.success, background: CC_THEME.successBg, padding: "4px 10px", borderRadius: 4, fontWeight: 600 },
  locTag: { fontSize: 11.5, color: CC_THEME.inkMid },
  actions: { display: "flex", gap: 8 },
  btnConnect: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "10px 18px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" },

  layout: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, padding: "20px 36px 60px" },

  section: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: "18px 20px", boxShadow: CC_THEME.shadowSoft },
  sectionEyebrow: { fontSize: 9.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600, marginBottom: 10, paddingBottom: 6, borderBottom: `1px dotted ${CC_THEME.border}` },

  bio: { fontSize: 13.5, color: CC_THEME.ink, lineHeight: 1.65, whiteSpace: "pre-wrap" as const },
  tagList: { display: "flex", flexWrap: "wrap" as const, gap: 6 },
  specialiteTag: { fontSize: 11.5, color: CC_THEME.navy, background: CC_THEME.bgSoft, padding: "4px 10px", borderRadius: 4, letterSpacing: "0.02em" },
  regionTag: { fontSize: 11.5, color: CC_THEME.inkMid, background: CC_THEME.bgSoft, padding: "4px 10px", borderRadius: 4 },

  agrementList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 },
  agrementItem: { fontSize: 12.5, color: CC_THEME.ink, padding: "6px 0", borderBottom: `1px dotted ${CC_THEME.borderSoft}` },

  contactList: { display: "flex", flexDirection: "column", gap: 8 },
  contactLink: { fontSize: 12.5, color: CC_THEME.navy, textDecoration: "none", padding: "6px 0", borderBottom: `1px solid ${CC_THEME.borderSoft}` },

  statRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  statLabel: { color: CC_THEME.inkMid, fontSize: 12.5 },
  statValue: { fontFamily: CC_THEME.fontDisplay, fontSize: 22, color: CC_THEME.navy, fontWeight: 600 },
};

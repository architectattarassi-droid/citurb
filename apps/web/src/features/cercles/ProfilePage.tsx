/**
 * ProfilePage — Sprint G3 (fiche pro complète)
 *
 * Affiche la fiche détaillée d'un architecte/ingénieur/entreprise :
 *  - Header : avatar/cover + nom/titre/métier/badges
 *  - À propos (bio), Cabinet, Expérience, Formations, Certifications, Prix
 *  - Projets phares (portfolio avec images)
 *  - Tarifs et disponibilité
 *  - Langues, Spécialités, Agréments, Régions d'intervention
 *  - Cercles rejoints, Posts récents, Événements hébergés
 *  - Contact (email, tel, web, LinkedIn, Behance, Instagram, Pinterest)
 *
 * Si c'est ton propre profil : bouton "✎ Éditer ma fiche" + "✉ Inviter".
 * Sinon : bouton "+ Se connecter".
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME } from "./theme";
import {
  cerclesApi, invitationsApi,
  ProProfile, InviteResultItem, CercleListItem,
  UserPost, UserCercleMembership, UserRoom,
  FormationEntry, ExperiencePhare,
} from "./api";
import { apiBase } from "../../tomes/tome4/apiClient";

/** Préfixe avatarUrl si c'est un chemin relatif /uploads/ → URL absolue API */
function resolveAvatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/")) return `${apiBase()}${url}`;
  return url;
}

const METIER_LABELS: Record<string, string> = {
  ARCHITECTE: "Architecte", BET_STRUCTURE: "BET Structure", BET_FLUIDES: "BET Fluides", BET_VRD: "BET VRD",
  TOPOGRAPHE: "Topographe", GEOMETRE: "Géomètre", CONTROLE_TECHNIQUE: "Contrôle technique", LABORATOIRE: "Laboratoire",
  ENTREPRISE_GO: "Entreprise GO", ENTREPRISE_SECOND_OEUVRE: "Second œuvre", FOURNISSEUR_MATERIAUX: "Fournisseur",
  PROMOTEUR: "Promoteur", MOA_PUBLIQUE: "MOA publique", MOA_PRIVEE: "MOA privée", ARTISAN_QUALIFIE: "Artisan",
};

const CABINET_STATUS_LABELS: Record<string, string> = {
  LIBERAL: "Libéral", ASSOCIE: "Associé", SALARIE: "Salarié", FONCTIONNAIRE: "Fonctionnaire", INDEPENDANT: "Indépendant",
};

const LANGUE_LABELS: Record<string, string> = {
  FR: "Français", AR: "العربية", EN: "English", BERBERE: "Tamaziɣt", ES: "Español", IT: "Italiano", DE: "Deutsch",
};

const DISPO_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  DISPONIBLE: { label: "● Disponible", color: CC_THEME.success, bg: CC_THEME.successBg },
  OCCUPE: { label: "● Occupé", color: CC_THEME.warn, bg: CC_THEME.warnBg },
  INDISPONIBLE: { label: "● Indisponible", color: CC_THEME.danger, bg: CC_THEME.dangerBg },
};

type Tab = "apercu" | "cercles" | "posts" | "evenements";

export default function ProfilePage() {
  const { userIdOrId } = useParams<{ userIdOrId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [myCercles, setMyCercles] = useState<CercleListItem[]>([]);

  // Données dérivées
  const [userCercles, setUserCercles] = useState<UserCercleMembership[]>([]);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);

  // Invitations modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCercleId, setInviteCercleId] = useState<string>("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResults, setInviteResults] = useState<InviteResultItem[] | null>(null);

  const [tab, setTab] = useState<Tab>("apercu");

  useEffect(() => {
    fetch(`${(import.meta as any).env?.VITE_API_URL || "http://localhost:4000"}/auth/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("citurbarea.token") || ""}` },
    })
      .then((r) => r.json())
      .then((j) => setMeId(j?.user?.userId || j?.user?.id || null))
      .catch(() => {});
    cerclesApi.list().then((r) =>
      setMyCercles(r.data.filter((c) => c.members?.[0]?.role === "OWNER" || c.members?.[0]?.role === "MODERATOR")),
    ).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userIdOrId) return;
    cerclesApi.publicProfile(userIdOrId)
      .then((r) => setProfile(r.data))
      .catch((e) => setErr(e?.message || "Profil introuvable"));
    cerclesApi.profileCercles(userIdOrId).then((r) => setUserCercles(r.data)).catch(() => {});
    cerclesApi.profilePosts(userIdOrId).then((r) => setUserPosts(r.data)).catch(() => {});
    cerclesApi.profileRooms(userIdOrId).then((r) => setUserRooms(r.data)).catch(() => {});
  }, [userIdOrId]);

  const isMine = !!(meId && profile && profile.userId === meId);

  const sendConnect = async () => {
    if (!profile) return;
    setConnecting(true);
    try {
      await cerclesApi.sendConnection(profile.userId);
      alert("Demande de connexion envoyée !");
    } catch (e: any) {
      alert("Erreur : " + (e?.message || ""));
    } finally { setConnecting(false); }
  };

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
    } finally { setInviteBusy(false); }
  };

  if (err) return <CerclesShell><div style={{ padding: 48, color: CC_THEME.danger }}>{err}</div></CerclesShell>;
  if (!profile) return <CerclesShell><div style={{ padding: 48, color: CC_THEME.inkMid, fontStyle: "italic" }}>Chargement…</div></CerclesShell>;

  const dispo = profile.disponibilite || "DISPONIBLE";
  const dispoBadge = DISPO_BADGE[dispo] || DISPO_BADGE.DISPONIBLE;

  return (
    <CerclesShell>
      <div style={S.root}>
        {/* Cover + Avatar */}
        <div style={{
          ...S.cover,
          backgroundImage: profile.coverUrl ? `url(${profile.coverUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }} />

        <div style={S.headerCard}>
          <div style={{
            ...S.avatar,
            background: profile.isVerified ? CC_THEME.successBg : CC_THEME.orSoft,
            backgroundImage: profile.avatarUrl ? `url(${resolveAvatarUrl(profile.avatarUrl)})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}>
            {!profile.avatarUrl && (profile.displayName || "?").slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h1 style={S.name}>{profile.displayName}</h1>
              {profile.isVerified && <span title="Profil vérifié" style={{ color: CC_THEME.success, fontSize: 18 }}>✓</span>}
              <span style={{ ...S.dispoBadge, color: dispoBadge.color, background: dispoBadge.bg }}>
                {dispoBadge.label}
              </span>
            </div>
            {profile.title && <div style={S.title}>{profile.title}</div>}
            <div style={S.badges}>
              <span style={S.metierBadge}>{METIER_LABELS[profile.metier] || profile.metier}</span>
              {profile.classeBTP && <span style={S.classBadge}>Classe {profile.classeBTP}</span>}
              {profile.cabinetStatus && CABINET_STATUS_LABELS[profile.cabinetStatus] && (
                <span style={S.statusBadge}>{CABINET_STATUS_LABELS[profile.cabinetStatus]}</span>
              )}
              {profile.villePrincipale && <span style={S.locTag}>📍 {profile.villePrincipale}</span>}
              {profile.yearsExperience && <span style={S.locTag}>🎓 {profile.yearsExperience} ans d'exp.</span>}
            </div>
          </div>
          <div style={S.actions}>
            {isMine ? (
              <>
                <button onClick={() => navigate("/cercles/me/edit")} style={S.btnConnect}>✎ Éditer ma fiche</button>
                <button onClick={() => { setShowInvite(true); if (myCercles[0]) setInviteCercleId(myCercles[0].id); }} style={S.btnGhostAction}>✉ Inviter</button>
              </>
            ) : (
              <button onClick={sendConnect} disabled={connecting} style={S.btnConnect}>
                {connecting ? "Envoi…" : "+ Se connecter"}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <nav style={S.tabs}>
          <TabBtn active={tab === "apercu"} onClick={() => setTab("apercu")}>Aperçu</TabBtn>
          <TabBtn active={tab === "cercles"} onClick={() => setTab("cercles")}>
            Cercles ({userCercles.length})
          </TabBtn>
          <TabBtn active={tab === "posts"} onClick={() => setTab("posts")}>
            Posts ({userPosts.length})
          </TabBtn>
          <TabBtn active={tab === "evenements"} onClick={() => setTab("evenements")}>
            Événements ({userRooms.length})
          </TabBtn>
        </nav>

        {/* Modal invitations */}
        {showInvite && (
          <InviteModal
            myCercles={myCercles}
            inviteCercleId={inviteCercleId}
            setInviteCercleId={setInviteCercleId}
            inviteEmails={inviteEmails}
            setInviteEmails={setInviteEmails}
            inviteMsg={inviteMsg}
            setInviteMsg={setInviteMsg}
            inviteBusy={inviteBusy}
            inviteResults={inviteResults}
            onSubmit={sendInvitations}
            onClose={() => { setShowInvite(false); setInviteResults(null); }}
          />
        )}

        {/* Content per tab */}
        <div style={S.layout}>
          {tab === "apercu" && <ApercuTab profile={profile} />}
          {tab === "cercles" && <CerclesTab memberships={userCercles} />}
          {tab === "posts" && <PostsTab posts={userPosts} />}
          {tab === "evenements" && <RoomsTab rooms={userRooms} />}
        </div>
      </div>
    </CerclesShell>
  );
}

// ─── Onglet Aperçu ────────────────────────────────────────────────

function ApercuTab({ profile }: { profile: ProProfile }) {
  return (
    <div style={S.layoutGrid}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {profile.bio && (
          <Section title="À propos">
            <div style={S.bio}>{profile.bio}</div>
          </Section>
        )}

        {(profile.cabinetName || profile.cabinetSize) && (
          <Section title="Cabinet / Structure">
            {profile.cabinetName && (
              <div style={S.cabinetCard}>
                <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 18, color: CC_THEME.navy }}>
                  {profile.cabinetName}
                </div>
                <div style={{ fontSize: 13, color: CC_THEME.inkMid, marginTop: 4 }}>
                  {profile.cabinetStatus && CABINET_STATUS_LABELS[profile.cabinetStatus]}
                  {profile.cabinetSize ? ` · ${profile.cabinetSize} collaborateur${profile.cabinetSize > 1 ? "s" : ""}` : ""}
                  {profile.yearsExperience ? ` · ${profile.yearsExperience} ans d'expérience` : ""}
                </div>
                {profile.cnoaNumero && (
                  <div style={{ fontSize: 12, color: CC_THEME.or, marginTop: 6 }}>
                    CNOA : {profile.cnoaNumero}
                  </div>
                )}
              </div>
            )}
          </Section>
        )}

        {profile.experiencesPhares && profile.experiencesPhares.length > 0 && (
          <Section title="Projets phares">
            {profile.experiencesPhares.map((p, i) => <ProjectCard key={i} p={p} />)}
          </Section>
        )}

        {profile.formations && profile.formations.length > 0 && (
          <Section title="Formations">
            {profile.formations.map((f, i) => (
              <div key={i} style={S.formationRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.diplome}</div>
                  <div style={{ fontSize: 12, color: CC_THEME.inkMid }}>{f.ecole}{f.ville ? ` · ${f.ville}` : ""}</div>
                </div>
                {f.annee && <div style={{ color: CC_THEME.or, fontSize: 13, fontWeight: 600 }}>{f.annee}</div>}
              </div>
            ))}
          </Section>
        )}

        {profile.certifications.length > 0 && (
          <Section title="Certifications">
            <ul style={S.agrementList}>
              {profile.certifications.map((c) => <li key={c} style={S.agrementItem}>🎖 {c}</li>)}
            </ul>
          </Section>
        )}

        {profile.prix.length > 0 && (
          <Section title="Prix & distinctions">
            <ul style={S.agrementList}>
              {profile.prix.map((p) => <li key={p} style={S.agrementItem}>🏆 {p}</li>)}
            </ul>
          </Section>
        )}

        {profile.specialites.length > 0 && (
          <Section title="Spécialités">
            <div style={S.tagList}>
              {profile.specialites.map((s) => <span key={s} style={S.specialiteTag}>{s}</span>)}
            </div>
          </Section>
        )}

        {profile.agrements.length > 0 && (
          <Section title="Agréments officiels">
            <ul style={S.agrementList}>
              {profile.agrements.map((a) => <li key={a} style={S.agrementItem}>📜 {a}</li>)}
            </ul>
          </Section>
        )}

        {profile.regions.length > 0 && (
          <Section title="Régions d'intervention">
            <div style={S.tagList}>
              {profile.regions.map((r) => <span key={r} style={S.regionTag}>🗺 {r}</span>)}
            </div>
          </Section>
        )}
      </div>

      <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(profile.tarifsRange || profile.disponibilite || profile.disponibleAPartir) && (
          <Section title="Tarifs & Disponibilité">
            {profile.tarifsRange && (
              <div style={S.contactRow}>
                <span style={S.iconBadge}>💰</span>
                <span style={{ fontSize: 13 }}>{profile.tarifsRange}</span>
              </div>
            )}
            {profile.disponibleAPartir && (
              <div style={S.contactRow}>
                <span style={S.iconBadge}>📅</span>
                <span style={{ fontSize: 13 }}>
                  Disponible à partir du {new Date(profile.disponibleAPartir).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}
          </Section>
        )}

        <Section title="Contact">
          <div style={S.contactList}>
            {profile.emailPublic && <a href={`mailto:${profile.emailPublic}`} style={S.contactLink}>✉ {profile.emailPublic}</a>}
            {profile.phonePublic && <a href={`tel:${profile.phonePublic}`} style={S.contactLink}>📞 {profile.phonePublic}</a>}
            {profile.websiteUrl && <a href={profile.websiteUrl} target="_blank" rel="noreferrer" style={S.contactLink}>🌐 Site web</a>}
            {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={S.contactLink}>💼 LinkedIn</a>}
            {profile.behanceUrl && <a href={profile.behanceUrl} target="_blank" rel="noreferrer" style={S.contactLink}>🎨 Behance</a>}
            {profile.instagramUrl && <a href={profile.instagramUrl} target="_blank" rel="noreferrer" style={S.contactLink}>📷 Instagram</a>}
            {profile.pinterestUrl && <a href={profile.pinterestUrl} target="_blank" rel="noreferrer" style={S.contactLink}>📌 Pinterest</a>}
            {!profile.emailPublic && !profile.phonePublic && !profile.websiteUrl && !profile.linkedinUrl && !profile.behanceUrl && !profile.instagramUrl && !profile.pinterestUrl && (
              <div style={{ color: CC_THEME.inkMuted, fontStyle: "italic", fontSize: 12 }}>Aucun contact public.</div>
            )}
          </div>
        </Section>

        {profile.langues.length > 0 && (
          <Section title="Langues parlées">
            <div style={S.tagList}>
              {profile.langues.map((l) => <span key={l} style={S.langueTag}>{LANGUE_LABELS[l] || l}</span>)}
            </div>
          </Section>
        )}

        <Section title="Statistiques">
          <div style={S.statRow}><span style={S.statLabel}>Connexions</span><span style={S.statValue}>{profile.connectionsCount}</span></div>
          <div style={S.statRow}><span style={S.statLabel}>Vues profil</span><span style={S.statValue}>{profile.profileViews}</span></div>
          <div style={S.statRow}><span style={S.statLabel}>Projets</span><span style={S.statValue}>{profile.projectsCount}</span></div>
        </Section>
      </aside>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.section}>
      <div style={S.sectionEyebrow}>{title}</div>
      {children}
    </section>
  );
}

function ProjectCard({ p }: { p: ExperiencePhare }) {
  return (
    <div style={S.projectCard}>
      <div style={S.projectHead}>
        <div>
          <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 16, color: CC_THEME.navy, fontWeight: 600 }}>
            {p.titre}
          </div>
          <div style={{ fontSize: 12, color: CC_THEME.inkMid, marginTop: 2 }}>
            {p.lieu}{p.anneeLivraison ? ` · ${p.anneeLivraison}` : ""}{p.surface ? ` · ${p.surface}` : ""}
          </div>
          {p.role && <div style={{ fontSize: 12, color: CC_THEME.or, marginTop: 2 }}>{p.role}</div>}
        </div>
      </div>
      {p.description && <div style={{ fontSize: 13, color: CC_THEME.ink, marginTop: 8, lineHeight: 1.55 }}>{p.description}</div>}
      {p.imageUrls && p.imageUrls.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {p.imageUrls.slice(0, 4).map((url, i) => (
            <img key={i} src={url} alt="" style={{ width: 110, height: 78, objectFit: "cover", borderRadius: 4, border: `1px solid ${CC_THEME.border}` }} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent",
      border: 0,
      padding: "12px 18px",
      fontSize: 13,
      fontWeight: active ? 600 : 500,
      color: active ? CC_THEME.navy : CC_THEME.inkMid,
      borderBottom: `2px solid ${active ? CC_THEME.or : "transparent"}`,
      cursor: "pointer",
      fontFamily: "inherit",
      letterSpacing: "0.02em",
    }}>{children}</button>
  );
}

function CerclesTab({ memberships }: { memberships: UserCercleMembership[] }) {
  if (memberships.length === 0) return <div style={S.emptyTab}>Aucun cercle rejoint.</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, padding: "20px 36px 60px" }}>
      {memberships.map((m) => (
        <Link key={m.id} to={`/cercles/${m.cercle.slug}`} style={S.cercleCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ ...S.postAvatarSm, background: CC_THEME.orSoft }}>
              {m.cercle.name.slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: CC_THEME.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.cercle.name}
              </div>
              <div style={{ fontSize: 11, color: CC_THEME.inkMuted }}>
                {m.cercle._count?.members ?? 0} membres · rôle {m.role}
              </div>
            </div>
          </div>
          {m.cercle.description && (
            <div style={{ fontSize: 12, color: CC_THEME.inkMid, lineHeight: 1.45 }}>
              {m.cercle.description.slice(0, 100)}{m.cercle.description.length > 100 ? "…" : ""}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

function PostsTab({ posts }: { posts: UserPost[] }) {
  if (posts.length === 0) return <div style={S.emptyTab}>Aucun post publié.</div>;
  return (
    <div style={{ padding: "20px 36px 60px", display: "flex", flexDirection: "column", gap: 14 }}>
      {posts.map((p) => (
        <Link key={p.id} to={`/cercles/${p.cercle.slug}/posts/${p.id}`} style={S.postCardLink}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: CC_THEME.or, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
              {p.cercle.name}
            </div>
            <div style={{ fontSize: 11, color: CC_THEME.inkMuted }}>
              {new Date(p.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          {p.title && <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 17, color: CC_THEME.navy, marginBottom: 6, fontWeight: 600 }}>{p.title}</div>}
          <div style={{ fontSize: 13.5, color: CC_THEME.ink, lineHeight: 1.5 }}>
            {p.body.slice(0, 200)}{p.body.length > 200 ? "…" : ""}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: CC_THEME.inkMid }}>
            <span>👍 {p.upvotes}</span>
            <span>💬 {p._count.replies}</span>
            {p.isPinned && <span style={{ color: CC_THEME.or }}>📌 Épinglé</span>}
            {p.isResolved && <span style={{ color: CC_THEME.success }}>✓ Résolu</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}

function RoomsTab({ rooms }: { rooms: UserRoom[] }) {
  if (rooms.length === 0) return <div style={S.emptyTab}>Aucun événement programmé.</div>;
  return (
    <div style={{ padding: "20px 36px 60px", display: "flex", flexDirection: "column", gap: 12 }}>
      {rooms.map((r) => (
        <Link key={r.id} to={`/cercles/${r.cercle.slug}/rooms/${r.slug}`} style={S.roomCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ ...S.statusPill, color: roomStatusColor(r.status), borderColor: roomStatusColor(r.status) + "60", padding: "3px 10px", borderRadius: 12, fontSize: 10, border: `1px solid` }}>
              {r.status === "LIVE" ? "● EN DIRECT" : r.status === "SCHEDULED" ? "PROGRAMMÉ" : r.status}
            </div>
            <span style={{ fontSize: 11, color: CC_THEME.inkMuted }}>{r.cercle.name}</span>
            {r.provider === "JITSI" && <span style={{ fontSize: 11, color: CC_THEME.or }}>Jitsi</span>}
          </div>
          <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 17, color: CC_THEME.navy, marginTop: 8, fontWeight: 600 }}>
            {r.title}
          </div>
          {r.description && <div style={{ fontSize: 13, color: CC_THEME.ink, marginTop: 4 }}>{r.description}</div>}
          {r.scheduledAt && (
            <div style={{ fontSize: 12, color: CC_THEME.inkMid, marginTop: 6 }}>
              📅 {new Date(r.scheduledAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

function roomStatusColor(status: string): string {
  return status === "LIVE" ? CC_THEME.danger : status === "ENDED" ? CC_THEME.inkMuted : CC_THEME.info;
}

function InviteModal(props: {
  myCercles: CercleListItem[];
  inviteCercleId: string; setInviteCercleId: (v: string) => void;
  inviteEmails: string; setInviteEmails: (v: string) => void;
  inviteMsg: string; setInviteMsg: (v: string) => void;
  inviteBusy: boolean;
  inviteResults: InviteResultItem[] | null;
  onSubmit: () => void; onClose: () => void;
}) {
  return (
    <div style={{ ...S.section, margin: "16px 36px 0", padding: 20 }}>
      <div style={S.sectionEyebrow}>Inviter par email</div>
      {props.myCercles.length === 0 ? (
        <div style={{ color: CC_THEME.inkMid, fontSize: 13, fontStyle: "italic" }}>
          Tu dois être modérateur d'au moins un cercle pour inviter.
        </div>
      ) : (
        <>
          <label style={S.editLabel}>Cercle d'accueil</label>
          <select value={props.inviteCercleId} onChange={(e) => props.setInviteCercleId(e.target.value)} style={S.editInput}>
            {props.myCercles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea placeholder="Emails (séparés par virgule, espace ou nouvelle ligne)" value={props.inviteEmails} onChange={(e) => props.setInviteEmails(e.target.value)} style={{ ...S.editInput, minHeight: 70 }} />
          <textarea placeholder="Mot d'accompagnement (optionnel)" value={props.inviteMsg} onChange={(e) => props.setInviteMsg(e.target.value)} style={{ ...S.editInput, minHeight: 50 }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={props.onClose} style={S.btnGhost}>Fermer</button>
            <button onClick={props.onSubmit} disabled={props.inviteBusy || !props.inviteEmails.trim()} style={S.btnPrimary}>
              {props.inviteBusy ? "Envoi…" : "Envoyer"}
            </button>
          </div>
          {props.inviteResults && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${CC_THEME.border}` }}>
              {props.inviteResults.map((r, i) => (
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
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: { padding: 0, maxWidth: 1100, margin: "0 auto" },
  cover: { height: 160, background: `linear-gradient(135deg, ${CC_THEME.bgDeep} 0%, ${CC_THEME.navyHover} 100%)`, position: "relative" },

  headerCard: { display: "flex", alignItems: "flex-end", gap: 20, padding: "0 36px 24px", marginTop: -52, position: "relative" },
  avatar: { width: 96, height: 96, borderRadius: "50%", color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 38, fontWeight: 700, border: `4px solid ${CC_THEME.bg}`, flexShrink: 0 },
  name: { margin: 0, fontFamily: CC_THEME.fontDisplay, fontSize: 28, color: CC_THEME.navy, fontWeight: 600, letterSpacing: "-0.01em" },
  title: { color: CC_THEME.inkMid, fontSize: 14, fontStyle: "italic", marginBottom: 6 },
  badges: { display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 8 },
  metierBadge: { fontSize: 11.5, color: CC_THEME.or, background: CC_THEME.orSoft + "70", padding: "4px 10px", borderRadius: 4, letterSpacing: "0.04em", fontWeight: 600 },
  classBadge: { fontSize: 11.5, color: CC_THEME.success, background: CC_THEME.successBg, padding: "4px 10px", borderRadius: 4, fontWeight: 600 },
  statusBadge: { fontSize: 11.5, color: CC_THEME.info, background: CC_THEME.infoBg, padding: "4px 10px", borderRadius: 4, fontWeight: 500 },
  locTag: { fontSize: 11.5, color: CC_THEME.inkMid, background: CC_THEME.bgSoft, padding: "4px 10px", borderRadius: 4 },
  dispoBadge: { fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 12, letterSpacing: "0.04em" },
  actions: { display: "flex", gap: 8, flexDirection: "column" },
  btnConnect: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "10px 18px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" },
  btnGhostAction: { background: "transparent", color: CC_THEME.navy, border: `1px solid ${CC_THEME.border}`, padding: "8px 16px", borderRadius: 6, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" },

  tabs: { display: "flex", gap: 4, padding: "0 36px", borderBottom: `1px solid ${CC_THEME.border}`, marginTop: 18 },

  layout: { padding: 0 },
  layoutGrid: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, padding: "20px 36px 60px" },

  section: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: "18px 20px", boxShadow: CC_THEME.shadowSoft },
  sectionEyebrow: { fontSize: 9.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 12, paddingBottom: 6, borderBottom: `1px dotted ${CC_THEME.border}` },

  bio: { fontSize: 13.5, color: CC_THEME.ink, lineHeight: 1.65, whiteSpace: "pre-wrap" as const },

  cabinetCard: { padding: 12, background: CC_THEME.bgSoft, borderRadius: 6, borderLeft: `3px solid ${CC_THEME.or}` },

  projectCard: { padding: 14, background: CC_THEME.bgSoft, borderRadius: 6, marginBottom: 10 },
  projectHead: {},

  formationRow: { display: "flex", padding: "10px 0", borderBottom: `1px dotted ${CC_THEME.border}`, alignItems: "flex-start" },

  tagList: { display: "flex", flexWrap: "wrap" as const, gap: 6 },
  specialiteTag: { fontSize: 11.5, color: CC_THEME.navy, background: CC_THEME.bgSoft, padding: "4px 10px", borderRadius: 4, letterSpacing: "0.02em" },
  regionTag: { fontSize: 11.5, color: CC_THEME.inkMid, background: CC_THEME.bgSoft, padding: "4px 10px", borderRadius: 4 },
  langueTag: { fontSize: 11.5, color: CC_THEME.navy, background: CC_THEME.orSoft, padding: "4px 10px", borderRadius: 12 },

  agrementList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 },
  agrementItem: { fontSize: 12.5, color: CC_THEME.ink, padding: "6px 0", borderBottom: `1px dotted ${CC_THEME.borderSoft}` },

  contactList: { display: "flex", flexDirection: "column", gap: 8 },
  contactLink: { fontSize: 12.5, color: CC_THEME.navy, textDecoration: "none", padding: "6px 0", borderBottom: `1px solid ${CC_THEME.borderSoft}` },
  contactRow: { display: "flex", alignItems: "center", gap: 10, padding: "5px 0" },
  iconBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: CC_THEME.bgSoft, borderRadius: "50%", fontSize: 11 },

  statRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0" },
  statLabel: { color: CC_THEME.inkMid, fontSize: 12.5 },
  statValue: { fontFamily: CC_THEME.fontDisplay, fontSize: 22, color: CC_THEME.navy, fontWeight: 600 },

  cercleCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 8, padding: 14, textDecoration: "none", color: "inherit", display: "block", cursor: "pointer" },
  postCardLink: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 8, padding: 16, textDecoration: "none", color: "inherit", display: "block" },
  postAvatarSm: { width: 36, height: 36, borderRadius: "50%", color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 16, fontWeight: 700 },

  roomCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 8, padding: 16, textDecoration: "none", color: "inherit", display: "block" },
  statusPill: { fontWeight: 600, letterSpacing: "0.10em" },

  emptyTab: { padding: 60, textAlign: "center", color: CC_THEME.inkMuted, fontStyle: "italic" },

  editLabel: { display: "block", fontSize: 11, color: CC_THEME.inkMid, marginBottom: 4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const },
  editInput: { width: "100%", padding: 10, border: `1px solid ${CC_THEME.border}`, borderRadius: 4, marginBottom: 12, fontSize: 14, background: CC_THEME.bgRaised, fontFamily: "inherit", boxSizing: "border-box" as const },
  btnPrimary: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "8px 18px", borderRadius: 4, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 },
  btnGhost: { background: "transparent", border: `1px solid ${CC_THEME.border}`, padding: "8px 16px", borderRadius: 4, color: CC_THEME.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 13 },
};

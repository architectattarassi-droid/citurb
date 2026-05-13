/**
 * AssociationManagePage — Sprint I
 *
 * Route : /cercles/:slug/applications
 *
 * Page modérateur : liste des demandes d'adhésion, approuver ou rejeter.
 */

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME, ensureFonts } from "./theme";
import { associationsApi, cerclesApi, AssociationApplication } from "./api";

const MEMBER_TYPES = ["ASPIRANT", "ETUDIANT", "JEUNE_DIPLOME", "ACTIF", "HONORAIRE", "RETRAITE"];

export default function AssociationManagePage() {
  useEffect(() => { ensureFonts(); }, []);
  const { slug } = useParams<{ slug: string }>();
  const [cercleId, setCercleId] = useState<string | null>(null);
  const [cercleName, setCercleName] = useState<string>("");
  const [apps, setApps] = useState<AssociationApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AssociationApplication | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = (cId: string, status: string) => {
    setLoading(true);
    associationsApi.listApplications(cId, status === "ALL" ? undefined : status)
      .then((r) => setApps(r.data))
      .catch((e: any) => setErr(e?.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!slug) return;
    cerclesApi.detail(slug).then((r) => {
      setCercleId(r.data.id);
      setCercleName(r.data.name);
      reload(r.data.id, statusFilter);
    }).catch((e: any) => setErr(e?.message));
  }, [slug]);

  useEffect(() => {
    if (cercleId) reload(cercleId, statusFilter);
  }, [statusFilter]);

  const refresh = () => cercleId && reload(cercleId, statusFilter);

  return (
    <CerclesShell>
      <div style={S.root}>
        <header style={S.header}>
          <Link to={`/cercles/${slug}`} style={S.back}>← Retour au cercle</Link>
          <div style={S.eyebrow}>GESTION DES ADHÉSIONS</div>
          <h1 style={S.title}>{cercleName}</h1>
        </header>

        <div style={S.filterBar}>
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                ...S.filterBtn,
                background: statusFilter === s ? CC_THEME.navy : "transparent",
                color: statusFilter === s ? CC_THEME.bg : CC_THEME.inkMid,
              }}
            >{s === "PENDING" ? "À examiner" : s === "APPROVED" ? "Validées" : s === "REJECTED" ? "Refusées" : "Toutes"}</button>
          ))}
        </div>

        {err && <div style={S.errBox}>⚠ {err}</div>}

        {loading && <div style={{ padding: 32, color: CC_THEME.inkMid, fontStyle: "italic" }}>Chargement…</div>}

        {!loading && apps.length === 0 && (
          <div style={S.emptyBox}>Aucune demande {statusFilter === "ALL" ? "" : "en " + statusFilter.toLowerCase()}.</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {apps.map((a) => (
            <ApplicationRow key={a.id} app={a} onClick={() => setSelected(a)} />
          ))}
        </div>

        {selected && cercleId && (
          <ApplicationDrawer app={selected} cercleId={cercleId} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); refresh(); }} />
        )}
      </div>
    </CerclesShell>
  );
}

function ApplicationRow({ app, onClick }: { app: AssociationApplication; onClick: () => void }) {
  const statusColor = app.status === "PENDING" ? CC_THEME.info
    : app.status === "APPROVED" ? CC_THEME.success
    : app.status === "REJECTED" ? CC_THEME.danger
    : CC_THEME.inkMuted;
  const profile = app.user?.proProfile;
  return (
    <div onClick={onClick} style={{ ...S.row, cursor: "pointer" }}>
      <div style={{ ...S.statusBadge, color: statusColor, background: statusColor + "20", borderColor: statusColor + "40" }}>
        {app.status}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: CC_THEME.navy }}>
          {profile?.displayName || app.user?.username || app.user?.email}
        </div>
        <div style={{ fontSize: 11, color: CC_THEME.inkMuted, marginTop: 2 }}>
          {app.user?.email}{profile?.metier ? ` · ${profile.metier}` : ""}{profile?.villePrincipale ? ` · ${profile.villePrincipale}` : ""}
        </div>
        <div style={{ fontSize: 11, color: CC_THEME.inkMid, marginTop: 4 }}>
          Soumise le {new Date(app.submittedAt).toLocaleDateString("fr-FR")}
          {app.memberType ? ` · ${app.memberType}` : ""}
        </div>
      </div>
      <div style={{ color: CC_THEME.or, fontSize: 18 }}>→</div>
    </div>
  );
}

function ApplicationDrawer({ app, cercleId, onClose, onChanged }: { app: AssociationApplication; cercleId: string; onClose: () => void; onChanged: () => void }) {
  const [memberType, setMemberType] = useState<string>(app.memberType || "ACTIF");
  const [reviewNote, setReviewNote] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const approve = async () => {
    setBusy(true);
    try {
      await associationsApi.approve(app.id, { memberType, reviewNote: reviewNote.trim() || undefined });
      onChanged();
    } catch (e: any) { alert("Erreur : " + (e?.message || "")); }
    finally { setBusy(false); }
  };
  const reject = async () => {
    if (!reason.trim()) { alert("Saisis un motif de refus"); return; }
    setBusy(true);
    try {
      await associationsApi.reject(app.id, reason);
      onChanged();
    } catch (e: any) { alert("Erreur : " + (e?.message || "")); }
    finally { setBusy(false); }
  };

  return (
    <div style={S.drawerOverlay} onClick={onClose}>
      <div style={S.drawer} onClick={(e) => e.stopPropagation()}>
        <header style={S.drawerHeader}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.22em", color: CC_THEME.or, fontWeight: 600 }}>DOSSIER {app.status}</div>
            <h2 style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 22, color: CC_THEME.navy, margin: "4px 0 0" }}>
              {app.user?.proProfile?.displayName || app.user?.username || app.user?.email}
            </h2>
          </div>
          <button onClick={onClose} style={S.closeBtn}>×</button>
        </header>

        <div style={S.drawerBody}>
          <div style={{ fontSize: 11, color: CC_THEME.inkMid, marginBottom: 14 }}>
            Soumis le {new Date(app.submittedAt).toLocaleString("fr-FR")}
            {app.reviewedAt && ` · Décidé le ${new Date(app.reviewedAt).toLocaleString("fr-FR")}`}
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>Données du formulaire</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {Object.entries(app.formData).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: `1px dotted ${CC_THEME.borderSoft}` }}>
                    <td style={{ padding: "6px 8px", fontSize: 11.5, color: CC_THEME.inkMid, width: 180, verticalAlign: "top" }}>{k}</td>
                    <td style={{ padding: "6px 8px", fontSize: 13 }}>{String(v ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {app.status === "PENDING" && (
            <>
              <div style={S.section}>
                <div style={S.sectionTitle}>Décision</div>
                <label style={S.label}>Type de membre à attribuer</label>
                <select style={S.input} value={memberType} onChange={(e) => setMemberType(e.target.value)}>
                  {MEMBER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <label style={{ ...S.label, marginTop: 14 }}>Note (interne, optionnelle)</label>
                <textarea style={{ ...S.input, minHeight: 60 }} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />

                <button onClick={approve} disabled={busy} style={{ ...S.btnApprove, marginTop: 16 }}>
                  {busy ? "Validation…" : "✓ Approuver"}
                </button>
              </div>

              <div style={S.section}>
                <label style={S.label}>Motif de refus (si rejet)</label>
                <textarea style={{ ...S.input, minHeight: 60 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex: Conditions d'éligibilité non remplies (âge, diplôme…)" />
                <button onClick={reject} disabled={busy || !reason.trim()} style={{ ...S.btnReject, marginTop: 12 }}>
                  ✗ Refuser
                </button>
              </div>
            </>
          )}

          {app.status === "APPROVED" && (
            <div style={{ ...S.section, background: CC_THEME.successBg, borderLeft: `3px solid ${CC_THEME.success}`, padding: 14, borderRadius: 4 }}>
              <strong>✓ Dossier validé</strong> · Membre {app.memberType}
              {app.reviewNote && <div style={{ marginTop: 8, fontSize: 13 }}>Note : {app.reviewNote}</div>}
            </div>
          )}

          {app.status === "REJECTED" && (
            <div style={{ ...S.section, background: CC_THEME.dangerBg, borderLeft: `3px solid ${CC_THEME.danger}`, padding: 14, borderRadius: 4 }}>
              <strong>✗ Dossier refusé</strong>
              {app.rejectionReason && <div style={{ marginTop: 8, fontSize: 13 }}>Motif : {app.rejectionReason}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { maxWidth: 1000, margin: "0 auto", padding: "32px 24px 60px", fontFamily: CC_THEME.fontBody, color: CC_THEME.ink },
  header: { marginBottom: 18 },
  back: { color: CC_THEME.inkMid, fontSize: 13, textDecoration: "none", display: "inline-block", marginBottom: 14 },
  eyebrow: { fontSize: 11, letterSpacing: "0.22em", color: CC_THEME.or, fontWeight: 600 },
  title: { fontFamily: CC_THEME.fontDisplay, fontSize: 28, color: CC_THEME.navy, margin: "8px 0 6px", fontWeight: 600 },

  filterBar: { display: "flex", gap: 6, marginBottom: 18 },
  filterBtn: { padding: "8px 16px", border: `1px solid ${CC_THEME.border}`, borderRadius: 18, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  errBox: { padding: "12px 16px", background: CC_THEME.dangerBg, color: CC_THEME.danger, borderRadius: 4, marginBottom: 12 },
  emptyBox: { padding: 50, textAlign: "center", color: CC_THEME.inkMuted, fontStyle: "italic", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 8 },

  row: { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 8 },
  statusBadge: { padding: "3px 10px", border: `1px solid`, borderRadius: 10, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const },

  drawerOverlay: { position: "fixed", inset: 0, background: "rgba(15,42,74,0.55)", zIndex: 100, display: "flex", justifyContent: "flex-end" },
  drawer: { width: "min(560px, 95vw)", background: CC_THEME.bg, height: "100vh", overflowY: "auto", boxShadow: "-4px 0 16px rgba(0,0,0,0.18)" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "22px 26px", borderBottom: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised },
  closeBtn: { background: "transparent", border: 0, fontSize: 28, color: CC_THEME.inkMid, cursor: "pointer", lineHeight: 1, padding: 0 },
  drawerBody: { padding: "22px 26px" },

  section: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 8, padding: "16px 18px", marginBottom: 14 },
  sectionTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 14, color: CC_THEME.navy, fontWeight: 600, marginBottom: 10 },

  label: { display: "block", fontSize: 11, color: CC_THEME.inkMid, marginBottom: 4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const },
  input: { width: "100%", padding: "9px 12px", border: `1px solid ${CC_THEME.border}`, borderRadius: 4, fontSize: 13.5, fontFamily: "inherit", background: CC_THEME.bgRaised, outline: "none", boxSizing: "border-box" as const },

  btnApprove: { width: "100%", background: CC_THEME.success, color: "white", border: 0, padding: "10px 18px", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 },
  btnReject:  { width: "100%", background: CC_THEME.danger,  color: "white", border: 0, padding: "10px 18px", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 },
};

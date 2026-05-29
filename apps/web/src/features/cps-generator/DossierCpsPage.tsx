/**
 * DossierCpsPage (/dossier/:dossierId/cps) — CPS officiel lié au dossier.
 *
 * Gardé côté serveur : portes P1/P2/P3, propriété, paywall (pack activé).
 * Document filigrané nominatif, anti-copie, signatures obligatoires
 * entreprises/prestataires (scellées SHA-256, adaptateur Barid eSign).
 */

import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../../tomes/tome4/apiClient";

type ProjectTypeItem = { code: string; label: string; description?: string; porteScope?: string[] };
type Signer = { partie: string; role?: string; signataire?: string; signedAt?: string | null; status?: string; method?: string };
type SigState = { porteType: string; signatures: Signer[]; total: number; signed: number; fullySigned: boolean; baridEnabled: boolean };
type CpsDoc = { html: string; documentHash: string; lots: any[]; bordereau: any[] };

export default function DossierCpsPage() {
  const { dossierId = "" } = useParams<{ dossierId: string }>();
  const [types, setTypes] = useState<ProjectTypeItem[]>([]);
  const [code, setCode] = useState("");
  const [lang, setLang] = useState<"fr" | "ar" | "en">("fr");
  const [marketType, setMarketType] = useState<"PUBLIC" | "PRIVE">("PRIVE");
  const [sig, setSig] = useState<SigState | null>(null);
  const [doc, setDoc] = useState<CpsDoc | null>(null);
  const [gate, setGate] = useState<string | null>(null); // message de blocage (paywall/porte/accès)
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: ProjectTypeItem[] }>(`/api/cps/project-types?lang=${lang}`).then((r) => setTypes(r.items)).catch(() => {});
  }, [lang]);

  useEffect(() => {
    if (!dossierId) return;
    apiFetch<SigState>(`/api/cps/dossier/${dossierId}/signatures`)
      .then((s) => { setSig(s); setGate(null); })
      .catch((e: any) => setGate(e?.message || "Accès au dossier refusé."));
  }, [dossierId]);

  const allowedTypes = sig ? types.filter((t) => !t.porteScope || t.porteScope.includes(sig.porteType)) : types;
  useEffect(() => { if (allowedTypes[0] && !code) setCode(allowedTypes[0].code); }, [allowedTypes, code]);

  async function generate() {
    if (!code) { setErr("Choisissez un type de projet."); return; }
    setErr(null); setLoading(true);
    try {
      const r = await apiFetch<CpsDoc>(`/api/cps/dossier/${dossierId}/generate`, {
        method: "POST", body: { projectTypeCode: code, lang, marketType },
      });
      setDoc(r); setGate(null);
    } catch (e: any) {
      const m = e?.message || "Erreur";
      if (/402|verrouillé|activ/i.test(m)) setGate("🔒 CPS verrouillé : disponible après activation du pack (paiement validé).");
      else if (/422|porte/i.test(m)) setGate("Le CPS n'est disponible que pour les portes P1, P2, P3.");
      else setErr(m);
    } finally { setLoading(false); }
  }

  async function refreshSig() {
    try { setSig(await apiFetch<SigState>(`/api/cps/dossier/${dossierId}/signatures`)); } catch {}
  }

  async function submitSignature(partie: string, role: string | undefined, signerName: string, dataUrl: string) {
    await apiFetch(`/api/cps/dossier/${dossierId}/sign`, {
      method: "POST",
      body: { partie, signerRole: role, signerName, dataUrl, documentHash: doc?.documentHash },
    });
    setSigning(null);
    await refreshSig();
  }

  function printDoc() {
    if (!doc) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(doc.html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ fontSize: 12, color: "#C9A227", letterSpacing: "0.18em", textTransform: "uppercase" }}>CITURBAREA · CPS officiel</div>
      <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "#0B1B3A" }}>CPS du dossier</h1>
      <p style={{ fontSize: 13.5, color: "rgba(11,27,58,0.6)", marginTop: 6 }}>Dossier {dossierId} · porte {sig?.porteType ?? "…"} — document filigrané, signé et scellé. Sortie autorisée : impression filigranée depuis la plateforme.</p>

      {gate && (() => {
        const isAuthGate = /unauthor|connect|401|token|session|jwt/i.test(gate);
        const isPayGate = /402|verrouill|activ|pack/i.test(gate);
        return (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: 18, borderRadius: 12, marginTop: 16 }}>
            <div style={{ color: "#92400e", fontWeight: 700, fontSize: 15 }}>{gate}</div>
            {isAuthGate ? (
              <div style={{ marginTop: 12 }}>
                <Link to="/login" style={{ ...cta, background: "#0B1B3A" }}>Se connecter</Link>
              </div>
            ) : isPayGate ? (
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link to="/portal" style={{ ...cta, background: "#0B1B3A" }}>Activer le pack de mon dossier</Link>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 13.5, color: "#0B1B3A", marginBottom: 10 }}>Vous n'avez pas encore de dossier ? Démarrez votre projet (le CPS sera disponible après activation du pack) :</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link to="/p1" style={{ ...cta, background: "#0B1B3A" }}>🏠 Particulier (P1)</Link>
                  <Link to="/p2" style={{ ...cta, background: "#0B1B3A" }}>🏢 Promoteur (P2)</Link>
                  <Link to="/p3" style={{ ...cta, background: "#0B1B3A" }}>🛠️ MOD délégué (P3)</Link>
                  <Link to="/portal" style={{ ...cta, background: "#eef2f7", color: "#0B1B3A" }}>📁 Mes dossiers</Link>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {err && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 8, marginTop: 12 }}>{err}</div>}

      {!gate && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 18 }}>
            <Field label="Type de projet"><select value={code} onChange={(e) => setCode(e.target.value)} style={inputStyle}>{allowedTypes.map((t) => (<option key={t.code} value={t.code}>{t.label}</option>))}</select></Field>
            <Field label="Langue"><select value={lang} onChange={(e) => setLang(e.target.value as any)} style={inputStyle}><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select></Field>
            <Field label="Type de marché"><select value={marketType} onChange={(e) => setMarketType(e.target.value as any)} style={inputStyle}><option value="PRIVE">Privé</option><option value="PUBLIC">Public (CCAG-T)</option></select></Field>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={generate} disabled={loading} style={{ ...btn, background: "#0B1B3A", opacity: loading ? 0.6 : 1 }}>{loading ? "Génération…" : "Générer le CPS officiel"}</button>
            {doc && <button onClick={printDoc} style={{ ...btn, background: "#C9A227" }}>Imprimer (filigrané)</button>}
          </div>
        </>
      )}

      {/* Signatures obligatoires */}
      {sig && (
        <div style={{ marginTop: 22, border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0B1B3A", margin: 0 }}>Signatures ({sig.signed}/{sig.total})</h2>
            <span style={{ fontSize: 12, fontWeight: 700, color: sig.fullySigned ? "#166534" : "#92400e" }}>{sig.fullySigned ? "✅ CPS entièrement signé" : "Signatures requises avant opposabilité"}</span>
          </div>
          <p style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>Scellé SHA-256 + journal probatoire. Signature qualifiée Barid eSign {sig.baridEnabled ? "active" : "en attente de convention (scellement local valide)"}.</p>
          <div style={{ marginTop: 8 }}>
            {sig.signatures.map((s, i) => (
              <div key={s.partie + i} style={{ borderTop: i ? "1px solid #f1f5f9" : 0, padding: "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ flex: 1, minWidth: 180, fontSize: 13.5, color: "#0B1B3A", fontWeight: 600 }}>{s.partie}<span style={{ color: "#64748b", fontWeight: 400 }}> · {s.role}</span></span>
                  {s.status === "SIGNE" ? (
                    <span style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>✓ {s.signataire} · {s.signedAt ? new Date(s.signedAt).toLocaleDateString("fr-FR") : ""}</span>
                  ) : (
                    <button onClick={() => setSigning(s.partie)} disabled={!doc} title={!doc ? "Générez d'abord le CPS" : ""} style={{ ...miniBtn, background: doc ? "#16a34a" : "#cbd5e1", color: "#fff" }}>Signer</button>
                  )}
                </div>
                {signing === s.partie && (
                  <SignaturePad onCancel={() => setSigning(null)} onSubmit={(name, url) => submitSignature(s.partie, s.role, name, url)} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {doc && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0B1B3A" }}>Aperçu (filigrané · {doc.lots.length} lots · {doc.bordereau.length} postes)</h2>
          <iframe title="CPS" srcDoc={doc.html} sandbox="allow-same-origin" style={{ width: "100%", height: 560, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", marginTop: 8 }} />
        </div>
      )}
    </div>
  );
}

function SignaturePad({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (name: string, dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  function pos(e: React.PointerEvent) {
    const c = ref.current!; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  const down = (e: React.PointerEvent) => { drawing.current = true; const ctx = ref.current!.getContext("2d")!; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const ctx = ref.current!.getContext("2d")!; const p = pos(e); ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#0B1B3A"; ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const up = () => { drawing.current = false; };
  const clear = () => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); };

  async function submit() {
    if (!name.trim()) return;
    const url = ref.current!.toDataURL("image/png");
    setBusy(true);
    try { await onSubmit(name.trim(), url); } finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du signataire" style={{ ...inputStyle, marginBottom: 8 }} />
      <canvas ref={ref} width={460} height={130} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        style={{ width: "100%", maxWidth: 460, height: 130, background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 8, touchAction: "none", cursor: "crosshair" }} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={submit} disabled={busy || !name.trim()} style={{ ...miniBtn, background: "#16a34a", color: "#fff" }}>{busy ? "…" : "Valider la signature"}</button>
        <button onClick={clear} style={{ ...miniBtn, background: "#eef2f7", color: "#0B1B3A" }}>Effacer</button>
        <button onClick={onCancel} style={{ ...miniBtn, background: "#fee2e2", color: "#991b1b" }}>Annuler</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label style={{ display: "block" }}><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(11,27,58,0.55)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>{children}</label>);
}
const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 12px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: "#0B1B3A" };
const btn: React.CSSProperties = { color: "#fff", border: 0, borderRadius: 9, padding: "12px 22px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 48 };
const miniBtn: React.CSSProperties = { border: 0, borderRadius: 7, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const cta: React.CSSProperties = { color: "#fff", textDecoration: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, display: "inline-block" };

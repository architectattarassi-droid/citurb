import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CC } from "../../command-center/theme/tokens";
import {
  estimateDetaille,
  estimateSommaire,
  getSimulateurOptions,
  type SimDetaillee,
  type SimEstimationInput,
  type SimFinition,
  type SimOptions,
  type SimSommaire,
  type SimTypeProjet,
} from "../../tomes/tome4/apiClient";
import ReviewInvite from "./ReviewInvite";

/**
 * SimulateurCoutPage — Simulateur PUBLIC de coût de construction.
 *
 * Étape A (gratuit, anonyme, SEO) : qualification projet → fourchette globale.
 * Étape B (capture contact + consentement) : ventilation détaillée + PDF + devis.
 *
 * Hydrate la coquille HTML pré-rendue (cf. build-seo.mjs). Le devis renvoie vers
 * le parcours porte existant (P1/P2) ; le pré-remplissage profond + conversion
 * lead arrivent en TÂCHE 4.
 *
 * Réutilise les tokens design CC (pas de thème custom).
 */
const fmt = (n: number) => Math.round(n).toLocaleString("fr-MA").replace(/ |,/g, " ");

export default function SimulateurCoutPage() {
  const nav = useNavigate();
  const [options, setOptions] = useState<SimOptions | null>(null);

  // Qualification
  const [typeProjet, setTypeProjet] = useState<SimTypeProjet>("PARTICULIER");
  const [finition, setFinition] = useState<SimFinition>("STANDARD");
  const [ville, setVille] = useState("kenitra");
  const [surface, setSurface] = useState(200);
  const [niveaux, setNiveaux] = useState(2);
  const [sousSols, setSousSols] = useState(0);
  const [surfacePlancher, setSurfacePlancher] = useState(1200);
  const [nbLogements, setNbLogements] = useState(12);

  // Résultats
  const [sommaire, setSommaire] = useState<SimSommaire | null>(null);
  const [detail, setDetail] = useState<SimDetaillee | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Capture
  const [showCapture, setShowCapture] = useState(false);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [consentement, setConsentement] = useState(false);

  useEffect(() => {
    getSimulateurOptions().then(setOptions).catch(() => {});
  }, []);

  const params = useMemo<SimEstimationInput>(
    () =>
      typeProjet === "PARTICULIER"
        ? { typeProjet, finition, ville, surface, niveaux, sousSols }
        : { typeProjet, finition, ville, surfacePlancher, nbLogements },
    [typeProjet, finition, ville, surface, niveaux, sousSols, surfacePlancher, nbLogements],
  );

  async function onEstimateSommaire(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    setLoading(true);
    setDetail(null);
    setShowCapture(false);
    try {
      const r = await estimateSommaire(params);
      setSommaire(r);
    } catch (e: any) {
      setErr(e?.message || "Erreur de calcul");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitCapture(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!consentement) {
      setErr("Merci de cocher la case de consentement pour recevoir le détail.");
      return;
    }
    setLoading(true);
    try {
      const r = await estimateDetaille(
        { nom, telephone, email, consentement, typeProjet, ville, source: "SIMULATEUR_COUT_CONSTRUCTION" },
        params,
      );
      setDetail(r);
      setShowCapture(false);
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  function goDevis() {
    // Parcours porte existant (machine à états). Pré-remplissage profond → TÂCHE 4.
    nav(typeProjet === "PARTICULIER" ? "/p1" : "/p2");
  }

  return (
    <div style={{ background: CC.color.bg, minHeight: "100vh", fontFamily: CC.font.body, color: CC.color.ink }}>
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px 64px" }}>
        <h1 style={{ fontFamily: CC.font.display, fontSize: 32, fontWeight: 900, color: CC.color.navy, margin: "0 0 8px" }}>
          Simulateur du coût de construction au Maroc
        </h1>
        <p style={{ fontSize: 17, color: CC.color.inkMid, margin: "0 0 24px" }}>
          Estimez en quelques secondes le budget de votre projet de construction dans le
          corridor Rabat–Kénitra. Estimation indicative gratuite, basée sur le barème CNOA.
        </p>

        {/* ─── Étape A : qualification ─── */}
        <form onSubmit={onEstimateSommaire} style={card()}>
          <h2 style={h2()}>1. Votre projet</h2>
          <div style={grid()}>
            <Field label="Type de projet">
              <select value={typeProjet} onChange={(e) => setTypeProjet(e.target.value as SimTypeProjet)} style={input()}>
                {(options?.types || [
                  { value: "PARTICULIER", name: "Particulier (villa / maison)" },
                  { value: "PROMOTEUR", name: "Promoteur (immeuble collectif)" },
                ]).map((t) => (
                  <option key={t.value} value={t.value}>{t.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Niveau de finition">
              <select value={finition} onChange={(e) => setFinition(e.target.value as SimFinition)} style={input()}>
                {(options?.finitions || [
                  { value: "ECO", name: "Économique" },
                  { value: "STANDARD", name: "Standard" },
                  { value: "HAUT_DE_GAMME", name: "Haut de gamme" },
                ]).map((f) => (
                  <option key={f.value} value={f.value}>{f.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Ville">
              <select value={ville} onChange={(e) => setVille(e.target.value)} style={input()}>
                {(options?.villes || [{ slug: "kenitra", name: "Kénitra" }]).map((v) => (
                  <option key={v.slug} value={v.slug}>{v.name}</option>
                ))}
              </select>
            </Field>

            {typeProjet === "PARTICULIER" ? (
              <>
                <Field label="Emprise au sol (m²)">
                  <input type="number" min={1} value={surface} onChange={(e) => setSurface(Number(e.target.value || 0))} style={input()} />
                </Field>
                <Field label="Nombre de niveaux">
                  <input type="number" min={1} value={niveaux} onChange={(e) => setNiveaux(Number(e.target.value || 1))} style={input()} />
                </Field>
                <Field label="Sous-sols">
                  <input type="number" min={0} value={sousSols} onChange={(e) => setSousSols(Number(e.target.value || 0))} style={input()} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Surface plancher totale (m²)">
                  <input type="number" min={1} value={surfacePlancher} onChange={(e) => setSurfacePlancher(Number(e.target.value || 0))} style={input()} />
                </Field>
                <Field label="Nombre de logements">
                  <input type="number" min={0} value={nbLogements} onChange={(e) => setNbLogements(Number(e.target.value || 0))} style={input()} />
                </Field>
              </>
            )}
          </div>
          <button type="submit" disabled={loading} style={btnPrimary()}>
            {loading ? "Calcul…" : "Estimer mon budget"}
          </button>
        </form>

        {err && <p style={{ color: CC.color.danger, fontWeight: 600 }}>{err}</p>}

        {/* ─── Résultat sommaire ─── */}
        {sommaire && !detail && (
          <div style={card()}>
            <h2 style={h2()}>Votre fourchette de budget estimé</h2>
            <div style={{ fontSize: 30, fontWeight: 900, color: CC.color.navy, fontFamily: CC.font.display }}>
              {fmt(sommaire.fourchetteMin)} – {fmt(sommaire.fourchetteMax)} <span style={{ fontSize: 18 }}>MAD</span>
            </div>
            <div style={{ color: CC.color.inkMid, fontSize: 14, marginTop: 4 }}>
              {sommaire.villeName} · {fmt(sommaire.surfacePlancherTotaleM2)} m² plancher · {fmt(sommaire.coutM2)} MAD/m²
            </div>
            <ul style={{ color: CC.color.inkMid, fontSize: 13, marginTop: 12, paddingLeft: 18 }}>
              {sommaire.hypotheses.map((h, i) => <li key={i}>{h}</li>)}
            </ul>

            {!showCapture ? (
              <button onClick={() => setShowCapture(true)} style={btnPrimary()}>
                Voir la ventilation détaillée + PDF →
              </button>
            ) : (
              <form onSubmit={onSubmitCapture} style={{ marginTop: 16, borderTop: `1px solid ${CC.color.border}`, paddingTop: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: CC.color.ink, margin: "0 0 12px" }}>
                  Recevez le détail complet
                </h3>
                <div style={grid()}>
                  <Field label="Nom complet"><input value={nom} onChange={(e) => setNom(e.target.value)} required style={input()} /></Field>
                  <Field label="Téléphone"><input value={telephone} onChange={(e) => setTelephone(e.target.value)} required style={input()} /></Field>
                  <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={input()} /></Field>
                </div>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: CC.color.inkMid, margin: "12px 0" }}>
                  <input type="checkbox" checked={consentement} onChange={(e) => setConsentement(e.target.checked)} style={{ marginTop: 3 }} />
                  <span>
                    J'accepte d'être recontacté par Arc-Bati / CITURBAREA au sujet de mon projet.
                    Je peux me désinscrire à tout moment via le lien présent dans chaque email.
                  </span>
                </label>
                <button type="submit" disabled={loading} style={btnPrimary()}>
                  {loading ? "Envoi…" : "Afficher la ventilation détaillée"}
                </button>
              </form>
            )}
            <p style={{ color: CC.color.inkMuted, fontSize: 12, marginTop: 14 }}>{sommaire.disclaimer}</p>
          </div>
        )}

        {/* ─── Résultat détaillé ─── */}
        {detail && (
          <div style={card()} id="resultat-detaille">
            <h2 style={h2()}>Ventilation détaillée — {detail.villeName}</h2>
            <div style={{ fontSize: 26, fontWeight: 900, color: CC.color.navy, fontFamily: CC.font.display }}>
              {fmt(detail.fourchetteMin)} – {fmt(detail.fourchetteMax)} MAD
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 14 }}>
              <tbody>
                {detail.ventilation.map((v) => (
                  <tr key={v.poste}>
                    <td style={{ padding: "8px 0", color: CC.color.inkMid, borderBottom: `1px solid ${CC.color.borderSoft}` }}>
                      {v.poste} <span style={{ color: CC.color.inkMuted }}>({Math.round(v.ratio * 100)}%)</span>
                    </td>
                    <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, borderBottom: `1px solid ${CC.color.borderSoft}` }}>
                      {fmt(v.montant)} MAD
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "10px 0", fontWeight: 800, color: CC.color.navy }}>Total estimé (travaux + honoraires)</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 900, color: CC.color.navy }}>{fmt(detail.totalAvecHonoraires)} MAD</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              <button onClick={() => window.print()} style={btnSecondary()}>📄 Télécharger / imprimer le PDF</button>
              <button onClick={goDevis} style={btnPrimary({ marginTop: 0 })}>Obtenir un devis d'architecte →</button>
            </div>

            <p style={{ color: CC.color.inkMuted, fontSize: 12, marginTop: 14 }}>{detail.disclaimer}</p>
            <ReviewInvite />
          </div>
        )}
      </main>
    </div>
  );
}

// ── Helpers de style (tokens CC) ───────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600, color: CC.color.inkMid }}>
      {label}
      {children}
    </label>
  );
}
function card(): React.CSSProperties {
  return {
    background: CC.color.bgRaised,
    border: `1px solid ${CC.color.border}`,
    borderRadius: CC.size.radiusLg,
    padding: 20,
    margin: "0 0 20px",
    boxShadow: CC.shadow.soft,
  };
}
function h2(): React.CSSProperties {
  return { fontSize: 18, fontWeight: 800, color: CC.color.ink, margin: "0 0 14px" };
}
function grid(): React.CSSProperties {
  return { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" };
}
function input(): React.CSSProperties {
  return {
    padding: "9px 11px",
    border: `1px solid ${CC.color.border}`,
    borderRadius: CC.size.radius,
    fontSize: 14,
    background: CC.color.bg,
    color: CC.color.ink,
    fontFamily: CC.font.body,
  };
}
function btnPrimary(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    marginTop: 16,
    background: CC.color.navy,
    color: "#fff",
    padding: "12px 22px",
    borderRadius: CC.size.radius,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 15,
    ...extra,
  };
}
function btnSecondary(): React.CSSProperties {
  return {
    background: CC.color.bgRaised,
    color: CC.color.navy,
    padding: "12px 20px",
    borderRadius: CC.size.radius,
    border: `1px solid ${CC.color.navy}`,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  };
}

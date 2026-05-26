import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBase, getToken } from "../../../tome4/apiClient";
import { useT } from "../../../../i18n/i18n";

/**
 * Pages de paiement CITURBAREA — 4 méthodes :
 *   1. Stripe (carte en ligne, instant)
 *   2. TPE (carte en présentiel au siège)
 *   3. Chèque certifié (à l'ordre de CITURBAREA SARL)
 *   4. Virement RIB (référence dossier obligatoire)
 *
 * Méthodes 2-4 = déclaration manuelle → admin valide à réception du paiement.
 *
 * /payment/start    → sélecteur méthode + instructions
 * /payment/success  → confirmation Stripe (callback)
 * /payment/cancel   → annulation Stripe (callback)
 */

const NAVY = "#0B1B3A";
const GOLD = "#C9A227";

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "linear-gradient(180deg,#fff,#f8f4ea)", color: NAVY, fontFamily: "Inter,system-ui,sans-serif", padding: "32px 20px" },
  container: { maxWidth: 920, margin: "0 auto" },
  card: { background: "#fff", padding: 32, border: "1px solid rgba(201,162,39,0.30)", borderRadius: 16, boxShadow: "0 14px 42px rgba(11,27,58,0.10)", marginBottom: 22 },
  cardSuccess: { background: "#fff", borderColor: "rgba(34,197,94,0.40)" },
  cardCancel: { background: "#fff", borderColor: "rgba(245,158,11,0.40)" },
  icon: { fontSize: 48, marginBottom: 14 },
  title: { fontFamily: '"Playfair Display",Georgia,serif', fontSize: 26, fontWeight: 700, color: NAVY, margin: "0 0 8px" },
  sub: { color: "rgba(11,27,58,0.72)", fontSize: 14, lineHeight: 1.7, marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", color: GOLD, textTransform: "uppercase" as const, marginBottom: 6 },
  ref: { fontSize: 11, color: "rgba(11,27,58,0.55)", marginTop: 8, fontFamily: "ui-monospace,monospace" },
  btnGold: { background: "linear-gradient(135deg,#C9A227,#E6C75B)", color: "#fff", padding: "12px 22px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block", border: 0, cursor: "pointer" },
  btnDark: { background: NAVY, color: "#fff", padding: "12px 22px", borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: "none", display: "inline-block", border: 0, cursor: "pointer" },
  btnGhost: { background: "transparent", color: NAVY, padding: "10px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: "none", display: "inline-block", border: "1px solid rgba(11,27,58,0.18)", cursor: "pointer" },
  methodsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginTop: 18 },
  methodCard: { background: "#fff", padding: 18, border: "2px solid rgba(11,27,58,0.10)", borderRadius: 14, cursor: "pointer", textAlign: "left" as const, transition: "all .2s", fontFamily: "inherit" },
  methodCardSel: { borderColor: GOLD, background: "linear-gradient(135deg,rgba(201,162,39,0.06),rgba(232,216,166,0.06))", boxShadow: "0 14px 42px rgba(11,27,58,0.10)" },
  methodIcon: { fontSize: 32, marginBottom: 8 },
  methodLabel: { fontWeight: 800, fontSize: 15, color: NAVY, marginBottom: 4 },
  methodSub: { fontSize: 12, color: "rgba(11,27,58,0.65)", lineHeight: 1.5 },
  methodMeta: { fontSize: 11, color: "rgba(11,27,58,0.55)", marginTop: 8, paddingTop: 8, borderTop: "1px dashed rgba(11,27,58,0.10)" },
  field: { display: "flex", flexDirection: "column" as const, gap: 4, marginBottom: 12 },
  label: { fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "rgba(11,27,58,0.72)" },
  input: { padding: "10px 12px", border: "1px solid rgba(11,27,58,0.20)", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fff", color: NAVY, outline: "none" },
  instructionStep: { padding: "8px 12px", margin: "4px 0", background: "rgba(11,27,58,0.04)", borderLeft: `3px solid ${GOLD}`, borderRadius: 6, fontSize: 13, lineHeight: 1.55, color: "rgba(11,27,58,0.85)" },
  warningBox: { padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.30)", borderLeft: "4px solid #f59e0b", borderRadius: 10, fontSize: 12.5, lineHeight: 1.6, color: "rgba(11,27,58,0.85)", marginTop: 10 },
  successBox: { padding: "12px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.30)", borderLeft: "4px solid #22c55e", borderRadius: 10, fontSize: 13, lineHeight: 1.6, marginTop: 14 },
};

type Method = "STRIPE" | "TPE" | "CHEQUE_CERTIFIE" | "VIREMENT_RIB";
type MethodInfo = {
  id: Method; label: string; subtitle: string; icon: string;
  processing: string; activation: string; fee?: string;
};

export function PaymentStartPage() {
  const [params] = useSearchParams();
  const dossierId = params.get("dossier") || params.get("dossierId");
  const [methods, setMethods] = useState<MethodInfo[] | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declaration, setDeclaration] = useState<any>(null);
  // Champs déclaration manuelle
  const [reference, setReference] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!dossierId) { setError("Aucun ID de dossier dans l'URL"); return; }
    const tk = getToken();
    if (!tk) {
      window.location.href = `/login?next=${encodeURIComponent(`/payment/start?dossier=${dossierId}`)}`;
      return;
    }
    fetch(`${apiBase()}/api/payment/methods/info`)
      .then(r => r.json())
      .then(d => { if (d.ok) setMethods(d.methods); })
      .catch(() => setMethods(null));
  }, [dossierId]);

  const startStripe = () => {
    if (!dossierId) return;
    setBusy(true); setError(null);
    const tk = getToken();
    fetch(`${apiBase()}/api/payment/checkout-session/${dossierId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` },
    })
      .then(r => r.json())
      .then((d: any) => {
        if (d.ok && d.url) { window.location.href = d.url; }
        else {
          const msg = d.error === "stripe_not_configured" ? "Stripe n'est pas configuré côté plateforme. Choisissez une autre méthode (TPE / Chèque / Virement)." :
                      d.error === "already_activated" ? "Pack déjà activé." :
                      d.error === "already_paid" ? "Paiement déjà reçu, en attente de validation admin." :
                      d.message || d.error || "Erreur";
          setError(msg); setBusy(false);
        }
      })
      .catch(e => { setError(e?.message || "Erreur réseau"); setBusy(false); });
  };

  const declareManual = (method: Method) => {
    if (!dossierId || method === "STRIPE") return;
    setBusy(true); setError(null);
    const tk = getToken();
    fetch(`${apiBase()}/api/payment/declare-manual/${dossierId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` },
      body: JSON.stringify({ method, reference: reference || undefined, expectedDate: expectedDate || undefined, note: note || undefined }),
    })
      .then(r => r.json())
      .then((d: any) => {
        if (d.ok) { setDeclaration(d); setBusy(false); }
        else { setError(d.message || d.error || "Erreur"); setBusy(false); }
      })
      .catch(e => { setError(e?.message || "Erreur réseau"); setBusy(false); });
  };

  if (!dossierId) {
    return (
      <div style={S.root}><div style={S.container}><div style={S.card}>
        <div style={S.icon}>⚠</div>
        <h1 style={S.title}>Aucun dossier indiqué</h1>
        <p style={S.sub}>L'URL ne contient pas d'identifiant de dossier.</p>
        <a href="/portal" style={S.btnDark}>📁 Retour à mes dossiers</a>
      </div></div></div>
    );
  }

  // ÉTAT 3 : déclaration manuelle effectuée → affiche les instructions de paiement
  if (declaration?.ok) {
    const ins = declaration.instructions || {};
    return (
      <div style={S.root}><div style={S.container}>
        <div style={S.card}>
          <div style={S.icon}>✅</div>
          <h1 style={S.title}>Déclaration enregistrée</h1>
          <p style={S.sub}>
            Nous avons noté votre intention de payer par <strong>{declaration.declaration?.method}</strong>.
            Suivez les instructions ci-dessous puis l'équipe CITURBAREA validera votre paiement
            à réception (24-72h après transaction selon la méthode).
          </p>
          <div style={S.successBox}>
            <strong>📋 Référence dossier : </strong>
            <code style={{ fontFamily: "ui-monospace,monospace", fontWeight: 700 }}>{dossierId.slice(0, 12)}…</code>
            <br />
            <strong>💰 Montant : </strong>
            {declaration.declaration?.amountMAD ? `${declaration.declaration.amountMAD.toLocaleString("fr-FR")} MAD` : "à confirmer"}
          </div>

          <h3 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: 20, color: NAVY, margin: "20px 0 10px" }}>
            🧭 Instructions {declaration.declaration?.method}
          </h3>
          {(ins.steps || []).map((step: string, i: number) => (
            <div key={i} style={S.instructionStep}>
              <strong style={{ color: GOLD, marginRight: 6 }}>{i + 1}.</strong>{step}
            </div>
          ))}

          {ins.warning && <div style={S.warningBox}>⚠ {ins.warning}</div>}

          {ins.contact && (
            <div style={{ marginTop: 14, padding: 14, background: "rgba(11,27,58,0.04)", borderRadius: 10, fontSize: 13, lineHeight: 1.6 }}>
              <strong>📞 Contact CITURBAREA</strong><br />
              {ins.contact.phone && <>Tel : <a href={`tel:${ins.contact.phone}`} style={{ color: NAVY, fontWeight: 700 }}>{ins.contact.phone}</a><br /></>}
              {ins.contact.email && <>Email : <a href={`mailto:${ins.contact.email}`} style={{ color: NAVY, fontWeight: 700 }}>{ins.contact.email}</a><br /></>}
              {ins.contact.hours && <>Horaires : {ins.contact.hours}</>}
            </div>
          )}

          <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="/portal" style={S.btnGold}>📁 Mes dossiers</a>
            <a href={`/payment/start?dossier=${dossierId}`} style={S.btnGhost}>Changer de méthode</a>
          </div>
        </div>
      </div></div>
    );
  }

  // ÉTAT 2 : méthode manuelle sélectionnée (TPE/Chèque/Virement) → form de déclaration
  if (selectedMethod && selectedMethod !== "STRIPE") {
    const m = methods?.find(x => x.id === selectedMethod);
    return (
      <div style={S.root}><div style={S.container}>
        <div style={S.card}>
          <button onClick={() => setSelectedMethod(null)} style={{ ...S.btnGhost, marginBottom: 18 }}>← Changer de méthode</button>
          <div style={S.eyebrow}>Méthode de paiement</div>
          <h1 style={S.title}>{m?.icon} {m?.label}</h1>
          <p style={S.sub}>{m?.subtitle}</p>

          <div style={{ background: "rgba(11,27,58,0.04)", padding: 14, borderRadius: 10, marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: "rgba(11,27,58,0.65)" }}>
              <strong>Traitement :</strong> {m?.processing}<br />
              <strong>Activation :</strong> {m?.activation}<br />
              {m?.fee && (<><strong>Frais :</strong> {m.fee}</>)}
            </div>
          </div>

          <p style={{ ...S.sub, marginBottom: 12 }}>
            Renseignez (optionnellement) la référence de votre paiement pour aider notre équipe à
            l'identifier rapidement quand il arrivera.
          </p>

          {selectedMethod === "CHEQUE_CERTIFIE" && (
            <div style={S.field}>
              <label style={S.label}>Numéro de chèque (si déjà émis)</label>
              <input style={S.input} type="text" placeholder="ex. 1234567" value={reference} onChange={e => setReference(e.target.value)} />
            </div>
          )}
          {selectedMethod === "VIREMENT_RIB" && (
            <div style={S.field}>
              <label style={S.label}>Référence virement (si déjà effectué)</label>
              <input style={S.input} type="text" placeholder="ex. VIR-2026-001" value={reference} onChange={e => setReference(e.target.value)} />
            </div>
          )}
          {selectedMethod === "TPE" && (
            <div style={S.field}>
              <label style={S.label}>Date souhaitée de passage au siège</label>
              <input style={S.input} type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
            </div>
          )}

          <div style={S.field}>
            <label style={S.label}>Note libre (optionnel)</label>
            <textarea style={{ ...S.input, minHeight: 80, fontFamily: "inherit", resize: "vertical" }} placeholder="Précisions (banque émettrice, créneau préféré, etc.)" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          {error && <div style={{ ...S.warningBox, borderLeftColor: "#dc2626", background: "rgba(220,38,38,0.06)", color: "#b91c1c" }}>⚠ {error}</div>}

          <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
            <button onClick={() => declareManual(selectedMethod)} disabled={busy} style={S.btnGold}>
              {busy ? "Enregistrement…" : "✓ Déclarer mon paiement"}
            </button>
            <button onClick={() => setSelectedMethod(null)} style={S.btnGhost}>Annuler</button>
          </div>
        </div>
      </div></div>
    );
  }

  // ÉTAT 1 : sélecteur de méthode
  return (
    <div style={S.root}><div style={S.container}>
      <div style={S.card}>
        <div style={S.eyebrow}>Paiement du dossier · 4 méthodes disponibles</div>
        <h1 style={S.title}>💳 Comment souhaitez-vous régler ?</h1>
        <p style={S.sub}>
          Choisissez la méthode qui vous convient. Les méthodes Stripe (en ligne) et TPE
          (au siège) confirment instantanément. Chèque certifié et virement RIB nécessitent
          une validation manuelle par notre équipe à réception (24-72h).
        </p>

        {error && <div style={{ ...S.warningBox, borderLeftColor: "#dc2626", background: "rgba(220,38,38,0.06)", color: "#b91c1c" }}>⚠ {error}</div>}

        <div style={S.methodsGrid}>
          {(methods || []).map(m => {
            const sel = selectedMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  if (m.id === "STRIPE") startStripe();
                  else setSelectedMethod(m.id);
                }}
                style={{ ...S.methodCard, ...(sel ? S.methodCardSel : {}) }}
                disabled={busy}
              >
                <div style={S.methodIcon}>{m.icon}</div>
                <div style={S.methodLabel}>{m.label}</div>
                <div style={S.methodSub}>{m.subtitle}</div>
                <div style={S.methodMeta}>
                  <div><strong>Traitement :</strong> {m.processing}</div>
                  <div><strong>Activation :</strong> {m.activation}</div>
                </div>
                {m.id === "STRIPE" && busy && <div style={{ marginTop: 10, color: GOLD, fontSize: 12, fontWeight: 700 }}>Redirection vers Stripe…</div>}
              </button>
            );
          })}
        </div>

        <div style={S.ref}>Dossier : {dossierId.slice(0, 12)}…</div>
      </div>
    </div></div>
  );
}

export function PaymentSuccessPage() {
  const t = useT();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const dossierId = params.get("dossierId");
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    fetch(`${apiBase()}/api/payment/session/${sessionId}/status?dossierId=${dossierId ?? ""}`, {
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    })
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => setStatus({ ok: false, error: "network" }))
      .finally(() => setLoading(false));
  }, [sessionId, dossierId]);

  return (
    <div style={S.root}><div style={S.container}>
      <div style={{ ...S.card, ...S.cardSuccess, textAlign: "center" }}>
        <div style={S.icon}>✅</div>
        <h1 style={{ ...S.title, color: "#166534" }}>{t("payment.success_title")}</h1>
        <p style={S.sub}>
          {t("payment.success_sub")}<br />
          {loading && <span style={{ color: "rgba(11,27,58,0.55)" }}>Vérification…</span>}
          {!loading && status?.ok && (
            <>
              <div style={{ fontSize: 32, fontFamily: "ui-monospace,monospace", fontWeight: 800, color: "#16a34a", margin: "14px 0" }}>
                {status.amountTotal} {status.currency?.toUpperCase()}
              </div>
              <span style={{ color: "#166534" }}>Statut : {status.paymentStatus === "paid" ? "Payé ✓" : status.paymentStatus}</span><br />
              <span style={{ color: "rgba(11,27,58,0.65)", fontSize: 12 }}>
                Votre dossier passe maintenant en attente de validation administrative.<br />
                Notre équipe activera votre pack sous 24h ouvrables.
              </span>
            </>
          )}
        </p>
        <div style={S.ref}>
          Session : {sessionId?.slice(0, 24)}…<br />
          Dossier : {dossierId?.slice(0, 12)}…
        </div>
        <div style={{ marginTop: 22, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/portal" style={S.btnGold}>📁 Mes dossiers</a>
          <a href="/" style={S.btnGhost}>Accueil</a>
        </div>
      </div>
    </div></div>
  );
}

export function PaymentCancelPage() {
  const t = useT();
  const [params] = useSearchParams();
  const dossierId = params.get("dossierId");
  return (
    <div style={S.root}><div style={S.container}>
      <div style={{ ...S.card, ...S.cardCancel, textAlign: "center" }}>
        <div style={S.icon}>↻</div>
        <h1 style={{ ...S.title, color: "#92400e" }}>{t("payment.cancel_title")}</h1>
        <p style={S.sub}>
          {t("payment.cancel_sub")}
        </p>
        <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {dossierId && <a href={`/payment/start?dossier=${dossierId}`} style={S.btnGold}>💳 {t("pay.now")}</a>}
          <a href="/portal" style={S.btnDark}>📁 {t("nav.my_dossiers")}</a>
        </div>
      </div>
    </div></div>
  );
}

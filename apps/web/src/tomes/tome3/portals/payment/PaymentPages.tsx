import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiBase, getToken } from "../../../tome4/apiClient";

/**
 * Pages /payment/success et /payment/cancel pour Stripe Checkout.
 *
 * Success: vérifie le statut de la session via /api/payment/session/:id/status,
 * affiche confirmation + ref dossier + prochaines étapes (validation admin sous 24h).
 *
 * Cancel: message simple, lien retour vers le dossier.
 */

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" },
  card: { maxWidth: 560, padding: "40px 32px", background: "#0d1217", border: "1px solid #1e2330", borderRadius: 16, textAlign: "center" as const },
  cardSuccess: { background: "#0d1a0d", borderColor: "#166534" },
  cardCancel: { background: "#1a1410", borderColor: "#92400e" },
  icon: { fontSize: 64, marginBottom: 18 },
  title: { fontSize: 24, fontWeight: 800, marginBottom: 12 },
  sub: { color: "#9ca3af", fontSize: 14, lineHeight: 1.7, marginBottom: 24 },
  amount: { fontSize: 32, fontFamily: "'DM Mono', monospace", fontWeight: 800, color: "#34d399", margin: "16px 0" },
  ref: { fontSize: 11, color: "#6b7280", marginTop: 12, fontFamily: "'DM Mono', monospace" },
  btn: { background: "#dc2626", color: "#fff", border: 0, padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block" },
  btnGhost: { background: "transparent", color: "#9ca3af", border: "1px solid #334155", padding: "10px 20px", borderRadius: 6, fontSize: 12, cursor: "pointer", textDecoration: "none", display: "inline-block", marginLeft: 8 },
};

export function PaymentStartPage() {
  const [params] = useSearchParams();
  const dossierId = params.get("dossier") || params.get("dossierId");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dossierId) { setError("Aucun ID de dossier dans l'URL"); setLoading(false); return; }
    const tk = getToken();
    if (!tk) {
      window.location.href = `/login?next=${encodeURIComponent(`/payment/start?dossier=${dossierId}`)}`;
      return;
    }
    fetch(`${apiBase()}/api/payment/checkout-session/${dossierId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk}` },
    })
      .then(r => r.json())
      .then((d: any) => {
        if (d.ok && d.url) {
          window.location.href = d.url;
        } else if (d.error === "stripe_not_configured") {
          setError("Le paiement Stripe n'est pas encore configuré côté plateforme. Vous serez recontacté par email pour finaliser le paiement.");
          setLoading(false);
        } else if (d.error === "already_activated") {
          setError("Ce pack est déjà activé — aucun paiement n'est nécessaire.");
          setLoading(false);
        } else if (d.error === "already_paid") {
          setError("Le paiement a déjà été reçu et est en attente de validation administrative (sous 24h).");
          setLoading(false);
        } else {
          setError(d.message || d.error || "Erreur de création de session");
          setLoading(false);
        }
      })
      .catch(e => { setError(e?.message || "Erreur réseau"); setLoading(false); });
  }, [dossierId]);

  return (
    <div style={S.root}>
      <div style={S.card}>
        {loading ? (
          <>
            <div style={S.icon}>💳</div>
            <div style={S.title}>Préparation du paiement…</div>
            <div style={S.sub}>Redirection vers la page de paiement sécurisée Stripe.</div>
          </>
        ) : (
          <>
            <div style={{ ...S.icon, color: "#fbbf24" }}>⚠</div>
            <div style={{ ...S.title, color: "#fbbf24" }}>Paiement non disponible</div>
            <div style={S.sub}>{error}</div>
            <a href="/portal" style={S.btn}>📁 Retour à mes dossiers</a>
          </>
        )}
      </div>
    </div>
  );
}

export function PaymentSuccessPage() {
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
    <div style={S.root}>
      <div style={{ ...S.card, ...S.cardSuccess }}>
        <div style={S.icon}>✅</div>
        <div style={{ ...S.title, color: "#4ade80" }}>Paiement reçu</div>
        <div style={S.sub}>
          Merci pour votre paiement. CITURBAREA a bien reçu votre règlement.<br/><br/>
          {loading && <span style={{ color: "#6b7280" }}>Vérification du paiement…</span>}
          {!loading && status?.ok && (
            <>
              <div style={S.amount}>{status.amountTotal} {status.currency?.toUpperCase()}</div>
              <span style={{ color: "#a7f3d0" }}>Statut : {status.paymentStatus === "paid" ? "Payé ✓" : status.paymentStatus}</span><br/>
              <span style={{ color: "#9ca3af", fontSize: 12 }}>
                Votre dossier passe maintenant en attente de validation administrative.<br/>
                Notre équipe activera votre pack sous 24h ouvrables et vous recevrez confirmation par email.
              </span>
            </>
          )}
          {!loading && !status?.ok && (
            <span style={{ color: "#fca5a5" }}>
              ⚠ Impossible de vérifier le statut. Le paiement est en cours de confirmation par Stripe.<br/>
              Vous recevrez un email dès que votre pack sera activé.
            </span>
          )}
        </div>
        <div style={S.ref}>
          Session : {sessionId?.slice(0, 24)}…<br/>
          Dossier : {dossierId?.slice(0, 12)}…
        </div>
        <div style={{ marginTop: 24 }}>
          <a href="/portal" style={S.btn}>📁 Mes dossiers</a>
          <a href="/" style={S.btnGhost}>Accueil</a>
        </div>
      </div>
    </div>
  );
}

export function PaymentCancelPage() {
  const [params] = useSearchParams();
  const dossierId = params.get("dossierId");
  return (
    <div style={S.root}>
      <div style={{ ...S.card, ...S.cardCancel }}>
        <div style={S.icon}>↻</div>
        <div style={{ ...S.title, color: "#fbbf24" }}>Paiement annulé</div>
        <div style={S.sub}>
          Votre paiement a été annulé ou interrompu.<br/>
          Aucun montant n'a été prélevé. Votre dossier reste enregistré et vous pouvez reprendre le paiement à tout moment.
        </div>
        <div style={{ marginTop: 16 }}>
          <a href={dossierId ? `/portal` : "/"} style={S.btn}>📁 Mes dossiers</a>
          <a href="/" style={S.btnGhost}>Accueil</a>
        </div>
      </div>
    </div>
  );
}

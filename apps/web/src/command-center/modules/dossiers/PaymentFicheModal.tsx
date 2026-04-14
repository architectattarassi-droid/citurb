import React from "react";

interface Props {
  payment: {
    id: string;
    mode: string;
    amount: number;
    currency: string;
    ref?: string | null;
    notes?: string | null;
    createdAt: string;
  };
  dossier: {
    id: string;
    title?: string | null;
    commune?: string | null;
  };
  onClose: () => void;
}

export default function PaymentFicheModal({ payment, dossier, onClose }: Props) {
  const emittedAt = new Date().toLocaleDateString("fr-MA", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const paymentDate = new Date(payment.createdAt).toLocaleDateString("fr-MA", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const modeLabel = payment.mode === "CHEQUE" ? "Chèque bancaire" : "Espèces (CASH)";

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #fiche-print, #fiche-print * { visibility: visible !important; }
          #fiche-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Overlay */}
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}>
        {/* Controls */}
        <div style={{
          position: "absolute", top: 24, right: 24, display: "flex", gap: 8,
        }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: "8px 18px", background: "#1e3a8a", color: "#fff",
              border: "none", borderRadius: 6, cursor: "pointer",
              fontSize: 13, fontWeight: 700,
            }}
          >
            🖨️ Imprimer
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px", background: "#374151", color: "#e5e7eb",
              border: "none", borderRadius: 6, cursor: "pointer",
              fontSize: 13, fontWeight: 700,
            }}
          >
            ✕ Fermer
          </button>
        </div>

        {/* Fiche A4 */}
        <div
          id="fiche-print"
          style={{
            background: "#fff", color: "#111", width: "210mm", minHeight: "160mm",
            padding: "32px 40px", borderRadius: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            fontFamily: "Georgia, serif", fontSize: 13, lineHeight: 1.6,
            maxHeight: "90vh", overflowY: "auto",
          }}
        >
          {/* En-tête */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, borderBottom: "2px solid #1e3a8a", paddingBottom: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#1e3a8a", letterSpacing: 1 }}>
                CITURBAREA
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                Bureau d'Architecture &amp; Urbanisme — Kénitra, Maroc
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "#64748b" }}>
              <div style={{ fontWeight: 700 }}>FICHE DE PAIEMENT</div>
              <div>Émise le : {emittedAt}</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, marginTop: 4, color: "#94a3b8" }}>
                Réf. interne : {payment.id.slice(0, 12).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Dossier */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Informations dossier
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "4px 0", color: "#475569", width: "40%" }}>Référence dossier</td>
                  <td style={{ padding: "4px 0", fontWeight: 700, fontFamily: "monospace" }}>{dossier.id.slice(0, 16).toUpperCase()}</td>
                </tr>
                {dossier.title && (
                  <tr>
                    <td style={{ padding: "4px 0", color: "#475569" }}>Intitulé du projet</td>
                    <td style={{ padding: "4px 0", fontWeight: 600 }}>{dossier.title}</td>
                  </tr>
                )}
                {dossier.commune && (
                  <tr>
                    <td style={{ padding: "4px 0", color: "#475569" }}>Commune</td>
                    <td style={{ padding: "4px 0" }}>{dossier.commune}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: "4px 0", color: "#475569" }}>Date de paiement</td>
                  <td style={{ padding: "4px 0" }}>{paymentDate}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Paiement */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "16px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              Détail du paiement
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "5px 0", color: "#475569", width: "40%" }}>Mode de règlement</td>
                  <td style={{ padding: "5px 0", fontWeight: 700 }}>{modeLabel}</td>
                </tr>
                <tr>
                  <td style={{ padding: "5px 0", color: "#475569" }}>Montant</td>
                  <td style={{ padding: "5px 0", fontWeight: 900, fontSize: 16, color: "#1e3a8a" }}>
                    {payment.amount.toLocaleString("fr-MA")} {payment.currency}
                  </td>
                </tr>
                {payment.ref && (
                  <tr>
                    <td style={{ padding: "5px 0", color: "#475569" }}>
                      {payment.mode === "CHEQUE" ? "N° chèque" : "Référence caisse"}
                    </td>
                    <td style={{ padding: "5px 0", fontFamily: "monospace", fontWeight: 700 }}>{payment.ref}</td>
                  </tr>
                )}
                {payment.notes && (
                  <tr>
                    <td style={{ padding: "5px 0", color: "#475569", verticalAlign: "top" }}>Notes</td>
                    <td style={{ padding: "5px 0", fontStyle: "italic", color: "#475569" }}>{payment.notes}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* RIB / Instructions */}
          <div style={{ marginBottom: 28, fontSize: 12, color: "#475569", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "10px 16px" }}>
            <strong>Instructions de règlement :</strong> Ce paiement est à effectuer directement à l'agence CITURBAREA Kénitra
            (ou par remise de chèque à l'ordre de <strong>CITURBAREA</strong>). Conservez ce document comme justificatif.
          </div>

          {/* Signatures */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 48, fontWeight: 700 }}>
                Cachet &amp; signature client
              </div>
              <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 6, fontSize: 11, color: "#94a3b8" }}>
                Nom &amp; signature
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 48, fontWeight: 700 }}>
                Cachet &amp; signature agence
              </div>
              <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 6, fontSize: 11, color: "#94a3b8" }}>
                CITURBAREA — Kénitra
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

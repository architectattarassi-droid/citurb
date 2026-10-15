/**
 * « Recevoir mon lien d'accès » — le client indique l'e-mail ou le téléphone donné
 * à CITURBAREA (POST /api/client/acces/demande). Réponse identique que le compte
 * existe ou non : aucune information n'est divulguée. Lot 3a.
 */
import React, { useState } from "react";
import { useT } from "../../i18n/i18n";
import { HONEYPOT_STYLE } from "../../lib/honeypot";

export default function RecevoirLien() {
  const t = useT();
  const [valeur, setValeur] = useState("");
  const [piege, setPiege] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "ok" | "invalide" | "erreur">("saisie");

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = valeur.trim();
    const estEmail = v.includes("@");
    if (estEmail ? !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) : v.replace(/\D/g, "").length < 9) { setEtat("invalide"); return; }
    setEtat("envoi");
    try {
      const r = await fetch("/api/client/acces/demande", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(estEmail ? { email: v, website: piege } : { telephone: v, website: piege }),
      });
      setEtat(r.ok ? "ok" : r.status === 400 ? "invalide" : "erreur");
    } catch { setEtat("erreur"); }
  };

  if (etat === "ok") return <p style={S.ok} role="status">{t("espace.recevoir.ok")}</p>;
  return (
    <form onSubmit={envoyer} style={S.form} noValidate>
      <label style={S.label} htmlFor="lien-client">{t("espace.recevoir.champ")}</label>
      <div style={S.ligne}>
        <input id="lien-client" style={S.input} value={valeur} onChange={(e) => { setValeur(e.target.value); if (etat !== "envoi") setEtat("saisie"); }}
          autoComplete="email" inputMode="email" dir="ltr" />
        <button type="submit" style={S.btn} disabled={etat === "envoi"}>{etat === "envoi" ? t("espace.recevoir.envoi") : t("espace.recevoir.envoyer")}</button>
      </div>
      <input tabIndex={-1} aria-hidden="true" autoComplete="off" style={HONEYPOT_STYLE} value={piege} onChange={(e) => setPiege(e.target.value)} name="website" />
      {etat === "invalide" && <p style={S.err} role="alert">{t("espace.recevoir.invalide")}</p>}
      {etat === "erreur" && <p style={S.err} role="alert">{t("espace.recevoir.erreur")}</p>}
    </form>
  );
}

const S: Record<string, React.CSSProperties> = {
  form: { display: "grid", gap: 6, marginTop: 12 },
  label: { fontSize: 13, fontWeight: 600, color: "#0B1B3A" },
  ligne: { display: "flex", flexWrap: "wrap", gap: 8 },
  input: { flex: "1 1 180px", minWidth: 0, minHeight: 44, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(11,27,58,0.25)", fontSize: 16, boxSizing: "border-box" },
  btn: { minHeight: 44, padding: "10px 16px", borderRadius: 10, border: "none", background: "#C9A227", color: "#0B1B3A", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  ok: { margin: "12px 0 0", padding: "10px 12px", borderRadius: 10, background: "#ECFDF3", color: "#166534", fontSize: 14, lineHeight: 1.5 },
  err: { margin: 0, color: "#B42318", fontSize: 13 },
};

/**
 * Documents justificatifs du pro (registre du commerce, ICE, attestations,
 * assurances, agréments…) : lien https sécurisé ou note de transmission,
 * vérifiés par l'administration, jamais publiés. Liste attendue selon le
 * type de société (domain/cercles/gabarits.ts).
 */
import React, { useState } from "react";
import { DOCUMENTS, TYPES_SOCIETE, type DocumentPro } from "../../domain/cercles/gabarits";
import { apiFournisseurs, codeErreur, type FournisseurPrive } from "./api";
import { useTextes } from "./textes";
import { Champ, T } from "./ui";

const COULEUR: Record<string, string> = { DEPOSE: T.warn, VERIFIE: T.success, REFUSE: T.danger };

export default function DocumentsPro({ f, recharger }: { f: FournisseurPrive; recharger: () => void }) {
  const x = useTextes();
  const type = TYPES_SOCIETE[f.metier];
  const attendus = type?.documents || Object.keys(DOCUMENTS);
  const [docs, setDocs] = useState<DocumentPro[]>(f.documents || []);
  const [v, setV] = useState({ type: attendus[0] || "AUTRE", url: "", note: "", expireLe: "" });
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function deposer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(""); setEnvoi(true);
    try {
      const r = await apiFournisseurs.deposerDocument({ type: v.type, url: v.url || undefined, note: v.note || undefined, expireLe: v.expireLe || undefined });
      setDocs(r.documents); setV({ ...v, url: "", note: "", expireLe: "" }); recharger();
    } catch (err) { setErreur(x.erreur(codeErreur(err))); } finally { setEnvoi(false); }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="frn-carte" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: T.navy }}>{x.t("docTitre")}</h2>
        <p style={{ margin: 0, color: T.inkMid, fontSize: 14 }}>{x.t("docChapo")}</p>
        {!!type?.documentsObligatoires.length && (
          <p style={{ margin: 0, fontSize: 14 }}>{x.t("docAttendus", { liste: type.documentsObligatoires.map((d) => x.l3(DOCUMENTS[d])).join(" · ") })}</p>
        )}
        {!docs.length ? <p style={{ margin: 0 }}>{x.t("docAucun")}</p> : (
          <ul className="frn-liste" style={{ listStyle: "none", paddingInlineStart: 0 }}>
            {docs.map((d) => (
              <li key={d.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderBottom: `1px solid ${T.borderSoft}` }}>
                <strong>{x.l3(DOCUMENTS[d.type])}</strong>
                <span className="frn-badge" style={{ color: COULEUR[d.statut], background: T.bgSoft }}>{x.t(`docSt_${d.statut}`)}</span>
                {d.expireLe && <small>{x.t("docExpireLe", { d: x.date(d.expireLe) })}</small>}
                {d.url && <a href={d.url} target="_blank" rel="noreferrer noopener" dir="ltr" style={{ fontSize: 13 }}>{new URL(d.url).hostname}</a>}
                {d.note && <small style={{ color: T.inkMid }}>{d.note}</small>}
                {d.motif && <small style={{ color: T.danger }}>{x.t("motif", { m: d.motif })}</small>}
                {d.statut !== "VERIFIE" && (
                  <button className="frn-btn frn-btn-ghost frn-btn-petit" style={{ marginInlineStart: "auto" }} onClick={async () => {
                    try { setDocs((await apiFournisseurs.retirerDocument(d.id)).documents); recharger(); } catch (err) { setErreur(x.erreur(codeErreur(err))); }
                  }}>{x.t("retirer")}</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className="frn-carte" onSubmit={deposer} style={{ display: "grid", gap: 12 }}>
        <div className="frn-grille2">
          <Champ label={x.t("docType")}>
            <select className="frn-input" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>
              {attendus.map((d) => <option key={d} value={d}>{x.l3(DOCUMENTS[d])}{type?.documentsObligatoires.includes(d) ? ` (${x.t("docObligatoire")})` : ""}</option>)}
            </select>
          </Champ>
          <Champ label={x.t("docExpire")} aide={x.t("facultatif")}><input className="frn-input" type="date" value={v.expireLe} onChange={(e) => setV({ ...v, expireLe: e.target.value })} /></Champ>
          <Champ label={x.t("docUrl")}><input className="frn-input" type="url" dir="ltr" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://…" /></Champ>
          <Champ label={x.t("docNote")}><input className="frn-input" value={v.note} maxLength={300} onChange={(e) => setV({ ...v, note: e.target.value })} /></Champ>
        </div>
        {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
        <div><button className="frn-btn" disabled={envoi || (!v.url && !v.note)}>{envoi ? x.t("envoi") : x.t("docDeposer")}</button></div>
      </form>
    </div>
  );
}

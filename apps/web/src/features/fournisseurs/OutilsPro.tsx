/**
 * Onglet « Outils pro » de l'espace : outils réservés aux membres Premium ou
 * agréés par CITURBAREA (domain/cercles/accesPro.ts). Le contrôle est fait
 * par le serveur (403 acces_reserve) ; cet écran montre l'état de chaque outil
 * et permet de demander l'accès (la demande arrive à l'admin, aucune coordonnée).
 */
import React, { useEffect, useState } from "react";
import { LISTE_OUTILS, MESSAGE_RESERVE, OUTILS_PRO, type OutilPro } from "../../domain/cercles/accesPro";
import { unite3 } from "../../domain/cercles/libelles";
import { apiFournisseurs, codeErreur, type AccesPro, type FournisseurPrive, type LignePositionPrix } from "./api";
import { useTextes } from "./textes";
import { T } from "./ui";

export default function OutilsPro({ f, recharger }: { f: FournisseurPrive; recharger: () => void }) {
  const x = useTextes();
  const [acces, setAcces] = useState<AccesPro>(f.acces);
  const [erreur, setErreur] = useState("");
  const etat = (o: OutilPro) => acces.outils.find((y) => y.outil === o);

  async function demander(o: OutilPro) {
    setErreur("");
    try { setAcces((await apiFournisseurs.demanderAcces(o)).acces); recharger(); } catch (e) { setErreur(x.erreur(codeErreur(e))); }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ margin: 0, color: T.inkMid, fontSize: 14 }}>{x.t("outilsChapo")}</p>
      {acces.premium && <div className="frn-alerte frn-ok">{x.t("outilsPremium")}</div>}
      {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
      {LISTE_OUTILS.map((o) => {
        const e = etat(o);
        return (
          <section key={o} className="frn-carte" style={{ display: "grid", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 17, color: T.navy }}>{x.l3(OUTILS_PRO[o].libelle)}</h2>
            {e?.actif ? (
              <>
                <small style={{ color: T.success }}>
                  {e.source === "premium" ? x.t("outilViaPremium") : x.t("outilAccorde", { d: x.date(e.depuis) })}
                  {e.expireLe ? ` · ${x.t("outilJusquau", { d: x.date(e.expireLe) })}` : ""}
                </small>
                {o === "MATERIAUTHEQUE_PRO" ? <PositionPrix /> : <div className="frn-alerte frn-info">{x.t("outilEnPreparation")}</div>}
              </>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <div className="frn-alerte frn-warn">{x.l3(MESSAGE_RESERVE)}</div>
                {e?.demandeLe
                  ? <small>{x.t("demandeEnvoyee", { d: x.date(e.demandeLe) })}</small>
                  : <div><button className="frn-btn frn-btn-or frn-btn-petit" disabled={f.statut !== "APPROVED"} onClick={() => demander(o)}>{x.t("demanderAcces")}</button></div>}
                {f.statut !== "APPROVED" && <small style={{ color: T.inkMuted }}>{x.t("outilApresVerification")}</small>}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Matériauthèque pro : ma position face au marché de la région (agrégats à partir de 3 fournisseurs). */
function PositionPrix() {
  const x = useTextes();
  const [lignes, setLignes] = useState<LignePositionPrix[] | null>(null);
  const [erreur, setErreur] = useState("");
  useEffect(() => {
    apiFournisseurs.positionPrix().then((r) => setLignes(r.lignes)).catch((e) => { setErreur(x.erreur(codeErreur(e))); setLignes([]); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (lignes === null) return <p>{x.t("chargement")}</p>;
  if (erreur) return <div className="frn-alerte frn-ko">{erreur}</div>;
  if (!lignes.length) return <small>{x.t("mpAucun")}</small>;
  return (
    <div className="frn-defil">
      <table className="frn-table frn-cartes-mobile">
        <thead><tr><th>{x.t("col_materiau")}</th><th>{x.t("mpMonPrix")}</th><th>{x.t("mpMarche")}</th><th>{x.t("mpEcart")}</th></tr></thead>
        <tbody>
          {lignes.map((l) => {
            const u = l.uniteRef ? x.l3(unite3(l.uniteRef)) : "";
            return (
              <tr key={l.code}>
                <td data-l={x.t("col_materiau")}><span lang="fr">{l.libelle}</span><br /><small style={{ color: T.inkMuted }}>{l.code}</small></td>
                <td data-l={x.t("mpMonPrix")}>{x.dh(l.monPrix, 3)} / {u}</td>
                <td data-l={x.t("mpMarche")}>{l.marche?.mediane != null
                  ? `${x.dh(l.marche.mediane, 3)} (${x.dh(l.marche.min, 3)} – ${x.dh(l.marche.max, 3)}) · ${x.t("mpFournisseurs", { n: l.marche.nbFournisseurs })}`
                  : x.t("mpConfidentiel", { n: l.marche?.nbFournisseurs ?? 1 })}</td>
                <td data-l={x.t("mpEcart")} style={{ color: l.ecartMediane == null ? undefined : l.ecartMediane > 0.1 ? T.warn : T.success }}>
                  {l.ecartMediane == null ? "—" : `${l.ecartMediane > 0 ? "+" : ""}${Math.round(l.ecartMediane * 100)} %`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

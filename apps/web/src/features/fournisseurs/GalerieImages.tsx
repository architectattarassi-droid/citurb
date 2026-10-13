/**
 * Galerie de photos d'une fiche (produit, prestation ou société) dans l'espace
 * pro : ajout (réduction et nettoyage dans le navigateur), ordre, légende
 * FR/AR, image principale, retrait, statut de vérification et quota.
 */
import React, { useCallback, useEffect, useState } from "react";
import { apiFournisseurs, codeErreur, type ImagePro, type QuotaImages } from "./api";
import { preparerImage } from "./imagesNavigateur";
import { useTextes } from "./textes";
import { BadgeStatut, T } from "./ui";

export default function GalerieImages({ objetType, objetId, titre }: { objetType: "PRODUIT" | "SERVICE" | "SOCIETE"; objetId: string | null; titre?: string }) {
  const x = useTextes();
  const [images, setImages] = useState<ImagePro[]>([]);
  const [quota, setQuota] = useState<QuotaImages | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    if (!objetId) return;
    try {
      const r = await apiFournisseurs.images();
      setImages(r.images.filter((i) => i.objetType === objetType && i.objetId === objetId).sort((a, b) => Number(b.principale) - Number(a.principale) || a.ordre - b.ordre));
      setQuota(r.quota);
    } catch (e) { setErreur(x.erreur(codeErreur(e))); }
  }, [objetType, objetId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void charger(); }, [charger]);

  if (!objetId) return <div className="frn-alerte frn-info">{x.t("imgEnregistrerDabord")}</div>;

  async function ajouter(fichiers: FileList | null) {
    if (!fichiers?.length || !objetId) return;
    setErreur(""); setEnvoi(true);
    try {
      for (const fi of Array.from(fichiers)) {
        let pret;
        try { pret = await preparerImage(fi); } catch (e) { setErreur(x.erreur((e as Error).message === "trop_lourde" ? "image_trop_lourde" : "image_type_invalide")); continue; }
        try { await apiFournisseurs.deposerImage({ objetType, objetId, image: pret.image, vignette: pret.vignette }); }
        catch (e) { setErreur(x.erreur(codeErreur(e))); break; }
        finally { URL.revokeObjectURL(pret.apercu); }
      }
    } finally { setEnvoi(false); void charger(); }
  }
  async function action(f: () => Promise<unknown>) {
    setErreur("");
    try { await f(); } catch (e) { setErreur(x.erreur(codeErreur(e))); }
    void charger();
  }
  const deplacer = (i: number, sens: -1 | 1) => {
    const j = i + sens;
    if (j < 0 || j >= images.length) return;
    void action(async () => { await apiFournisseurs.majImage(images[i].id, { ordre: images[j].ordre }); await apiFournisseurs.majImage(images[j].id, { ordre: images[i].ordre }); });
  };

  return (
    <fieldset className="frn-fieldset" style={{ display: "grid", gap: 10 }}>
      <legend>{titre || x.t("imgTitre")}</legend>
      <small style={{ color: T.inkMid }}>{x.t("imgAide")}</small>
      {quota && <small style={{ color: T.inkMuted }}>{x.t("imgQuota", { nb: quota.nb, max: quota.maxNb, mo: x.nb(quota.octets / 1048576, 1), maxMo: Math.round(quota.maxOctets / 1048576) })}</small>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
        {images.map((im, i) => (
          <div key={im.id} style={{ border: `1px solid ${im.principale ? T.or : T.borderSoft}`, borderRadius: 8, padding: 8, display: "grid", gap: 6, background: "#fff" }}>
            <img src={im.vignette} alt={im.legendeFr || im.legendeAr || ""} loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 6, background: T.bgSoft }} />
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <BadgeStatut statut={im.statut} offre />
              {im.principale ? <span className="frn-etiquette">{x.t("imgPrincipale")}</span>
                : <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" onClick={() => action(() => apiFournisseurs.majImage(im.id, { principale: true }))}>{x.t("imgDefinirPrincipale")}</button>}
            </div>
            {im.motifRejet && <small style={{ color: T.danger }}>{x.t("motif", { m: im.motifRejet })}</small>}
            <input className="frn-input" dir="ltr" lang="fr" placeholder={x.t("imgLegendeFr")} aria-label={x.t("imgLegendeFr")} defaultValue={im.legendeFr || ""} maxLength={140}
              onBlur={(e) => e.target.value !== (im.legendeFr || "") && action(() => apiFournisseurs.majImage(im.id, { legendeFr: e.target.value }))} />
            <input className="frn-input" dir="rtl" lang="ar" placeholder={x.t("imgLegendeAr")} aria-label={x.t("imgLegendeAr")} defaultValue={im.legendeAr || ""} maxLength={140}
              onBlur={(e) => e.target.value !== (im.legendeAr || "") && action(() => apiFournisseurs.majImage(im.id, { legendeAr: e.target.value }))} />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" disabled={i === 0} onClick={() => deplacer(i, -1)} aria-label={x.t("imgAvant")}>{x.lang === "ar" ? "→" : "←"}</button>
              <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" disabled={i === images.length - 1} onClick={() => deplacer(i, 1)} aria-label={x.t("imgApres")}>{x.lang === "ar" ? "←" : "→"}</button>
              <button type="button" className="frn-btn frn-btn-ghost frn-btn-petit" style={{ marginInlineStart: "auto" }}
                onClick={() => window.confirm(x.t("confirmerRetrait", { x: x.t("imgTitre") })) && action(() => apiFournisseurs.retirerImage(im.id))}>{x.t("retirer")}</button>
            </div>
          </div>
        ))}
      </div>
      {erreur && <div className="frn-alerte frn-ko" role="alert">{erreur}</div>}
      <div>
        <label className="frn-btn frn-btn-ghost" aria-disabled={envoi}>
          {envoi ? x.t("imgPreparation") : x.t("imgAjouter")}
          <input type="file" accept="image/*" multiple disabled={envoi} style={{ display: "none" }} onChange={(e) => { void ajouter(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
    </fieldset>
  );
}

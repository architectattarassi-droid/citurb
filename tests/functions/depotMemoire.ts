/** Dépôt en mémoire (même contrat que depotNeon + depotCatalogueNeon) pour tester la logique Cercles sans base. */
import type { DepotComplet, Ligne } from "../../functions/_lib/fournisseursDepot";

export function depotMemoire() {
  const fournisseurs = new Map<string, Ligne>();
  const prix = new Map<string, Ligne>();
  const historique: Ligne[] = [];
  const produits = new Map<string, Ligne>();
  const services = new Map<string, Ligne>();
  const codes = new Map<string, Ligne>();
  const leads: Ligne[] = [];
  const images = new Map<string, Ligne>();
  /** Métadonnées sans les octets (comme les lectures Neon). */
  const meta = (i: Ligne) => { const { octets: _o, vignette: _v, ...m } = i; void _o; void _v; return m; };
  const hexB64 = (h: string) => btoa(String.fromCharCode(...(h.match(/../g) || []).map((x) => parseInt(x, 16))));
  const octets = (i: Ligne, vignette: boolean) => ({ base64: hexB64(String(vignette ? i.vignette : i.octets)), type: String(vignette ? i.vignetteType : i.type), empreinte: String(i.empreinte) });
  const imagePubliable = (i: Ligne, fictifs: boolean) => {
    const f = fournisseurs.get(String(i.fournisseurId));
    if (i.statut !== "APPROVED" || !f || f.statut !== "APPROVED" || (!fictifs && (f.meta as Ligne | undefined)?.fictif === true)) return false;
    if (i.objetType === "PRODUIT") return produits.get(String(i.objetId))?.statut === "APPROVED";
    if (i.objetType === "SERVICE") return services.get(String(i.objetId))?.statut === "APPROVED";
    return i.objetType === "SOCIETE";
  };
  const maintenant = () => new Date().toISOString();
  const approuve = (fid: unknown) => fournisseurs.get(String(fid))?.statut === "APPROVED";
  /** Fournisseur publiable : approuvé et, hors aperçu, non fictif (meta.fictif). */
  const publiable = (fid: unknown, fictifs: boolean) => approuve(fid) && (fictifs || (fournisseurs.get(String(fid))!.meta as Ligne | undefined)?.fictif !== true);
  const avecF = (l: Ligne) => {
    const f = fournisseurs.get(String(l.fournisseurId))!;
    return { ...l, fSlug: f.slug, fNom: f.raisonSociale, fNomAr: f.raisonSocialeAr ?? null, fVille: f.ville, fRegion: f.region, fZones: f.zonesLivraison, fMetier: f.metier, fDocuments: f.documents ?? [] };
  };
  const pourAdmin = (l: Ligne) => { const f = fournisseurs.get(String(l.fournisseurId))!; return { ...l, raisonSociale: f.raisonSociale, ville: f.ville, metier: f.metier, statutFournisseur: f.statut }; };
  const activite = (fid: string) => {
    const l = [...prix.values(), ...produits.values(), ...services.values()].filter((x) => x.fournisseurId === fid && x.statut === "APPROVED");
    return { offresApprouvees: l.length, plusRecente: l.map((x) => String(x.updatedAt)).sort().reverse()[0] ?? null };
  };

  const depot: DepotComplet = {
    fParId: async (id) => fournisseurs.get(id) ?? null,
    fParEmail: async (email) => [...fournisseurs.values()].find((f) => f.email === email) ?? null,
    fParIdempotence: async (cle) => [...fournisseurs.values()].find((f) => f.idempotencyKey === cle) ?? null,
    fSlugPris: async (slug) => [...fournisseurs.values()].some((f) => f.slug === slug),
    fInserer: async (f) => {
      fournisseurs.set(f.id, { ...f, statut: "PENDING", createdAt: maintenant(), updatedAt: maintenant(), codeTentatives: 0, codeHash: null, codeExpire: null, fiche: {}, documents: [], formule: "GRATUIT", acces: {}, accesDemandes: [] });
    },
    fMajCode: async (id, hash, expire, meta) => {
      const f = fournisseurs.get(id)!;
      Object.assign(f, { codeHash: hash, codeExpire: expire, codeTentatives: 0, meta: { ...(f.meta as Ligne), ...(meta || {}) } });
    },
    fTentative: async (id) => { const f = fournisseurs.get(id)!; f.codeTentatives = Number(f.codeTentatives) + 1; },
    fConnecte: async (id) => {
      const f = fournisseurs.get(id)!;
      const meta = { ...(f.meta as Ligne) };
      delete meta.codeDemandeLe;
      Object.assign(f, { codeHash: null, codeExpire: null, codeTentatives: 0, derniereConnexion: maintenant(), meta });
    },
    fMajProfil: async (id, p) => { const f = fournisseurs.get(id); if (!f) return null; Object.assign(f, p); return f; },
    fModerer: async (id, statut, motif, commissionPct, evenement) => {
      const f = fournisseurs.get(id);
      if (!f) return null;
      Object.assign(f, { statut, motifRejet: motif, events: [...((f.events as unknown[]) || []), evenement] });
      if (commissionPct !== undefined) f.commissionPct = commissionPct;
      return f;
    },
    fLister: async (statut) => [...fournisseurs.values()].filter((f) => !statut || f.statut === statut)
      .map((f) => {
        const a = activite(String(f.id));
        return { ...f, nbFiches: [...prix.values()].filter((p) => p.fournisseurId === f.id).length, nbOffresApprouvees: a.offresApprouvees, derniereOffre: a.plusRecente };
      }),
    fMajDocuments: async (id, documents, evenement) => {
      const f = fournisseurs.get(id);
      if (!f) return null;
      Object.assign(f, { documents, events: [...((f.events as unknown[]) || []), ...(evenement ? [evenement] : [])] });
      return f;
    },
    fMajAcces: async (id, acces, demandes, evenement) => {
      const f = fournisseurs.get(id);
      if (!f) return null;
      Object.assign(f, { acces, accesDemandes: demandes, events: [...((f.events as unknown[]) || []), ...(evenement ? [evenement] : [])] });
      return f;
    },
    fMajFormule: async (id, formule) => { const f = fournisseurs.get(id); if (!f) return null; f.formule = formule; return f; },

    pLister: async (fid) => [...prix.values()].filter((p) => p.fournisseurId === fid),
    pParMateriau: async (fid, code) => [...prix.values()].find((p) => p.fournisseurId === fid && p.materiauCode === code) ?? null,
    pEnregistrer: async (f) => {
      const avant = prix.get(f.id);
      const l = { ...(avant || { createdAt: maintenant() }), ...f, updatedAt: maintenant(), moderePar: null, modereLe: null };
      prix.set(f.id, l);
      return l;
    },
    pSupprimer: async (fid, id) => { const p = prix.get(id); if (!p || p.fournisseurId !== fid) return null; prix.delete(id); return p; },
    pHistoriser: async (h) => { historique.push({ ...h, at: maintenant() }); },
    pHistorique: async (priceId) => historique.filter((h) => h.priceId === priceId).reverse(),
    pAModerer: async () => [...prix.values()].filter((p) => p.statut === "PENDING" || (p.signalement && !p.moderePar))
      .map((p) => { const f = fournisseurs.get(String(p.fournisseurId))!; return { ...p, raisonSociale: f.raisonSociale, ville: f.ville, statutFournisseur: f.statut }; }),
    pModerer: async (id, statut, auteur) => { const p = prix.get(id); if (!p) return null; Object.assign(p, { statut, moderePar: auteur, modereLe: maintenant() }); return p; },

    prLister: async (fid) => [...produits.values()].filter((p) => p.fournisseurId === fid),
    prParId: async (id) => produits.get(id) ?? null,
    prSlugPris: async (slug) => [...produits.values()].some((p) => p.slug === slug),
    prEnregistrer: async (p, ev) => {
      const avant = produits.get(p.id);
      if (avant && avant.fournisseurId !== p.fournisseurId) throw new Error("conflit de propriétaire");
      const l = { ...(avant || { createdAt: maintenant(), events: [] }), ...p, updatedAt: maintenant(), events: [...((avant?.events as unknown[]) || []), ev] };
      produits.set(p.id, l);
      return l;
    },
    prSupprimer: async (fid, id) => { const p = produits.get(id); if (!p || p.fournisseurId !== fid) return null; produits.delete(id); return p; },
    prAModerer: async (statut) => [...produits.values()].filter((p) => p.statut === (statut || "PENDING")).map(pourAdmin),
    prModerer: async (id, m, ev) => {
      const p = produits.get(id);
      if (!p) return null;
      const { auteur, ...reste } = m;
      Object.assign(p, reste, { moderePar: auteur, modereLe: maintenant(), updatedAt: maintenant(), events: [...((p.events as unknown[]) || []), ev] });
      return p;
    },
    prPublics: async (fictifs) => [...produits.values()].filter((p) => p.statut === "APPROVED" && publiable(p.fournisseurId, fictifs)).map(avecF),

    svLister: async (fid) => [...services.values()].filter((s) => s.fournisseurId === fid),
    svParId: async (id) => services.get(id) ?? null,
    svEnregistrer: async (s, ev) => {
      const avant = services.get(s.id);
      const l = { ...(avant || { createdAt: maintenant(), events: [] }), ...s, updatedAt: maintenant(), events: [...((avant?.events as unknown[]) || []), ev] };
      services.set(s.id, l);
      return l;
    },
    svSupprimer: async (fid, id) => { const s = services.get(id); if (!s || s.fournisseurId !== fid) return null; services.delete(id); return s; },
    svAModerer: async (statut) => [...services.values()].filter((s) => s.statut === (statut || "PENDING")).map(pourAdmin),
    svModerer: async (id, m, ev) => {
      const s = services.get(id);
      if (!s) return null;
      Object.assign(s, { statut: m.statut, ouvrageCode: m.ouvrageCode, prestationCode: m.prestationCode, motifRejet: m.motifRejet, moderePar: m.auteur,
        modereLe: maintenant(), updatedAt: maintenant(), events: [...((s.events as unknown[]) || []), ev] });
      return s;
    },
    svPublics: async (fictifs) => [...services.values()].filter((s) => s.statut === "APPROVED" && publiable(s.fournisseurId, fictifs)).map(avecF),

    refLister: async () => [...codes.values()],
    refCreer: async (c) => { codes.set(c.code, { ...c, actif: true, createdAt: maintenant() }); },

    offresFiches: async (fictifs) => [...prix.values()].filter((p) => p.statut === "APPROVED" && publiable(p.fournisseurId, fictifs)).map((p) => {
      const f = fournisseurs.get(String(p.fournisseurId))!;
      return { code: p.materiauCode, prix: p.prixRefHT, fournisseurId: p.fournisseurId, zones: f.zonesLivraison, regionFournisseur: f.region, misAJour: p.updatedAt, validiteJusquau: p.validiteJusquau };
    }),
    offresProduits: async (fictifs) => [...produits.values()].filter((p) => p.statut === "APPROVED" && p.materiauCode && publiable(p.fournisseurId, fictifs)).map((p) => {
      const f = fournisseurs.get(String(p.fournisseurId))!;
      return { code: p.materiauCode, prix: p.prixRefHT, fournisseurId: p.fournisseurId, zones: (p.zones as string[]).length ? p.zones : f.zonesLivraison, regionFournisseur: f.region, misAJour: p.updatedAt, validiteJusquau: p.validiteJusquau };
    }),
    offresServices: async (fictifs) => [...services.values()].filter((s) => s.statut === "APPROVED" && publiable(s.fournisseurId, fictifs) && (s.ouvrageCode || s.prestationCode)).map((s) => {
      const f = fournisseurs.get(String(s.fournisseurId))!;
      return { ouvrageCode: s.ouvrageCode, prestationCode: s.prestationCode, nature: s.nature, prix: s.prixHT, fournisseurId: s.fournisseurId,
        zones: (s.zones as string[]).length ? s.zones : f.zonesLivraison, regionFournisseur: f.region, misAJour: s.updatedAt, validiteJusquau: s.validiteJusquau };
    }),
    annuaire: async (fictifs) => [...fournisseurs.values()].filter((f) => publiable(f.id, fictifs)).map((f) => ({
      ...f,
      codes: [...new Set([
        ...[...prix.values()].filter((p) => p.fournisseurId === f.id && p.statut === "APPROVED").map((p) => String(p.materiauCode)),
        ...[...produits.values()].filter((p) => p.fournisseurId === f.id && p.statut === "APPROVED" && p.materiauCode).map((p) => String(p.materiauCode)),
        ...[...services.values()].filter((s) => s.fournisseurId === f.id && s.statut === "APPROVED" && (s.ouvrageCode || s.prestationCode)).map((s) => String(s.ouvrageCode || s.prestationCode)),
      ])],
      nbProduits: [...produits.values()].filter((p) => p.fournisseurId === f.id && p.statut === "APPROVED").length,
      nbServices: [...services.values()].filter((s) => s.fournisseurId === f.id && s.statut === "APPROVED").length,
      nbFiches: [...prix.values()].filter((p) => p.fournisseurId === f.id && p.statut === "APPROVED").length,
    })),
    fParSlug: async (slug) => [...fournisseurs.values()].find((f) => f.slug === slug) ?? null,
    fichesApprouvees: async (fid) => [...prix.values()].filter((p) => p.fournisseurId === fid && p.statut === "APPROVED"),
    activite: async (fid) => activite(fid),
    leadInserer: async (l) => { leads.push({ ...l, createdAt: maintenant() }); },

    imInserer: async (i) => {
      const { octetsHex, vignetteHex, ...m } = i;
      const l = { ...m, octets: octetsHex, vignette: vignetteHex, statut: "PENDING", createdAt: maintenant(), updatedAt: maintenant(), motifRejet: null };
      images.set(i.id, l);
      return meta(l);
    },
    imParId: async (id) => (images.has(id) ? meta(images.get(id)!) : null),
    imListerFournisseur: async (fid) => [...images.values()].filter((i) => i.fournisseurId === fid)
      .sort((a, b) => Number(b.principale) - Number(a.principale) || Number(a.ordre) - Number(b.ordre)).map(meta),
    imStats: async (fid) => {
      const l = [...images.values()].filter((i) => i.fournisseurId === fid);
      return { nb: l.length, octets: l.reduce((s, i) => s + Number(i.taille) + Number(i.vignetteTaille), 0) };
    },
    imMaj: async (id, p) => { const i = images.get(id); if (!i) return null; Object.assign(i, p, { updatedAt: maintenant() }); return meta(i); },
    imPrincipale: async (id) => { const c = images.get(id); if (!c) return; for (const i of images.values()) if (i.objetType === c.objetType && i.objetId === c.objetId) i.principale = i.id === id; },
    imSupprimer: async (fid, id) => { const i = images.get(id); if (!i || i.fournisseurId !== fid) return null; images.delete(id); return meta(i); },
    imModerer: async (id, statut, motif, auteur) => { const i = images.get(id); if (!i) return null; Object.assign(i, { statut, motifRejet: motif, moderePar: auteur }); return meta(i); },
    imApprouverObjet: async (type, oid, auteur) => {
      let n = 0;
      for (const i of images.values()) if (i.objetType === type && i.objetId === oid && i.statut === "PENDING") { Object.assign(i, { statut: "APPROVED", moderePar: auteur }); n++; }
      return n;
    },
    imAModerer: async (statut) => [...images.values()].filter((i) => i.statut === (statut || "PENDING")).map((i) => ({ ...meta(i), raisonSociale: fournisseurs.get(String(i.fournisseurId))?.raisonSociale })),
    imPubliques: async (fictifs) => [...images.values()].filter((i) => imagePubliable(i, fictifs)).map(meta),
    imOctetsPublics: async (id, vignette, fictifs) => { const i = images.get(id); return i && imagePubliable(i, fictifs) ? octets(i, vignette) : null; },
    imOctets: async (id, vignette) => { const i = images.get(id); return i ? octets(i, vignette) : null; },
  };
  return { depot, fournisseurs, prix, historique, produits, services, codes, leads, images };
}

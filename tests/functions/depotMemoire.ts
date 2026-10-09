/** Dépôt en mémoire (même contrat que depotNeon) pour tester la logique Cercles sans base. */
import type { Depot, Ligne } from "../../functions/_lib/fournisseursDepot";

export function depotMemoire() {
  const fournisseurs = new Map<string, Ligne>();
  const prix = new Map<string, Ligne>();
  const historique: Ligne[] = [];
  const maintenant = () => new Date().toISOString();

  const depot: Depot = {
    fParId: async (id) => fournisseurs.get(id) ?? null,
    fParEmail: async (email) => [...fournisseurs.values()].find((f) => f.email === email) ?? null,
    fParIdempotence: async (cle) => [...fournisseurs.values()].find((f) => f.idempotencyKey === cle) ?? null,
    fSlugPris: async (slug) => [...fournisseurs.values()].some((f) => f.slug === slug),
    fInserer: async (f) => {
      fournisseurs.set(f.id, { ...f, statut: "PENDING", createdAt: maintenant(), updatedAt: maintenant(), codeTentatives: 0, codeHash: null, codeExpire: null });
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
      .map((f) => ({ ...f, nbFiches: [...prix.values()].filter((p) => p.fournisseurId === f.id).length })),

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
  };
  return { depot, fournisseurs, prix, historique };
}

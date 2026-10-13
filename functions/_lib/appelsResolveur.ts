/**
 * Appels vidéo sur demande — qui est qui, dans Neon (lecture seule).
 * Les coordonnées lues ici servent aux notifications et ne sont jamais
 * renvoyées aux autres participants (vueParticipant).
 */
import { CLE_CABINET, type DescripteurInvite, type Erreur, type Identite } from "./appels";
import type { ActeurConnecte, Resolveur } from "./appelsService";
import type { Sql } from "./appelsDepot";

const CABINET: Identite = { type: "admin", cle: CLE_CABINET, nom: "Architecte CITURBAREA", email: null, telephone: null, langue: "fr" };
const interdit = (): Erreur => ({ ok: false, status: 403, erreur: "invite_interdit" });
const introuvable = (): Erreur => ({ ok: false, status: 404, erreur: "invite_introuvable" });
const s = (v: unknown) => (v == null || v === "" ? null : String(v));
/** Adresse générée pour un client sans e-mail (clientDossier.ts) : pas d'envoi. */
const vraiEmail = (v: unknown) => { const e = s(v); return e && !e.endsWith("@citurbarea.unknown") ? e : null; };
const ROLES_CLIENT = new Set(["CLIENT"]);

export function resolveurNeon(sql: Sql): Resolveur {
  const fournisseur = async (champ: "id" | "slug", v: string) => {
    const r = champ === "id"
      ? await sql`SELECT "id", "raisonSociale", "email", "telephone", "statut", "metier" FROM "Fournisseur" WHERE "id" = ${v} LIMIT 1`
      : await sql`SELECT "id", "raisonSociale", "email", "telephone", "statut", "metier" FROM "Fournisseur" WHERE "slug" = ${v} LIMIT 1`;
    return r[0] ?? null;
  };
  const membre = async (id: string) => (await sql`SELECT "id", "projetId", "role", "nom", "email", "telephone", "actif" FROM "ProjetMembre" WHERE "id" = ${id} LIMIT 1`)[0] ?? null;
  const deMembre = (m: Record<string, unknown>): Identite => ({
    type: ROLES_CLIENT.has(String(m.role)) ? "client" : "pro", cle: `membre:${m.id}`, nom: String(m.nom), email: vraiEmail(m.email), telephone: s(m.telephone), langue: "fr",
  });
  const deFournisseur = (f: Record<string, unknown>): Identite => ({
    type: String(f.metier || "").toLowerCase().includes("fourn") ? "fournisseur" : "pro",
    cle: `frn:${f.id}`, nom: String(f.raisonSociale), email: vraiEmail(f.email), telephone: s(f.telephone), langue: "fr",
  });

  return {
    async acteur(a: ActeurConnecte) {
      if (a.genre === "admin") return CABINET;
      if (a.genre === "pro") {
        const f = await fournisseur("id", a.fournisseurId);
        return f && f.statut === "APPROVED" ? deFournisseur(f) : null;
      }
      const m = await membre(a.membreId);
      return m && m.actif && m.projetId === a.projetId ? deMembre(m) : null;
    },

    async invite(i: DescripteurInvite, { acteur, contexte, objetId }) {
      switch (i.type) {
        case "admin": return CABINET;
        case "pro": {
          // Hors back-office : slug public seulement (autoriserCreation), pro approuvé seulement.
          const f = i.id && acteur?.genre === "admin" ? await fournisseur("id", i.id) : i.slug ? await fournisseur("slug", i.slug) : null;
          return f && f.statut === "APPROVED" ? deFournisseur(f) : introuvable();
        }
        case "client": {
          if (acteur?.genre !== "admin") return interdit();
          const d = (await sql`SELECT "ownerId", "clientNom", "clientTel", "clientEmail" FROM "Dossier" WHERE "id" = ${i.dossierId} LIMIT 1`)[0];
          if (!d) return introuvable();
          return { type: "client", cle: `usr:${d.ownerId}`, nom: s(d.clientNom) || "Client", email: vraiEmail(d.clientEmail), telephone: s(d.clientTel), langue: "fr" };
        }
        case "rdv": {
          if (acteur?.genre !== "admin") return interdit();
          const r = (await sql`SELECT "id", "nom", "email", "telephone" FROM "RendezVous" WHERE "id" = ${i.id} LIMIT 1`)[0];
          return r ? { type: "client", cle: `rdv:${r.id}`, nom: String(r.nom), email: vraiEmail(r.email), telephone: s(r.telephone), langue: "fr" } : introuvable();
        }
        case "membre": {
          const m = await membre(i.id);
          if (!m || !m.actif) return introuvable();
          // Un membre n'invite que dans SON projet ; le contexte chantier porte l'identifiant du projet.
          if (acteur?.genre === "membre" && m.projetId !== acteur.projetId) return interdit();
          if (contexte === "chantier" && !objetId.startsWith(String(m.projetId))) return interdit();
          return deMembre(m);
        }
      }
    },
  };
}

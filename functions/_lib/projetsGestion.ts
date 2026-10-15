/**
 * Espace projet ↔ gestion de projet (lots GP2-GP3) : les membres voient les pièces
 * du dossier rattaché au projet, phase par phase, et déposent celles de leur rôle ;
 * l'architecte (superviseur) et l'administration valident, refusent ou mettent « sans objet ».
 * Branché par functions/api/projets/[[chemin]].ts et functions/api/cc/projets/[[chemin]].ts.
 */
import { reponse, type Contexte, type GestionProjet } from "./projetsApi";
import { roleDe, superviseur, type Acteur } from "./projets";
import { depotDocumentsNeon, reponseDocument, type Sql } from "./documents";
import { appliquerActionPiece, documentDuDossier, lireActionPiece, lirePieces, tablesPieces, type ActeurPiece } from "./dossierPieces";
import { journaliser } from "./dossierAdmin";

const acteurPiece = (a: Acteur): ActeurPiece =>
  a.kind === "admin" ? { kind: "admin", email: a.email } : { kind: "membre", id: a.id, role: a.role, nom: a.nom, superviseur: superviseur(a) };

export function gestionNeon(sql: Sql): GestionProjet {
  return {
    async journalDossier(dossierId, auteur, action, details, le) {
      if ((await tablesPieces(sql)).journal) await journaliser(sql, dossierId, auteur, action, details, le);
    },
    async pieces(c: Contexte, a: Acteur, p, reste) {
      const client = roleDe(a) === "CLIENT";
      if (!p.dossierId) return reponse(200, { ok: true, phases: null, raison: "projet_sans_dossier" });
      if (!reste.length && c.req.method === "GET") {
        const r = await lirePieces(sql, p.dossierId, { client });
        return r ? reponse(200, { ok: true, ...r, profil: null }) : reponse(404, { ok: false, error: "not_found" });
      }
      if (!reste.length && c.req.method === "POST") {
        let corps: unknown = null;
        try { const t = await c.req.text(); corps = t.length <= 6_500_000 ? JSON.parse(t) : null; } catch { /* illisible */ }
        if (!corps) return reponse(413, { ok: false, error: "fichier_trop_lourd" });
        const x = lireActionPiece(corps);
        if ("erreur" in x) return reponse(400, { ok: false, error: x.erreur });
        const r = await appliquerActionPiece(sql, p.dossierId, x, acteurPiece(a), { maintenant: c.maintenant() });
        return reponse(r.status, r.json);
      }
      if (reste.length === 1 && c.req.method === "GET") {
        if (!(await documentDuDossier(sql, p.dossierId, reste[0], { client }))) return reponseDocument(null);
        return reponseDocument(await depotDocumentsNeon(sql).octets(reste[0]));
      }
      return reponse(405, { ok: false, error: "methode" });
    },
  };
}

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
import { nouvelId } from "./projets";
import { ordreCatalogue, phaseCourante } from "../../packages/contracts/src/gestion/frise";
import { phaseDuCatalogue } from "../../packages/contracts/src/gestion/referentiel";
import { paiementsDossier, phaseBloquee } from "./gestionPhases";

const FAITS = new Set(["FAITE", "FAITE_HORS_PLATEFORME", "DEBLOQUEE"]);

const acteurPiece = (a: Acteur): ActeurPiece =>
  a.kind === "admin" ? { kind: "admin", email: a.email } : { kind: "membre", id: a.id, role: a.role, nom: a.nom, superviseur: superviseur(a) };

export function gestionNeon(sql: Sql): GestionProjet {
  return {
    /**
     * La phase du dossier suit l'espace projet : phase du premier jalon non terminé.
     * Elle n'avance que vers l'avant ; l'ancienne phase devient « faite » ; journal du dossier.
     */
    async synchroDossier(c, p, auteur) {
      if (!p.dossierId) return;
      const js = await c.depot.jalons(p.id);
      const cur = phaseCourante(js.map((j) => ({ phase: j.definition.phase, phaseGabarit: j.definition.phaseGabarit ?? null, statut: j.statut, rang: j.rang })));
      if (!cur) return;
      const d = (await sql`SELECT "phase", "payload" FROM "Dossier" WHERE "id" = ${p.dossierId} LIMIT 1`)[0];
      if (!d) return;
      const payload = (d.payload && typeof d.payload === "object" ? d.payload : {}) as Record<string, unknown>;
      const gestion = (payload.gestion && typeof payload.gestion === "object" ? payload.gestion : {}) as Record<string, unknown>;
      let avance = ordreCatalogue(cur.catalogue) > ordreCatalogue(d.phase == null ? null : String(d.phase));
      if (!avance && gestion.phaseRef === cur.phaseRef) return;
      const le = c.maintenant();
      // Phase suivante non payée : le dossier reste où il est (point d'arrêt « En attente de paiement »).
      const refCible = phaseDuCatalogue(cur.catalogue);
      if (avance && refCible !== phaseDuCatalogue(d.phase == null ? null : String(d.phase)) && phaseBloquee(await paiementsDossier(sql, p.dossierId, le.slice(0, 10)), refCible)) {
        if ((await tablesPieces(sql)).journal) await journaliser(sql, p.dossierId, auteur, "PHASE_EN_ATTENTE_PAIEMENT", { projetId: p.id, phase: refCible, vers: cur.catalogue }, le);
        avance = false;
        if (gestion.phaseRef === cur.phaseRef) return;
      }
      const nouveau = { ...payload, gestion: { ...gestion, phaseRef: cur.phaseRef } };
      if (avance) await sql`UPDATE "Dossier" SET "phase" = ${cur.catalogue}, "payload" = ${JSON.stringify(nouveau)}::jsonb, "updatedAt" = ${le}::timestamp(3) WHERE "id" = ${p.dossierId}`;
      else await sql`UPDATE "Dossier" SET "payload" = ${JSON.stringify(nouveau)}::jsonb WHERE "id" = ${p.dossierId}`;
      const t = await tablesPieces(sql);
      if (avance && t.journal) {
        if (d.phase) await sql`INSERT INTO "DossierEtape" ("dossierId", "phaseCode", "statut", "saisiPar", "updatedAt") VALUES (${p.dossierId}, ${String(d.phase)}, 'FAITE', ${auteur}, ${le}::timestamp(3))
          ON CONFLICT ("dossierId", "phaseCode") DO UPDATE SET "statut" = 'FAITE', "saisiPar" = EXCLUDED."saisiPar", "updatedAt" = EXCLUDED."updatedAt"
          WHERE "DossierEtape"."statut" IN ('EN_COURS', 'A_FAIRE')`;
        await sql`INSERT INTO "DossierEtape" ("dossierId", "phaseCode", "statut", "saisiPar", "updatedAt") VALUES (${p.dossierId}, ${cur.catalogue}, 'EN_COURS', ${auteur}, ${le}::timestamp(3))
          ON CONFLICT ("dossierId", "phaseCode") DO NOTHING`;
      }
      if (t.journal) await journaliser(sql, p.dossierId, auteur, avance ? "PHASE_SYNCHRONISEE" : "PHASE_REF_SYNCHRONISEE",
        { projetId: p.id, de: d.phase ?? null, vers: avance ? cur.catalogue : d.phase ?? null, phaseRef: cur.phaseRef }, le);
    },
    /** Étapes du dossier déjà faites (hors plateforme, débloquées) ou sans objet → jalons validés / sans objet. */
    async apresCreation(c, projetId, dossierId, auteur) {
      const t = await tablesPieces(sql);
      if (!t.journal) return;
      const etapes = new Map((await sql`SELECT "phaseCode", "statut" FROM "DossierEtape" WHERE "dossierId" = ${dossierId}`).map((r) => [String(r.phaseCode), String(r.statut)]));
      if (!etapes.size) return;
      const le = c.maintenant();
      let n = 0;
      for (const j of await c.depot.jalons(projetId)) {
        const s = etapes.get(j.definition.phaseGabarit ?? j.definition.phase) ?? etapes.get(j.definition.phase);
        if (!s || j.statut !== "A_FAIRE") continue;
        if (FAITS.has(s) && (await c.depot.majStatut(projetId, j.code, "A_FAIRE", "VALIDE", "Fait hors plateforme (étape du dossier)", le))) n++;
        else if (s === "SANS_OBJET" && (await c.depot.majStatut(projetId, j.code, "A_FAIRE", "SANS_OBJET", null, le))) n++;
      }
      if (n) await c.depot.journaliser({ id: nouvelId("pev_"), projetId, auteur, action: "etapes_dossier_reportees", cible: dossierId, details: { jalons: n }, createdAt: le });
    },
    /** Jalon d'une phase « En attente de paiement » : pas de démarrage ni de validation. */
    async phaseBloquee(p, phase) {
      if (!p.dossierId) return null;
      const ref = phaseDuCatalogue(phase);
      return ref && phaseBloquee(await paiementsDossier(sql, p.dossierId, new Date().toISOString().slice(0, 10)), ref) ? ref : null;
    },
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

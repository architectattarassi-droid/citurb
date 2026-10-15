/**
 * Pièces jointes de la messagerie = RÉFÉRENCES à des documents déposés dans
 * le fil (dépôt commun), jamais des fichiers envoyés « en message ».
 */
import { describe, expect, it } from "vitest";
import type { Identite } from "../../../../../functions/_lib/appels";
import { depotAppelsMemoire } from "../../../../../functions/_lib/appelsDepot";
import type { ActeurConnecte, Resolveur } from "../../../../../functions/_lib/appelsService";
import { depotFichiersMemoire } from "../../../../../functions/_lib/depotStockage";
import type { LigneDocument } from "../../../../../functions/_lib/depotRegles";
import { depotMessagerieMemoire } from "../../../../../functions/_lib/messagerieDepot";
import { routeurMessages, type CtxMsg } from "../../../../../functions/_lib/messagerieService";

const T0 = Date.parse("2026-10-15T08:00:00Z");
const ident = (cle: string, nom: string, extra: Partial<Identite> = {}): Identite => ({ type: "client", cle, nom, email: null, telephone: null, langue: "fr", ...extra });
const ATLAS = ident("frn:frn_atlas", "Atlas", { type: "pro", email: "contact@atlas.ma" });
const resolveur: Resolveur = {
  acteur: async (a) => (a.genre === "pro" ? ATLAS : null),
  invite: async (i) => (i.type === "pro" ? ATLAS : { ok: false, status: 404, erreur: "invite_introuvable" }),
};
const PRO: ActeurConnecte = { genre: "pro", fournisseurId: "frn_atlas" };

function ligne(id: string, conversationId: string, proprietaire: string, statut: LigneDocument["statut"] = "A_MODERER"): LigneDocument {
  return {
    id, contexte: "conversation", objetId: conversationId, deposantCle: proprietaire, deposantNom: "Amina", nom: "plan.pdf", nomNormalise: "plan", type: "application/pdf",
    taille: 100, empreinte: "x", support: "NEON", cleR2: null, largeur: null, hauteur: null, meta: {}, version: 1, statut, motif: null, moderePar: null, modereLe: null,
    supprimePar: null, supprimeLe: null, televersement: null, aVignette: false, driveId: null, createdAt: new Date(T0).toISOString(), updatedAt: new Date(T0).toISOString(),
  };
}

describe("messagerie : pièces jointes par référence", () => {
  it("le message référence le document déposé par son auteur dans CE fil ; tout autre document est refusé", async () => {
    const docs = depotFichiersMemoire();
    const c: CtxMsg = {
      depot: depotAppelsMemoire(), msg: depotMessagerieMemoire(), docs, resolveur, maintenant: T0,
      env: { APPELS_SECRET: "s".repeat(40), PUBLIC_WEB_URL: "https://citurbarea.com" }, envoyer: async () => true,
    };
    const req = (m: string, corps?: unknown) => new Request("https://citurbarea.com/api/x", { method: m, ...(corps ? { body: JSON.stringify(corps) } : {}) });
    const r = await routeurMessages(c, req("POST", {
      contexte: "cercles", objetId: "atlas", invites: [{ type: "pro", slug: "atlas" }], texte: "Bonjour, voici mon plan",
      demandeur: { nom: "Amina", email: "amina@gmail.com" }, consentement: true,
    }), null, []);
    const jeton = String(r.json.jeton);
    const conv = [...(c.msg as ReturnType<typeof depotMessagerieMemoire>).convs.values()][0];
    const cleVisiteur = conv.participants[0].cle;
    await docs.creer(ligne("doc_aaaaaaaaaaaaaaaaaaaaaa", conv.id, cleVisiteur));
    await docs.creer(ligne("doc_bbbbbbbbbbbbbbbbbbbbbb", "cnv_autrefil0000000", cleVisiteur));
    await docs.creer(ligne("doc_cccccccccccccccccccccc", conv.id, "frn:frn_atlas"));

    const ok = await routeurMessages(c, req("POST", { texte: "", documents: ["doc_aaaaaaaaaaaaaaaaaaaaaa"] }), null, ["lien", jeton, "messages"]);
    expect(ok.status).toBe(201);
    expect((ok.json.message as { meta: { documents: { id: string; nom: string }[] } }).meta.documents).toEqual([{ id: "doc_aaaaaaaaaaaaaaaaaaaaaa", nom: "plan.pdf", type: "application/pdf" }]);
    expect((await routeurMessages(c, req("POST", { documents: ["doc_bbbbbbbbbbbbbbbbbbbbbb"] }), null, ["lien", jeton, "messages"])).json.error).toBe("document_invalide");
    expect((await routeurMessages(c, req("POST", { documents: ["doc_cccccccccccccccccccccc"] }), null, ["lien", jeton, "messages"])).json.error).toBe("document_invalide");
    // Le pro voit la référence (pas le fichier : il l'ouvre par un lien signé, après modération).
    const vue = await routeurMessages(c, req("GET"), PRO, [conv.id]);
    expect(JSON.stringify(vue.json)).toContain("doc_aaaaaaaaaaaaaaaaaaaaaa");
  });
});

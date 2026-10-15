/**
 * Outils pro réservés aux membres agréés : un membre de base ne peut appeler
 * aucune route réservée (403 acces_reserve), l'admin accorde / retire outil par
 * outil (daté, tracé), la demande d'accès arrive à l'admin.
 */
import { afterEach, describe, expect, it } from "vitest";
import { demanderAcces, exigerAcces, garderOutil, modifierAcces, vueAcces } from "../../../../../functions/_lib/accesPro";
import { enregistrerFiche, inscrire, listerPourAdmin, modererFournisseur, moi } from "../../../../../functions/_lib/fournisseurs";
import { reinitialiserLimites } from "../../../../../functions/_lib/cercles";
import { positionPrix } from "../../../../../functions/_lib/outilMateriauthequePro";
import { depotMemoire } from "../../../../../tests/functions/depotMemoire";
import { LISTE_OUTILS, OUTILS_PRO, aAcces } from "../../domain/cercles/accesPro";

type J = Record<string, unknown>;
const json = (r: { json: unknown }) => r.json as J;
let ip = 0;
const entetes = () => new Headers({ "cf-connecting-ip": `10.5.0.${++ip}` });
afterEach(() => reinitialiserLimites());

async function pro(m: ReturnType<typeof depotMemoire>, n: number, approuver = true) {
  const email = `acces${n}@exemple.invalid`;
  await inscrire({ metier: "FOURNISSEUR_MATERIAUX", raisonSociale: `Négoce Atlas ${n}`, ville: "Rabat", telephone: "0612345678", email, accepteConditions: true }, entetes(), m.depot, {});
  const f = [...m.fournisseurs.values()].find((x) => x.email === email)!;
  if (approuver) await modererFournisseur(String(f.id), { statut: "APPROVED" }, "admin@test", m.depot);
  return String(f.id);
}
const route = (outil: keyof typeof OUTILS_PRO) => `/api/cercles/espace/outils/${OUTILS_PRO[outil].segment}/prix`;

describe("accès aux outils pro", () => {
  it("membre de base : aucune route réservée accessible (garde du middleware et garde de la Function)", async () => {
    const m = depotMemoire();
    const fid = await pro(m, 1);
    for (const o of LISTE_OUTILS) {
      expect((await garderOutil(route(o), fid, m.depot))).toMatchObject({ status: 403, json: { error: "acces_reserve", outil: o } });
      expect((await exigerAcces(m.depot, fid, o))?.status).toBe(403);
    }
    expect((await positionPrix(fid, new URLSearchParams(""), m.depot)).status).toBe(403);
    expect((await garderOutil("/api/cercles/espace/outils/inconnu/x", fid, m.depot))?.status).toBe(404);
    expect((await garderOutil(route("CPS"), "frn_inexistant", m.depot))?.status).toBe(401);
  });

  it("demande → admin accorde (daté, tracé) → accès ; retrait → 403 ; expiration ; pro suspendu", async () => {
    const m = depotMemoire();
    const fid = await pro(m, 2);
    const d = json(await demanderAcces(fid, { outil: "MATERIAUTHEQUE_PRO", message: "Pour suivre mes prix" }, m.depot, {}));
    expect(((d.acces as J).demandes as J[])[0]).toMatchObject({ outil: "MATERIAUTHEQUE_PRO", message: "Pour suivre mes prix" });
    expect((await demanderAcces(fid, { outil: "PIRATE" }, m.depot, {})).status).toBe(400);
    const admin = (json(await listerPourAdmin(null, m.depot)).fournisseurs as J[])[0];
    expect(((admin.acces as J).demandes as J[]).length).toBe(1);

    const a = json(await modifierAcces(fid, { outil: "MATERIAUTHEQUE_PRO", actif: true }, "admin@test", m.depot));
    expect(((a.acces as J).outils as J[]).find((o) => o.outil === "MATERIAUTHEQUE_PRO")).toMatchObject({ actif: true, demandeLe: null });
    expect((a.acces as J).demandes).toEqual([]);
    const f = m.fournisseurs.get(fid)!;
    expect((f.events as J[]).map((e) => e.kind)).toEqual(expect.arrayContaining(["ACCES_DEMANDE", "ACCES_ACCORDE"]));
    expect(await garderOutil(route("MATERIAUTHEQUE_PRO"), fid, m.depot)).toBeNull();
    expect((await garderOutil(route("FACTURATION"), fid, m.depot))?.status).toBe(403); // les autres outils restent fermés
    expect((await positionPrix(fid, new URLSearchParams(""), m.depot)).status).toBe(200);
    expect((json(await moi(fid, m.depot)).fournisseur as J).acces).toMatchObject({ outils: expect.arrayContaining([expect.objectContaining({ outil: "MATERIAUTHEQUE_PRO", actif: true })]) });

    await modifierAcces(fid, { outil: "MATERIAUTHEQUE_PRO", actif: false, motif: "test" }, "admin@test", m.depot);
    expect((await garderOutil(route("MATERIAUTHEQUE_PRO"), fid, m.depot))?.status).toBe(403);
    expect((f.events as J[]).at(-1)).toMatchObject({ kind: "ACCES_RETIRE", payload: { outil: "MATERIAUTHEQUE_PRO", auteur: "admin@test" } });

    await modifierAcces(fid, { outil: "CPS", actif: true, expireLe: "2020-01-01" }, "admin@test", m.depot);
    expect(aAcces(f, "CPS")).toBe(false);
    await modifierAcces(fid, { outil: "CPS", actif: true }, "admin@test", m.depot);
    expect(aAcces(f, "CPS")).toBe(true);
    await modererFournisseur(fid, { statut: "SUSPENDED", motif: "test" }, "admin@test", m.depot);
    expect(aAcces(f, "CPS")).toBe(false);
  });

  it("formule PREMIUM : tous les outils, sauf retrait explicite ; retour à GRATUIT → plus rien", async () => {
    const m = depotMemoire();
    const fid = await pro(m, 9);
    await modererFournisseur(fid, { statut: "APPROVED", formule: "PREMIUM" }, "admin@test", m.depot);
    for (const o of LISTE_OUTILS) expect(await garderOutil(route(o), fid, m.depot)).toBeNull();
    expect(vueAcces(m.fournisseurs.get(fid)!)).toMatchObject({ premium: true, outils: expect.arrayContaining([expect.objectContaining({ outil: "CPS", source: "premium" })]) });
    await modifierAcces(fid, { outil: "FACTURATION", actif: false, motif: "retrait ciblé" }, "admin@test", m.depot);
    expect((await garderOutil(route("FACTURATION"), fid, m.depot))?.status).toBe(403);
    expect(await garderOutil(route("CPS"), fid, m.depot)).toBeNull();
    await modererFournisseur(fid, { statut: "APPROVED", formule: "GRATUIT" }, "admin@test", m.depot);
    for (const o of LISTE_OUTILS) expect((await garderOutil(route(o), fid, m.depot))?.status).toBe(403);
  });

  it("un pro non vérifié ne peut pas recevoir d'outil ; la vue d'accès est complète", async () => {
    const m = depotMemoire();
    const fid = await pro(m, 3, false);
    expect((await modifierAcces(fid, { outil: "CPS", actif: true }, "admin@test", m.depot)).status).toBe(409);
    expect(vueAcces(m.fournisseurs.get(fid)!).outils.map((o) => o.outil)).toEqual(LISTE_OUTILS);
  });

  it("matériauthèque pro : ma position face au marché, sans prix d'un autre pro sous 3 fournisseurs", async () => {
    const m = depotMemoire();
    const ids = [await pro(m, 4), await pro(m, 5), await pro(m, 6)];
    for (const [i, id] of ids.entries()) await enregistrerFiche(id, { materiauCode: "CIT-GO-008", uniteVente: "sac50", prixHT: 76 + i * 2 }, m.depot);
    await modifierAcces(ids[0], { outil: "MATERIAUTHEQUE_PRO", actif: true }, "admin@test", m.depot);
    const r = json(await positionPrix(ids[0], new URLSearchParams("region=Rabat"), m.depot));
    expect((r.lignes as J[])[0]).toMatchObject({ code: "CIT-GO-008", monPrix: 1.52, marche: { nbFournisseurs: 3, mediane: 1.56 } });
    // Deux fournisseurs seulement : aucun prix agrégé publié.
    const m2 = depotMemoire();
    const a = await pro(m2, 7), b = await pro(m2, 8);
    for (const id of [a, b]) await enregistrerFiche(id, { materiauCode: "CIT-GO-008", uniteVente: "sac50", prixHT: 80 }, m2.depot);
    await modifierAcces(a, { outil: "MATERIAUTHEQUE_PRO", actif: true }, "admin@test", m2.depot);
    expect(((json(await positionPrix(a, new URLSearchParams(""), m2.depot)).lignes as J[])[0].marche as J)).toMatchObject({ mediane: null, nbFournisseurs: 2 });
  });
});

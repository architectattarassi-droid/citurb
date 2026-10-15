/**
 * Red flag « tentative de contact direct » (décision du fondateur) :
 * coordonnée masquée ET signalée ; cabinet prévenu dès la 1re tentative ;
 * 3 tentatives en 7 jours → fil SIGNALE et écriture suspendue jusqu'à la
 * décision du cabinet ; la coordonnée n'est jamais conservée en clair.
 */
import { describe, expect, it } from "vitest";
import type { Identite } from "../../../../../functions/_lib/appels";
import { depotAppelsMemoire } from "../../../../../functions/_lib/appelsDepot";
import { routeur as routeurAppels, type ActeurConnecte, type Resolveur } from "../../../../../functions/_lib/appelsService";
import { depotMessagerieMemoire } from "../../../../../functions/_lib/messagerieDepot";
import { journalAppels, routeurMessages, type CtxMsg } from "../../../../../functions/_lib/messagerieService";

const T0 = Date.parse("2026-10-15T08:00:00Z");
const H = 3600_000;
const ident = (cle: string, nom: string, extra: Partial<Identite> = {}): Identite => ({ type: "client", cle, nom, email: null, telephone: null, langue: "fr", ...extra });
const ATLAS_ID = ident("frn:frn_atlas", "Atlas Menuiserie", { type: "pro", email: "contact@atlas.ma" });
const CABINET = ident("admin:cabinet", "Architecte CITURBAREA", { type: "admin" });
const resolveur: Resolveur = {
  acteur: async (a) => (a.genre === "admin" ? CABINET : a.genre === "pro" && a.fournisseurId === "frn_atlas" ? ATLAS_ID : null),
  invite: async (i) => (i.type === "admin" ? CABINET : i.type === "pro" && i.slug === "atlas" ? ATLAS_ID : { ok: false, status: 404, erreur: "invite_introuvable" }),
};
const ATLAS: ActeurConnecte = { genre: "pro", fournisseurId: "frn_atlas" };
const ADMIN: ActeurConnecte = { genre: "admin", email: "yassine@citurbarea.com" };

function banc() {
  const depot = depotAppelsMemoire();
  const msg = depotMessagerieMemoire();
  msg.bloque = depot.bloque;
  msg.bloquer = depot.bloquer;
  const mails: { to: string[]; subject: string; text: string }[] = [];
  const c: CtxMsg = {
    depot, msg, resolveur, maintenant: T0,
    env: { APPELS_SECRET: "s".repeat(40), PUBLIC_WEB_URL: "https://citurbarea.com", LEAD_NOTIFY_TO: "cabinet@citurbarea.com" },
    envoyer: async (m) => { mails.push(m); return true; },
  };
  c.journal = journalAppels(msg, () => c.maintenant);
  const req = (methode: string, corps?: unknown) => new Request("https://citurbarea.com/api/x", { method: methode, ...(corps ? { body: JSON.stringify(corps), headers: { "content-type": "application/json" } } : {}) });
  const messages = (methode: string, acteur: ActeurConnecte | null, chemin: string[], corps?: unknown) => routeurMessages(c, req(methode, corps), acteur, chemin);
  const appels = (methode: string, acteur: ActeurConnecte | null, chemin: string[], corps?: unknown) => routeurAppels(c, req(methode, corps), acteur, chemin);
  const alertesCabinet = () => mails.filter((m) => m.to[0] === "cabinet@citurbarea.com" && /contact direct/i.test(m.subject));
  return { c, depot, msg, mails, messages, appels, alertesCabinet };
}
const premier = (texte: string) => ({
  contexte: "cercles", objetId: "atlas", invites: [{ type: "pro", slug: "atlas" }], texte,
  demandeur: { nom: "Amina", email: "amina@gmail.com" }, consentement: true,
});

describe("red flag : tentatives de contact direct", () => {
  it("1re tentative : message masqué, types notés (jamais la valeur), cabinet prévenu, fil marqué", async () => {
    const { msg, messages, alertesCabinet } = banc();
    const r = await messages("POST", null, [], premier("Bonjour, appelez-moi au zéro six soixante et un vingt-deux trente-trois quarante-quatre"));
    expect(r.status).toBe(201);
    expect(alertesCabinet()).toHaveLength(1);
    expect(alertesCabinet()[0].text).toContain("téléphone");
    const conv = [...msg.convs.values()][0];
    expect(conv.alertes![Object.keys(conv.alertes!)[0]].types).toEqual(["telephone"]);
    expect(msg.msgs[0].meta.coordonnees).toEqual(["telephone"]);
    const tout = JSON.stringify([...msg.convs.values(), msg.msgs]);
    expect(tout).not.toMatch(/soixante|quarante|0661/);
    // Vue admin : badge et détail ; vue du pro : rien d'autre que le texte masqué.
    const boiteAdmin = await messages("GET", ADMIN, []);
    expect((boiteAdmin.json.conversations as { alertes: number }[])[0].alertes).toBe(1);
    const vuePro = JSON.stringify((await messages("GET", ATLAS, [conv.id])).json);
    expect(vuePro).not.toMatch(/alertes|soixante/);
  });

  it("3 tentatives en 7 jours : fil SIGNALE, écriture suspendue, cabinet prévenu ; le cabinet lève la suspension", async () => {
    const { c, messages, alertesCabinet } = banc();
    const r = await messages("POST", null, [], premier("Mon mail : amina arobase gmail point com"));
    const jeton = String(r.json.jeton);
    const id = (r.json.conversation as { id: string }).id;
    c.maintenant = T0 + H;
    expect((await messages("POST", null, ["lien", jeton, "messages"], { texte: "WhatsApp 06 61 22 33 44" })).json.suspendu).toBe(false);
    c.maintenant = T0 + 2 * H;
    const troisieme = await messages("POST", null, ["lien", jeton, "messages"], { texte: "suivez @amina.deco" });
    expect(troisieme.json.suspendu).toBe(true);
    expect(alertesCabinet().map((m) => m.subject)).toEqual([expect.stringMatching(/Tentative/), expect.stringMatching(/suspendu/)]);
    expect((await messages("POST", null, ["lien", jeton, "messages"], { texte: "Bonjour ?" })).json.error).toBe("ecriture_suspendue");
    // Le pro peut toujours répondre ; le fil apparaît dans le filtre du cabinet.
    expect((await messages("POST", ATLAS, [id, "messages"], { texte: "Passons par un appel vidéo." })).status).toBe(201);
    const filtre = await messages("GET", ADMIN, [], undefined);
    expect((filtre.json.conversations as { statut: string }[])[0].statut).toBe("SIGNALEE");
    expect((await messages("GET", ADMIN, ["alertes"])).json).toMatchObject({ fils: 1, suspendus: 1 });
    const vueAdmin = await messages("GET", ADMIN, [id]);
    const alerte = ((vueAdmin.json.conversation as { alertes: { participantId: string; tentatives: number; suspendu: boolean }[] }).alertes)[0];
    expect(alerte).toMatchObject({ tentatives: 3, suspendu: true });
    expect((await messages("POST", ADMIN, [id, "moderer"], { participantId: alerte.participantId, lever: true })).status).toBe(200);
    expect((await messages("POST", null, ["lien", jeton, "messages"], { texte: "Merci, je reste sur la plateforme." })).status).toBe(201);
  });

  it("hors fenêtre de 7 jours, les tentatives anciennes ne comptent plus", async () => {
    const { c, messages } = banc();
    const r = await messages("POST", null, [], premier("Tél 0661223344"));
    const jeton = String(r.json.jeton);
    c.maintenant = T0 + 8 * 24 * H;
    expect((await messages("POST", null, ["lien", jeton, "messages"], { texte: "Tél 0661223344" })).json.suspendu).toBe(false);
    c.maintenant = T0 + 8 * 24 * H + H;
    expect((await messages("POST", null, ["lien", jeton, "messages"], { texte: "mon gmail" })).json.suspendu).toBe(false);
  });

  it("message sans coordonnée : aucune alerte", async () => {
    const { messages, alertesCabinet } = banc();
    await messages("POST", null, [], premier("Bonjour, il me faut deux portes en bois de 90 cm, budget 15 000 DH."));
    expect(alertesCabinet()).toHaveLength(0);
  });

  it("demande d'appel vidéo : coordonnées dans le message ou le nom → masquées, signalées au cabinet", async () => {
    const { depot, appels, alertesCabinet } = banc();
    const r = await appels("POST", null, [], {
      contexte: "cercles", objetId: "atlas", invites: [{ type: "pro", slug: "atlas" }], creneaux: [new Date(T0 + 24 * H).toISOString()],
      message: "ou sur wa.me/212661223344", demandeur: { nom: "Amina 0661223344", email: "amina@gmail.com" }, consentement: true,
    });
    expect(r.status).toBe(201);
    const d = [...depot.lignes.values()][0];
    expect(d.alerteCoordonnees?.types).toEqual(expect.arrayContaining(["telephone"]));
    expect(JSON.stringify(d)).not.toMatch(/0661223344|wa\.me/);
    expect(alertesCabinet()).toHaveLength(1);
  });
});

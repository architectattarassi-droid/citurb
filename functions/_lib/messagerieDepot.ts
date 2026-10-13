/**
 * Messagerie — stockage Neon (tables docs/sql/messagerie-neon.sql, jamais
 * créées ici ; absentes → 503 messagerie_indisponible). Les blocages sont
 * ceux des appels vidéo (table "BlocageAppel") : bloquer une personne
 * bloque ses messages ET ses demandes d'appel.
 */
import type { Conversation, Message } from "./messagerie";

export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export interface DepotMessagerie {
  tablesPresentes(): Promise<boolean>;
  creer(c: Conversation): Promise<void>;
  lire(id: string): Promise<Conversation | null>;
  parJetonHash(h: string): Promise<Conversation | null>;
  parEmpreinte(empreinte: string): Promise<Conversation | null>;
  enregistrer(c: Conversation, versionLue: number): Promise<boolean>;
  lister(f: { cle?: string; statut?: string; limite: number }): Promise<Conversation[]>;
  ajouterMessage(m: Message): Promise<void>;
  messages(conversationId: string, limite: number): Promise<Message[]>;
  derniers(conversationIds: string[]): Promise<Map<string, Message>>;
  /** Messages reçus non lus par conversation, pour une liste de (conversation, participant, luJusqua). */
  nonLus(l: { conversationId: string; participantId: string; luJusqua: string | null }[]): Promise<Map<string, number>>;
  modererMessage(id: string, conversationId: string, modere: boolean): Promise<boolean>;
  compterMessagesAuteur(cle: string, depuis: string): Promise<number>;
  compterConversationsCreees(cle: string, depuis: string): Promise<number>;
  bloque(destCle: string, auteurCle: string): Promise<boolean>;
  bloquer(destCle: string, auteurCle: string, le: string): Promise<void>;
}

const json = <T>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : v) as T;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));
const conversation = (r: Record<string, unknown>): Conversation => ({ ...json<Conversation>(r.donnees), version: Number(r.version) });
const message = (r: Record<string, unknown>): Message => ({
  id: String(r.id), conversationId: String(r.conversationId), auteurId: String(r.auteurId), auteurCle: String(r.auteurCle), type: String(r.type) as Message["type"],
  texte: String(r.texte ?? ""), masque: !!r.masque, meta: json<Record<string, unknown>>(r.meta ?? {}), modere: !!r.modere, createdAt: iso(r.createdAt),
});

export function depotMessagerieNeon(sql: Sql): DepotMessagerie {
  const colonnes = (c: Conversation) => ({
    cles: c.participants.map((p) => p.cle),
    jetons: c.participants.map((p) => p.jetonHash),
    donnees: JSON.stringify({ ...c, version: undefined }),
  });
  return {
    async tablesPresentes() {
      const r = await sql`SELECT to_regclass('public."Conversation"') IS NOT NULL AS c, to_regclass('public."MessageConversation"') IS NOT NULL AS m, to_regclass('public."BlocageAppel"') IS NOT NULL AS b`;
      return !!r[0]?.c && !!r[0]?.m && !!r[0]?.b;
    },
    async creer(c) {
      const k = colonnes(c);
      await sql`INSERT INTO "Conversation" ("id", "contexte", "objetId", "statut", "empreinte", "createurCle", "cles", "jetons", "donnees", "version", "dernierMessageLe", "createdAt", "updatedAt")
        VALUES (${c.id}, ${c.contexte}, ${c.objetId}, ${c.statut}, ${c.empreinte}, ${c.createurCle}, ${k.cles}::text[], ${k.jetons}::text[], ${k.donnees}::jsonb, ${c.version},
          ${c.dernierMessageLe}::timestamptz, ${c.createdAt}::timestamptz, ${c.updatedAt}::timestamptz)`;
    },
    async lire(id) {
      const r = await sql`SELECT "donnees", "version" FROM "Conversation" WHERE "id" = ${id} LIMIT 1`;
      return r.length ? conversation(r[0]) : null;
    },
    async parJetonHash(h) {
      const r = await sql`SELECT "donnees", "version" FROM "Conversation" WHERE "jetons" @> ARRAY[${h}]::text[] LIMIT 1`;
      return r.length ? conversation(r[0]) : null;
    },
    async parEmpreinte(e) {
      const r = await sql`SELECT "donnees", "version" FROM "Conversation" WHERE "empreinte" = ${e} AND "statut" <> 'FERMEE' ORDER BY "createdAt" DESC LIMIT 1`;
      return r.length ? conversation(r[0]) : null;
    },
    async enregistrer(c, v) {
      const k = colonnes(c);
      const r = await sql`UPDATE "Conversation" SET "statut" = ${c.statut}, "cles" = ${k.cles}::text[], "jetons" = ${k.jetons}::text[], "donnees" = ${k.donnees}::jsonb,
        "dernierMessageLe" = ${c.dernierMessageLe}::timestamptz, "version" = ${v + 1}, "updatedAt" = ${c.updatedAt}::timestamptz
        WHERE "id" = ${c.id} AND "version" = ${v} RETURNING "id"`;
      return r.length === 1;
    },
    async lister({ cle, statut, limite }) {
      const r = await sql`SELECT "donnees", "version" FROM "Conversation"
        WHERE (${cle ?? null}::text IS NULL OR "cles" @> ARRAY[${cle ?? ""}]::text[]) AND (${statut ?? null}::text IS NULL OR "statut" = ${statut ?? ""})
        ORDER BY "dernierMessageLe" DESC LIMIT ${limite}`;
      return r.map(conversation);
    },
    async ajouterMessage(m) {
      await sql`INSERT INTO "MessageConversation" ("id", "conversationId", "auteurId", "auteurCle", "type", "texte", "masque", "meta", "modere", "createdAt")
        VALUES (${m.id}, ${m.conversationId}, ${m.auteurId}, ${m.auteurCle}, ${m.type}, ${m.texte}, ${m.masque}, ${JSON.stringify(m.meta)}::jsonb, ${m.modere}, ${m.createdAt}::timestamptz)`;
    },
    async messages(id, limite) {
      const r = await sql`SELECT * FROM (SELECT * FROM "MessageConversation" WHERE "conversationId" = ${id} ORDER BY "createdAt" DESC LIMIT ${limite}) x ORDER BY "createdAt" ASC`;
      return r.map(message);
    },
    async derniers(ids) {
      if (!ids.length) return new Map();
      const r = await sql`SELECT DISTINCT ON ("conversationId") * FROM "MessageConversation" WHERE "conversationId" = ANY(${ids}::text[]) ORDER BY "conversationId", "createdAt" DESC`;
      return new Map(r.map((x) => [String(x.conversationId), message(x)]));
    },
    async nonLus(l) {
      const out = new Map<string, number>();
      for (const x of l) {
        const r = await sql`SELECT count(*)::int AS n FROM "MessageConversation" WHERE "conversationId" = ${x.conversationId} AND "auteurId" <> ${x.participantId}
          AND (${x.luJusqua}::timestamptz IS NULL OR "createdAt" > ${x.luJusqua}::timestamptz)`;
        out.set(x.conversationId, Number(r[0]?.n) || 0);
      }
      return out;
    },
    async modererMessage(id, conversationId, modere) {
      const r = await sql`UPDATE "MessageConversation" SET "modere" = ${modere} WHERE "id" = ${id} AND "conversationId" = ${conversationId} RETURNING "id"`;
      return r.length === 1;
    },
    async compterMessagesAuteur(cle, depuis) {
      const r = await sql`SELECT count(*)::int AS n FROM "MessageConversation" WHERE "auteurCle" = ${cle} AND "createdAt" >= ${depuis}::timestamptz`;
      return Number(r[0]?.n) || 0;
    },
    async compterConversationsCreees(cle, depuis) {
      const r = await sql`SELECT count(*)::int AS n FROM "Conversation" WHERE "createurCle" = ${cle} AND "createdAt" >= ${depuis}::timestamptz`;
      return Number(r[0]?.n) || 0;
    },
    async bloque(dest, auteur) {
      const r = await sql`SELECT 1 FROM "BlocageAppel" WHERE "destinataireCle" = ${dest} AND "demandeurCle" = ${auteur} LIMIT 1`;
      return r.length > 0;
    },
    async bloquer(dest, auteur, le) {
      await sql`INSERT INTO "BlocageAppel" ("destinataireCle", "demandeurCle", "createdAt") VALUES (${dest}, ${auteur}, ${le}::timestamptz) ON CONFLICT DO NOTHING`;
    },
  };
}

/** Dépôt en mémoire (tests, même contrat). */
export function depotMessagerieMemoire(): DepotMessagerie & { convs: Map<string, Conversation>; msgs: Message[]; blocages: Set<string> } {
  const convs = new Map<string, Conversation>();
  const msgs: Message[] = [];
  const blocages = new Set<string>();
  const cp = <T>(x: T) => structuredClone(x);
  const toutes = () => [...convs.values()];
  return {
    convs, msgs, blocages,
    tablesPresentes: async () => true,
    creer: async (c) => { convs.set(c.id, cp(c)); },
    lire: async (id) => (convs.has(id) ? cp(convs.get(id)!) : null),
    parJetonHash: async (h) => { const c = toutes().find((x) => x.participants.some((p) => p.jetonHash === h)); return c ? cp(c) : null; },
    parEmpreinte: async (e) => { const c = toutes().filter((x) => x.empreinte === e && x.statut !== "FERMEE").pop(); return c ? cp(c) : null; },
    enregistrer: async (c, v) => {
      const a = convs.get(c.id);
      if (!a || a.version !== v) return false;
      convs.set(c.id, { ...cp(c), version: v + 1 });
      return true;
    },
    lister: async ({ cle, statut, limite }) => toutes().filter((c) => (!cle || c.participants.some((p) => p.cle === cle)) && (!statut || c.statut === statut))
      .sort((a, b) => b.dernierMessageLe.localeCompare(a.dernierMessageLe)).slice(0, limite).map(cp),
    ajouterMessage: async (m) => { msgs.push(cp(m)); },
    messages: async (id, limite) => msgs.filter((m) => m.conversationId === id).slice(-limite).map(cp),
    derniers: async (ids) => new Map(ids.flatMap((id) => { const l = msgs.filter((m) => m.conversationId === id); return l.length ? [[id, cp(l[l.length - 1])] as const] : []; })),
    nonLus: async (l) => new Map(l.map((x) => [x.conversationId, msgs.filter((m) => m.conversationId === x.conversationId && m.auteurId !== x.participantId && (!x.luJusqua || m.createdAt > x.luJusqua)).length])),
    modererMessage: async (id, cid, modere) => { const m = msgs.find((x) => x.id === id && x.conversationId === cid); if (m) m.modere = modere; return !!m; },
    compterMessagesAuteur: async (cle, depuis) => msgs.filter((m) => m.auteurCle === cle && m.createdAt >= depuis).length,
    compterConversationsCreees: async (cle, depuis) => toutes().filter((c) => c.createurCle === cle && c.createdAt >= depuis).length,
    bloque: async (d, a) => blocages.has(`${d}|${a}`),
    bloquer: async (d, a) => { blocages.add(`${d}|${a}`); },
  };
}

/**
 * Appels vidéo sur demande — stockage Neon (tables : docs/sql/appels-video-neon.sql,
 * jamais créées ici ; absentes → 503 appels_indisponibles).
 *
 * Une demande = une ligne "DemandeAppel" : la demande complète (participants,
 * créneaux, historique) est dans "donnees" (JSONB) ; quelques colonnes en
 * double servent aux recherches (statut, créneau retenu, clés des
 * participants, empreintes des liens). Écriture optimiste par "version" :
 * deux réponses simultanées ne s'écrasent pas.
 */
import type { Demande } from "./appels";

export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

export interface DepotAppels {
  tablesPresentes(): Promise<boolean>;
  creer(d: Demande): Promise<void>;
  lire(id: string): Promise<Demande | null>;
  parJetonHash(h: string): Promise<Demande | null>;
  /** Écrit si la version en base est toujours `versionLue` ; false sinon (conflit). */
  enregistrer(d: Demande, versionLue: number): Promise<boolean>;
  lister(f: { cle?: string; statut?: string; limite: number }): Promise<Demande[]>;
  compterParDemandeur(cle: string, depuis: string): Promise<number>;
  compterPaire(demandeurCle: string, destCle: string, depuis: string): Promise<number>;
  paireEnAttente(demandeurCle: string, destCle: string, maintenant: string): Promise<boolean>;
  compterRecues(destCle: string, depuis: string): Promise<number>;
  bloque(destCle: string, demandeurCle: string): Promise<boolean>;
  bloquer(destCle: string, demandeurCle: string, le: string): Promise<void>;
  /** Appels confirmés qui commencent dans [depuis, jusqua] et dont le rappel n'est pas parti. */
  aRappeler(depuis: string, jusqua: string): Promise<Demande[]>;
}

const demande = (r: Record<string, unknown>): Demande => {
  const d = (typeof r.donnees === "string" ? JSON.parse(r.donnees) : r.donnees) as Demande;
  return { ...d, version: Number(r.version) };
};

export function depotAppelsNeon(sql: Sql): DepotAppels {
  const colonnes = (d: Demande) => ({
    cles: d.participants.map((p) => p.cle),
    jetons: d.participants.map((p) => p.jetonHash),
    donnees: JSON.stringify({ ...d, version: undefined }),
  });
  return {
    async tablesPresentes() {
      const r = await sql`SELECT to_regclass('public."DemandeAppel"') IS NOT NULL AS d, to_regclass('public."BlocageAppel"') IS NOT NULL AS b`;
      return !!r[0]?.d && !!r[0]?.b;
    },
    async creer(d) {
      const c = colonnes(d);
      await sql`INSERT INTO "DemandeAppel" ("id", "contexte", "objetId", "demandeurCle", "statut", "creneauRetenu", "expireLe", "cles", "jetons", "donnees", "version", "rappelEnvoye", "createdAt", "updatedAt")
        VALUES (${d.id}, ${d.contexte}, ${d.objetId}, ${d.demandeurCle}, ${d.statut}, ${d.creneauRetenu}::timestamptz, ${d.expireLe}::timestamptz, ${c.cles}::text[], ${c.jetons}::text[], ${c.donnees}::jsonb, ${d.version}, ${d.rappelEnvoye}, ${d.createdAt}::timestamptz, ${d.updatedAt}::timestamptz)`;
    },
    async lire(id) {
      const r = await sql`SELECT "donnees", "version" FROM "DemandeAppel" WHERE "id" = ${id} LIMIT 1`;
      return r.length ? demande(r[0]) : null;
    },
    async parJetonHash(h) {
      const r = await sql`SELECT "donnees", "version" FROM "DemandeAppel" WHERE "jetons" @> ARRAY[${h}]::text[] LIMIT 1`;
      return r.length ? demande(r[0]) : null;
    },
    async enregistrer(d, versionLue) {
      const c = colonnes(d);
      const r = await sql`UPDATE "DemandeAppel" SET "statut" = ${d.statut}, "creneauRetenu" = ${d.creneauRetenu}::timestamptz, "expireLe" = ${d.expireLe}::timestamptz,
        "cles" = ${c.cles}::text[], "jetons" = ${c.jetons}::text[], "donnees" = ${c.donnees}::jsonb, "rappelEnvoye" = ${d.rappelEnvoye},
        "version" = ${versionLue + 1}, "updatedAt" = ${d.updatedAt}::timestamptz
        WHERE "id" = ${d.id} AND "version" = ${versionLue} RETURNING "id"`;
      return r.length === 1;
    },
    async lister({ cle, statut, limite }) {
      const r = await sql`SELECT "donnees", "version" FROM "DemandeAppel"
        WHERE (${cle ?? null}::text IS NULL OR "cles" @> ARRAY[${cle ?? ""}]::text[]) AND (${statut ?? null}::text IS NULL OR "statut" = ${statut ?? ""})
        ORDER BY "updatedAt" DESC LIMIT ${limite}`;
      return r.map(demande);
    },
    async compterParDemandeur(cle, depuis) {
      const r = await sql`SELECT count(*)::int AS n FROM "DemandeAppel" WHERE "demandeurCle" = ${cle} AND "createdAt" >= ${depuis}::timestamptz`;
      return Number(r[0]?.n) || 0;
    },
    async compterPaire(dem, dest, depuis) {
      const r = await sql`SELECT count(*)::int AS n FROM "DemandeAppel" WHERE "demandeurCle" = ${dem} AND "cles" @> ARRAY[${dest}]::text[] AND "createdAt" >= ${depuis}::timestamptz`;
      return Number(r[0]?.n) || 0;
    },
    async paireEnAttente(dem, dest, maintenant) {
      const r = await sql`SELECT 1 FROM "DemandeAppel" WHERE "demandeurCle" = ${dem} AND "cles" @> ARRAY[${dest}]::text[] AND "statut" = 'EN_ATTENTE' AND "expireLe" > ${maintenant}::timestamptz LIMIT 1`;
      return r.length > 0;
    },
    async compterRecues(dest, depuis) {
      const r = await sql`SELECT count(*)::int AS n FROM "DemandeAppel" WHERE "cles" @> ARRAY[${dest}]::text[] AND "demandeurCle" <> ${dest} AND "createdAt" >= ${depuis}::timestamptz`;
      return Number(r[0]?.n) || 0;
    },
    async bloque(dest, dem) {
      const r = await sql`SELECT 1 FROM "BlocageAppel" WHERE "destinataireCle" = ${dest} AND "demandeurCle" = ${dem} LIMIT 1`;
      return r.length > 0;
    },
    async bloquer(dest, dem, le) {
      await sql`INSERT INTO "BlocageAppel" ("destinataireCle", "demandeurCle", "createdAt") VALUES (${dest}, ${dem}, ${le}::timestamptz) ON CONFLICT DO NOTHING`;
    },
    async aRappeler(depuis, jusqua) {
      const r = await sql`SELECT "donnees", "version" FROM "DemandeAppel" WHERE "statut" = 'CONFIRMEE' AND NOT "rappelEnvoye"
        AND "creneauRetenu" >= ${depuis}::timestamptz AND "creneauRetenu" <= ${jusqua}::timestamptz LIMIT 50`;
      return r.map(demande);
    },
  };
}

/** Dépôt en mémoire (tests, même contrat). */
export function depotAppelsMemoire(): DepotAppels & { lignes: Map<string, Demande>; blocages: Set<string> } {
  const lignes = new Map<string, Demande>();
  const blocages = new Set<string>();
  const copie = (d: Demande) => structuredClone(d);
  const toutes = () => [...lignes.values()];
  return {
    lignes, blocages,
    tablesPresentes: async () => true,
    creer: async (d) => { lignes.set(d.id, copie(d)); },
    lire: async (id) => (lignes.has(id) ? copie(lignes.get(id)!) : null),
    parJetonHash: async (h) => { const d = toutes().find((x) => x.participants.some((p) => p.jetonHash === h)); return d ? copie(d) : null; },
    enregistrer: async (d, v) => {
      const actuelle = lignes.get(d.id);
      if (!actuelle || actuelle.version !== v) return false;
      lignes.set(d.id, { ...copie(d), version: v + 1 });
      return true;
    },
    lister: async ({ cle, statut, limite }) => toutes().filter((d) => (!cle || d.participants.some((p) => p.cle === cle)) && (!statut || d.statut === statut))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limite).map(copie),
    compterParDemandeur: async (cle, depuis) => toutes().filter((d) => d.demandeurCle === cle && d.createdAt >= depuis).length,
    compterPaire: async (dem, dest, depuis) => toutes().filter((d) => d.demandeurCle === dem && d.participants.some((p) => p.cle === dest) && d.createdAt >= depuis).length,
    paireEnAttente: async (dem, dest, m) => toutes().some((d) => d.demandeurCle === dem && d.participants.some((p) => p.cle === dest) && d.statut === "EN_ATTENTE" && d.expireLe > m),
    compterRecues: async (dest, depuis) => toutes().filter((d) => d.demandeurCle !== dest && d.participants.some((p) => p.cle === dest) && d.createdAt >= depuis).length,
    bloque: async (dest, dem) => blocages.has(`${dest}|${dem}`),
    bloquer: async (dest, dem) => { blocages.add(`${dest}|${dem}`); },
    aRappeler: async (depuis, jusqua) => toutes().filter((d) => d.statut === "CONFIRMEE" && !d.rappelEnvoye && d.creneauRetenu! >= depuis && d.creneauRetenu! <= jusqua).map(copie),
  };
}

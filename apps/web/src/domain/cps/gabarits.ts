/**
 * Gabarits CPS (apps/api/data/cps-templates) importés côté front : le CPS
 * se génère sans l'API NestJS. Module chargé à la demande (≈ 730 Ko de JSON).
 */
import L0 from "../../../../api/data/cps-templates/lots/lot-00-generalites.json";
import L1 from "../../../../api/data/cps-templates/lots/lot-01-terrassement.json";
import L2 from "../../../../api/data/cps-templates/lots/lot-02-gros-oeuvre-beton.json";
import L3 from "../../../../api/data/cps-templates/lots/lot-03-maconnerie.json";
import L4 from "../../../../api/data/cps-templates/lots/lot-04-etancheite.json";
import L5 from "../../../../api/data/cps-templates/lots/lot-05-charpente.json";
import L6 from "../../../../api/data/cps-templates/lots/lot-06-couverture.json";
import L7 from "../../../../api/data/cps-templates/lots/lot-07-menuiserie-ext-alu.json";
import L8 from "../../../../api/data/cps-templates/lots/lot-08-menuiserie-int-bois.json";
import L9 from "../../../../api/data/cps-templates/lots/lot-09-metallerie.json";
import L10 from "../../../../api/data/cps-templates/lots/lot-10-cloisons-doublages.json";
import L11 from "../../../../api/data/cps-templates/lots/lot-11-revetements-sols.json";
import L12 from "../../../../api/data/cps-templates/lots/lot-12-revetements-murs.json";
import L13 from "../../../../api/data/cps-templates/lots/lot-13-peinture.json";
import L14 from "../../../../api/data/cps-templates/lots/lot-14-plomberie-sanitaire.json";
import L15 from "../../../../api/data/cps-templates/lots/lot-15-electricite.json";
import L16 from "../../../../api/data/cps-templates/lots/lot-16-climatisation.json";
import L17 from "../../../../api/data/cps-templates/lots/lot-17-plomberie-ecs.json";
import L18 from "../../../../api/data/cps-templates/lots/lot-18-faux-plafonds.json";
import L19 from "../../../../api/data/cps-templates/lots/lot-19-staff-stuc.json";
import L20 from "../../../../api/data/cps-templates/lots/lot-20-vdi-courants-faibles.json";
import L21 from "../../../../api/data/cps-templates/lots/lot-21-espaces-verts.json";
import L22 from "../../../../api/data/cps-templates/lots/lot-26-vrd-voirie.json";
import CLAUSES from "../../../../api/data/cps-templates/clauses/clauses-juridiques.json";
import VILLA from "../../../../api/data/cps-templates/project-types/villa-r1-haut-standing.json";
import IMMEUBLE from "../../../../api/data/cps-templates/project-types/immeuble-collectif-r-plus-n.json";

export type Texte = string | { fr?: string; ar?: string; en?: string };
export type ArticleCps = { numero: string; partie?: string; titre: Texte; corpsMD: Texte };
export type PosteCps = { code: string; designation: Texte; unite: string; modeMetreMD?: Texte };
export type LotCps = { code: string; numero: number; famille?: string; intitule: Texte; description?: Texte; normesRefs?: unknown[]; articles: ArticleCps[]; bordereau: PosteCps[] };
export type ClauseCps = { code: string; categorie: string; titre: Texte; corpsMD: Texte; fondement?: string; marche: string[] };
export type TypeProjetCps = { code: string; label: string; clausesLegalesObligatoires: string[]; assurancesObligatoires: { type: string; fondement: string; souscripteur?: string; souscripteurDefault?: string; duree?: number }[]; visasObligatoires: { type: string; phase: string; delaiLegal?: number }[]; normesPivots?: unknown[] };

export const LOTS_CPS: LotCps[] = [L0, L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12, L13, L14, L15, L16, L17, L18, L19, L20, L21, L22,] as unknown as LotCps[];
export const LOT_CPS_PAR_CODE: Record<string, LotCps> = Object.fromEntries(LOTS_CPS.map((l) => [l.code, l]));
export const CLAUSES_CPS: ClauseCps[] = (CLAUSES as unknown as { clauses: ClauseCps[] }).clauses;
export const TYPES_PROJET_CPS = { VILLA: VILLA as unknown as TypeProjetCps, IMMEUBLE: IMMEUBLE as unknown as TypeProjetCps };

/** Texte en français (repli : anglais, arabe). */
export const fr = (t: Texte | undefined): string => (t == null ? "" : typeof t === "string" ? t : t.fr ?? t.en ?? t.ar ?? "");

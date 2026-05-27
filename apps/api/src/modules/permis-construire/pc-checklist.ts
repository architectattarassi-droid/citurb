/**
 * Tome 2 — PC Checklist builder.
 *
 * Compose la liste de pièces requises à partir du référentiel
 * `apps/api/data/permis-construire/pieces-requises.json` selon le couple
 * (projectType, commune).
 *
 * Pure function : aucun side-effect, idéal pour tests + appel depuis service.
 */

import * as fs from "fs";
import * as path from "path";
import type { PieceDefinition, ProjectType } from "./types";

interface RawReferential {
  meta: Record<string, unknown>;
  commonPieces: PieceDefinition[];
  byProjectType: Record<string, { additional: PieceDefinition[] }>;
  communeOverrides: Record<string, { add?: PieceDefinition[] }>;
}

/** Cache lazy du JSON (lecture disque 1× par process). */
let _cache: RawReferential | null = null;

/** Charge le référentiel depuis disque (lazy). */
export function loadReferential(): RawReferential {
  if (_cache) return _cache;
  // Résolution robuste : essaie cwd, puis dirname remontant jusqu'à `data/`.
  const candidates = [
    path.resolve(process.cwd(), "apps/api/data/permis-construire/pieces-requises.json"),
    path.resolve(process.cwd(), "data/permis-construire/pieces-requises.json"),
    path.resolve(__dirname, "../../../data/permis-construire/pieces-requises.json"),
    path.resolve(__dirname, "../../../../data/permis-construire/pieces-requises.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf8");
      _cache = JSON.parse(raw) as RawReferential;
      return _cache;
    }
  }
  throw new Error(
    "[permis-construire] Référentiel pieces-requises.json introuvable — vérifier apps/api/data/permis-construire/",
  );
}

/** Normalisation simple commune (uppercase, sans accents). */
function normalizeCommune(c?: string | null): string {
  if (!c) return "";
  return c
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Construit la checklist complète pour un projet donné.
 * Déduplique par `code` (le dernier ajouté gagne).
 */
export function buildChecklist(opts: {
  projectType: ProjectType | null;
  commune?: string | null;
}): PieceDefinition[] {
  const ref = loadReferential();
  const out = new Map<string, PieceDefinition>();

  for (const p of ref.commonPieces) out.set(p.code, p);

  if (opts.projectType && ref.byProjectType[opts.projectType]) {
    for (const p of ref.byProjectType[opts.projectType].additional ?? []) {
      out.set(p.code, p);
    }
  }

  const communeKey = normalizeCommune(opts.commune);
  if (communeKey && ref.communeOverrides[communeKey]) {
    for (const p of ref.communeOverrides[communeKey].add ?? []) {
      out.set(p.code, p);
    }
  }

  return Array.from(out.values()).sort((a, b) => {
    // Tri stable : required d'abord, puis category, puis label.
    if (a.required !== b.required) return a.required ? -1 : 1;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.label.localeCompare(b.label, "fr");
  });
}

/** Estime la zone sismique RPS 2011 selon la commune (mapping simplifié). */
export function estimateZoneSismique(
  commune?: string | null,
): "I" | "II" | "III" | "IV" | "V" | null {
  const key = normalizeCommune(commune);
  if (!key) return null;
  // Mapping simplifié RPS 2011 — à enrichir via maroc-admin si besoin.
  const ZONES: Record<string, "I" | "II" | "III" | "IV" | "V"> = {
    AGADIR: "IV",
    "AL HOCEIMA": "IV",
    NADOR: "III",
    TANGER: "III",
    TETOUAN: "III",
    FES: "III",
    MEKNES: "II",
    RABAT: "II",
    SALE: "II",
    CASABLANCA: "II",
    MARRAKECH: "II",
    OUARZAZATE: "III",
    OUJDA: "II",
    LAAYOUNE: "I",
    DAKHLA: "I",
  };
  return ZONES[key] ?? "II";
}

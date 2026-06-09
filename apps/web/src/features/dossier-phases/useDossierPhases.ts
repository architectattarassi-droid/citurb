/**
 * useDossierPhases — hook de lecture du snapshot v7 d'un dossier.
 *
 * GET /api/dossier/:dossierId/phases  (JWT obligatoire, lecture seule)
 *
 * Source de vérité côté backend : @citurbarea/contracts/phases.catalog. La
 * page front ne hardcode AUCUNE phase — elle affiche ce que renvoie le snapshot.
 */
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../tomes/tome4/apiClient";

// ─────────────────────────────────────────────────────────────────────────────
// Types alignés sur la réponse du service backend (PhaseEngineService.getDossierPhasesSnapshot).
// Pas d'import depuis @citurbarea/contracts ici pour éviter une dépendance
// cycle build web/node — le snapshot a sa propre forme (status enrichi).
// ─────────────────────────────────────────────────────────────────────────────

export type PhaseStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

export type MarketplaceMode = "STRICT" | "PRIORITAIRE" | "AUCUN";

export interface SnapshotMarketplace {
  mode: MarketplaceMode;
  cercle: string | null;
  categories: string[];
  commandeMateriaux: boolean;
  commandeService: boolean;
  suiviRetour: boolean;
}

export interface SnapshotNode {
  code: string;
  slug: string;
  title: string;
  famille: string;
  order: number;
  objectif: string;
  acteurs: string[];
  validateurs: string[];
  prerequis: string[];
  marketplace: SnapshotMarketplace;
  paiementMilestone: boolean;
  status: PhaseStatus;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
}

export interface DossierPhasesSnapshot {
  dossierId: string;
  porte: string;
  typeOperationFoncier: string;
  nodes: SnapshotNode[];
  currentIds: string[];
  completedIds: string[];
  pendingIds: string[];
  meta: {
    nbRecordsMatched: number;
    nbRecordsTotal: number;
    anyLegacyMismatch: boolean;
  };
}

export interface UseDossierPhasesResult {
  snapshot: DossierPhasesSnapshot | null;
  loading: boolean;
  error: { status: number; message: string; details?: unknown } | null;
  reload: () => void;
}

export function useDossierPhases(dossierId: string | null | undefined): UseDossierPhasesResult {
  const [snapshot, setSnapshot] = useState<DossierPhasesSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UseDossierPhasesResult["error"]>(null);
  const [bump, setBump] = useState(0);

  const reload = useCallback(() => setBump(b => b + 1), []);

  useEffect(() => {
    if (!dossierId) {
      setSnapshot(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch<DossierPhasesSnapshot>(`/api/dossier/${dossierId}/phases`)
      .then(data => { if (!cancelled) setSnapshot(data); })
      .catch((e: any) => {
        if (cancelled) return;
        const status = e?.status ?? 0;
        let message = e?.message ?? "Erreur inconnue";
        if (status === 401) message = "Non authentifié. Reconnectez-vous.";
        else if (status === 403) message = "Accès refusé sur ce dossier.";
        else if (status === 404) message = "Dossier introuvable.";
        else if (status === 422) message = "Dossier non conforme au catalogue v7.";
        setError({ status, message, details: e?.details });
        setSnapshot(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dossierId, bump]);

  return { snapshot, loading, error, reload };
}

// ─── Helpers réutilisables par les pages ─────────────────────────────────────

/** Groupe les nodes par famille en conservant l'ordre du snapshot. */
export function groupByFamille(nodes: SnapshotNode[]): Array<{ famille: string; nodes: SnapshotNode[] }> {
  const order: string[] = [];
  const byFam = new Map<string, SnapshotNode[]>();
  for (const n of nodes) {
    if (!byFam.has(n.famille)) {
      byFam.set(n.famille, []);
      order.push(n.famille);
    }
    byFam.get(n.famille)!.push(n);
  }
  return order.map(famille => ({ famille, nodes: byFam.get(famille)! }));
}

/** Détecte si un node a au moins un prérequis non DONE → BLOCKED (visuel). */
export function isVisuallyBlocked(node: SnapshotNode, completedIds: string[]): boolean {
  if (node.status !== "NOT_STARTED") return false;
  if (node.prerequis.length === 0) return false;
  const completedSet = new Set(completedIds);
  return node.prerequis.some(pre => !completedSet.has(pre));
}

const FAMILLE_LABELS: Record<string, string> = {
  CADRAGE: "Cadrage",
  CONCEPTION: "Conception",
  AUTORISATION: "Autorisation",
  EXECUTION_ETUDES: "Études d'exécution",
  CPS_MARCHES: "CPS & marchés",
  CHANTIER_GO: "Chantier — gros œuvre",
  CHANTIER_SECOND_OEUVRE: "Chantier — second œuvre",
  RECEPTION: "Réception",
};

export function familleLabel(famille: string): string {
  return FAMILLE_LABELS[famille] ?? famille;
}

/**
 * Critical Path Method (CPM) — implémentation déterministe O(V+E).
 *
 * Algorithme (Activity-On-Node, Finish-to-Start uniquement) :
 *   1. Topological sort sur le DAG (Kahn). Refuse si cycle détecté.
 *   2. Forward pass : ES = max(EF des prédécesseurs), EF = ES + duration.
 *   3. Backward pass : LF = min(LS des successeurs) (ou EF du projet pour
 *      les tâches terminales), LS = LF - duration.
 *   4. Slack = LS - ES. Tâche critique ⇔ slack === 0.
 *   5. Chemin critique = chaîne ordonnée de tâches critiques de la source
 *      au puits qui maximisent la durée (toujours unique sur slack=0).
 *
 * Exemple unitaire vérifié (test rapide en commentaire, voir
 * `__cpmSelfTest` en fin de fichier) :
 *
 *   A(3) ──► B(2) ──► D(4)
 *     └────► C(5) ────────► D
 *
 *   ES/EF : A 0/3, B 3/5, C 3/8, D 8/12
 *   LS/LF : A 0/3, B 6/8, C 3/8, D 8/12
 *   slack : A 0, B 3, C 0, D 0
 *   critical path : A → C → D, projectDuration = 12. ✅
 */

import type { CpmResult, ProjectTask } from "./project-calendar.types";

/**
 * Calcule le CPM à partir d'une liste de tâches.
 * Aucune mutation sur les tâches d'entrée.
 */
export function computeCpm(tasks: ProjectTask[]): CpmResult {
  if (tasks.length === 0) {
    return {
      criticalPath: [],
      projectDuration: 0,
      slackPerTask: {},
      schedule: {},
    };
  }

  // Indexation rapide.
  const byId = new Map<string, ProjectTask>();
  for (const t of tasks) byId.set(t.id, t);

  // Sanitize predecessors (filtre les IDs inconnus).
  const preds = new Map<string, string[]>();
  const succs = new Map<string, string[]>();
  for (const t of tasks) {
    const valid = (t.predecessors || []).filter((p) => byId.has(p) && p !== t.id);
    preds.set(t.id, valid);
    if (!succs.has(t.id)) succs.set(t.id, []);
  }
  for (const t of tasks) {
    for (const p of preds.get(t.id) || []) {
      const arr = succs.get(p) || [];
      arr.push(t.id);
      succs.set(p, arr);
    }
  }

  // --- 1. Topological sort (Kahn) ---
  const indeg = new Map<string, number>();
  for (const t of tasks) indeg.set(t.id, (preds.get(t.id) || []).length);
  const queue: string[] = [];
  for (const [id, d] of indeg) if (d === 0) queue.push(id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift() as string;
    order.push(id);
    for (const s of succs.get(id) || []) {
      const nd = (indeg.get(s) || 0) - 1;
      indeg.set(s, nd);
      if (nd === 0) queue.push(s);
    }
  }
  if (order.length !== tasks.length) {
    // Cycle : on retombe sur un planning dégradé (slack=0 partout) pour
    // ne pas crasher, mais on remonte un projectDuration=0 pour signaler.
    return {
      criticalPath: [],
      projectDuration: 0,
      slackPerTask: Object.fromEntries(tasks.map((t) => [t.id, 0])),
      schedule: {},
    };
  }

  // --- 2. Forward pass ---
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of order) {
    const t = byId.get(id) as ProjectTask;
    const ps = preds.get(id) || [];
    const start = ps.length === 0 ? 0 : Math.max(...ps.map((p) => ef.get(p) ?? 0));
    const dur = Math.max(0, t.durationDays || 0);
    es.set(id, start);
    ef.set(id, start + dur);
  }

  const projectDuration = Math.max(...Array.from(ef.values()));

  // --- 3. Backward pass ---
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const t = byId.get(id) as ProjectTask;
    const ss = succs.get(id) || [];
    const finish = ss.length === 0 ? projectDuration : Math.min(...ss.map((s) => ls.get(s) ?? projectDuration));
    const dur = Math.max(0, t.durationDays || 0);
    lf.set(id, finish);
    ls.set(id, finish - dur);
  }

  // --- 4. Slack + isCritical ---
  const slackPerTask: Record<string, number> = {};
  const schedule: CpmResult["schedule"] = {};
  for (const id of order) {
    const slack = (ls.get(id) ?? 0) - (es.get(id) ?? 0);
    slackPerTask[id] = slack;
    schedule[id] = {
      earliestStart: es.get(id) ?? 0,
      earliestFinish: ef.get(id) ?? 0,
      latestStart: ls.get(id) ?? 0,
      latestFinish: lf.get(id) ?? 0,
      slack,
      isCritical: slack === 0,
    };
  }

  // --- 5. Reconstruction du chemin critique ---
  // On part de la tâche critique sans prédécesseur critique avec EF max,
  // puis on chaîne via le successeur critique le plus tardif.
  const criticalIds = new Set(order.filter((id) => slackPerTask[id] === 0));
  const path: string[] = [];
  // Heads : tâches critiques sans prédécesseur critique
  const heads = Array.from(criticalIds).filter((id) =>
    (preds.get(id) || []).every((p) => !criticalIds.has(p)),
  );
  // Choisit la "head" qui mène au EF maximal projet.
  let current: string | undefined = heads.sort(
    (a, b) => (ef.get(b) ?? 0) - (ef.get(a) ?? 0),
  )[0];
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    const cur: string = current;
    visited.add(cur);
    path.push(cur);
    const nexts: string[] = (succs.get(cur) || []).filter((s: string) => criticalIds.has(s));
    if (nexts.length === 0) break;
    // Successeur critique avec ES = EF du courant (continuité stricte)
    const continuation: string | undefined = nexts.find(
      (s: string) => (es.get(s) ?? -1) === (ef.get(cur) ?? -2),
    );
    current = continuation ?? nexts[0];
  }

  return {
    criticalPath: path,
    projectDuration,
    slackPerTask,
    schedule,
  };
}

/**
 * Décale en cascade toutes les tâches descendantes (via successeurs) d'un
 * delta en jours à partir d'une tâche racine. Mutates `tasks` in place et
 * retourne les IDs impactés. Utilisé pour replanifier après un retard.
 */
export function cascadeReplan(
  tasks: ProjectTask[],
  fromTaskId: string,
  deltaDays: number,
): string[] {
  if (deltaDays === 0) return [];
  const byId = new Map(tasks.map((t) => [t.id, t]));
  if (!byId.has(fromTaskId)) return [];

  // BFS descendants
  const succs = new Map<string, string[]>();
  for (const t of tasks) succs.set(t.id, []);
  for (const t of tasks) {
    for (const p of t.predecessors || []) {
      if (succs.has(p)) succs.get(p)!.push(t.id);
    }
  }

  const impacted = new Set<string>();
  const queue: string[] = [fromTaskId];
  while (queue.length) {
    const id = queue.shift() as string;
    if (impacted.has(id)) continue;
    impacted.add(id);
    for (const s of succs.get(id) || []) queue.push(s);
  }

  const shiftIso = (iso: string | null | undefined): string | null | undefined => {
    if (!iso) return iso;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().slice(0, 10);
  };

  for (const id of impacted) {
    const t = byId.get(id)!;
    t.startAt = shiftIso(t.startAt) ?? null;
    t.endAt = shiftIso(t.endAt) ?? null;
    t.updatedAt = new Date().toISOString();
  }

  return Array.from(impacted);
}

/**
 * Self-test (non exporté, exécuté manuellement via `node -e`). Vérifie
 * l'exemple A→B→D / A→C→D du header.
 *
 * @internal
 */
export function __cpmSelfTest(): { ok: boolean; details: unknown } {
  const tasks: ProjectTask[] = [
    mkTask("A", "A", 3, []),
    mkTask("B", "B", 2, ["A"]),
    mkTask("C", "C", 5, ["A"]),
    mkTask("D", "D", 4, ["B", "C"]),
  ];
  const cpm = computeCpm(tasks);
  const ok =
    cpm.projectDuration === 12 &&
    cpm.criticalPath.join(",") === "A,C,D" &&
    cpm.slackPerTask["B"] === 3 &&
    cpm.slackPerTask["A"] === 0 &&
    cpm.slackPerTask["C"] === 0 &&
    cpm.slackPerTask["D"] === 0;
  return { ok, details: cpm };

  function mkTask(id: string, titre: string, dur: number, preds: string[]): ProjectTask {
    return {
      id,
      dossierId: "test",
      numero: id,
      titre,
      phase: "ESQ",
      durationDays: dur,
      progressPct: 0,
      isMilestone: false,
      isCritical: false,
      predecessors: preds,
      resourceUserIds: [],
      resourceSupplierIds: [],
      status: "PENDING",
      blockers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

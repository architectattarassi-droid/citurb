import { createHash } from "crypto";
import { computeBuiltRatio, computeRdcRatio, computeUpperFloorRatio } from "./rules";
import { CourType, EncType, FacadeCount, LotType, PlanSeed, ProjectType } from "./universe.types";

const PROJECT_TYPES: ProjectType[] = ["MAISON_VILLE", "VILLA_ISOLEE", "VILLA_JUMELEE"];
const FACADES: FacadeCount[] = [2, 3, 4];
const LOT_TYPES: LotType[] = ["ECO", "STANDARD"];
const LEVELS_BY_PROJECT: Record<ProjectType, number[]> = {
  MAISON_VILLE: [1, 2, 3, 4, 5], // RDC..R+4
  VILLA_ISOLEE: [1, 2],          // RDC..R+1
  VILLA_JUMELEE: [1, 2],         // RDC..R+1
};
const BASEMENT: boolean[] = [false, true];
const COURS: CourType[] = ["NONE", "SMALL", "MEDIUM", "LARGE"];
const ENCORB: EncType[] = ["NONE", "LIGHT", "HEAVY"];

export function buildUniverseSeeds(): PlanSeed[] {
  const seeds: PlanSeed[] = [];
  for (const projectType of PROJECT_TYPES) {
    for (const facades of FACADES) {
      for (const lotType of LOT_TYPES) {
        for (const levels of LEVELS_BY_PROJECT[projectType]) {
          for (const hasBasement of BASEMENT) {
            for (const cour of COURS) {
              for (const encorbellement of ENCORB) {
                // Rule: villas do not have R+2+ in this prototype
                if (projectType.startsWith("VILLA") && levels > 2) continue;

                const maxRdcRatio = computeRdcRatio(projectType, lotType);
                const maxFloorRatio = computeUpperFloorRatio(projectType, lotType);
                const maxBuiltRatio = computeBuiltRatio(projectType, lotType, facades, cour, encorbellement);

                const notes: string[] = [];
                if (hasBasement) notes.push("Basement enabled");
                if (cour !== "NONE") notes.push(`Cour: ${cour}`);
                if (encorbellement !== "NONE") notes.push(`Encorbellement: ${encorbellement}`);

                const raw = JSON.stringify({ projectType, facades, lotType, levels, hasBasement, cour, encorbellement });
                const id = createHash("sha1").update(raw).digest("hex").slice(0, 16);

                seeds.push({
                  id,
                  projectType,
                  facades,
                  lotType,
                  levels,
                  hasBasement,
                  cour,
                  encorbellement,
                  maxRdcRatio,
                  maxFloorRatio,
                  maxBuiltRatio,
                  notes,
                });
              }
            }
          }
        }
      }
    }
  }
  return seeds;
}

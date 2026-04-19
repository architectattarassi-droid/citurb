"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUniverseSeeds = buildUniverseSeeds;
const crypto_1 = require("crypto");
const rules_1 = require("./rules");
const PROJECT_TYPES = ["MAISON_VILLE", "VILLA_ISOLEE", "VILLA_JUMELEE"];
const FACADES = [2, 3, 4];
const LOT_TYPES = ["ECO", "STANDARD"];
const LEVELS_BY_PROJECT = {
    MAISON_VILLE: [1, 2, 3, 4, 5], // RDC..R+4
    VILLA_ISOLEE: [1, 2], // RDC..R+1
    VILLA_JUMELEE: [1, 2], // RDC..R+1
};
const BASEMENT = [false, true];
const COURS = ["NONE", "SMALL", "MEDIUM", "LARGE"];
const ENCORB = ["NONE", "LIGHT", "HEAVY"];
function buildUniverseSeeds() {
    const seeds = [];
    for (const projectType of PROJECT_TYPES) {
        for (const facades of FACADES) {
            for (const lotType of LOT_TYPES) {
                for (const levels of LEVELS_BY_PROJECT[projectType]) {
                    for (const hasBasement of BASEMENT) {
                        for (const cour of COURS) {
                            for (const encorbellement of ENCORB) {
                                // Rule: villas do not have R+2+ in this prototype
                                if (projectType.startsWith("VILLA") && levels > 2)
                                    continue;
                                const maxRdcRatio = (0, rules_1.computeRdcRatio)(projectType, lotType);
                                const maxFloorRatio = (0, rules_1.computeUpperFloorRatio)(projectType, lotType);
                                const maxBuiltRatio = (0, rules_1.computeBuiltRatio)(projectType, lotType, facades, cour, encorbellement);
                                const notes = [];
                                if (hasBasement)
                                    notes.push("Basement enabled");
                                if (cour !== "NONE")
                                    notes.push(`Cour: ${cour}`);
                                if (encorbellement !== "NONE")
                                    notes.push(`Encorbellement: ${encorbellement}`);
                                const raw = JSON.stringify({ projectType, facades, lotType, levels, hasBasement, cour, encorbellement });
                                const id = (0, crypto_1.createHash)("sha1").update(raw).digest("hex").slice(0, 16);
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

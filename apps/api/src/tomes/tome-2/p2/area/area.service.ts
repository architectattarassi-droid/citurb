import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../tome-at/kernel/prisma/prisma.service";
import * as crypto from "crypto";
import type { AreaKind, AreaMethod, Complexity, CurrentArea } from "./area.types";

type Actor = { userId: string; role: string };

function stableStringify(input: any): string {
  // Deterministic stringify for hashing.
  if (input === null || input === undefined) return String(input);
  if (typeof input !== "object") return JSON.stringify(input);
  if (Array.isArray(input)) return `[${input.map(stableStringify).join(",")}]`;
  const keys = Object.keys(input).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(input[k])}`).join(",")}}`;
}

function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function toNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

@Injectable()
export class AreaService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAccess(actor: Actor, dossierId: string) {
    const d = await this.prisma.dossier.findUnique({ where: { id: dossierId } });
    if (!d) throw new BadRequestException("dossier not found");

    const role = String(actor.role || "CLIENT");
    if (role === "CLIENT" && d.ownerId !== actor.userId) {
      throw new ForbiddenException("not owner");
    }
    return d;
  }

  async history(actor: Actor, dossierId: string) {
    await this.assertAccess(actor, dossierId);
    return this.prisma.dossierArea.findMany({
      where: { dossierId },
      orderBy: { computedAt: "desc" },
      take: 30,
    });
  }

  async current(actor: Actor, dossierId: string): Promise<CurrentArea | null> {
    await this.assertAccess(actor, dossierId);

    const latestVerified = await this.prisma.dossierArea.findFirst({
      where: { dossierId, kind: "VERIFIED" },
      orderBy: { computedAt: "desc" },
    });
    if (latestVerified) {
      return {
        kind: "VERIFIED",
        basis: "VERIFIED",
        valueM2: String(latestVerified.valueM2),
        computedAt: latestVerified.computedAt.toISOString(),
        method: latestVerified.method as AreaMethod,
        methodVersion: latestVerified.methodVersion,
        sources: (latestVerified.sources as any[]) ?? [],
      };
    }

    const latestEstimated = await this.prisma.dossierArea.findFirst({
      where: { dossierId, kind: "ESTIMATED" },
      orderBy: { computedAt: "desc" },
    });
    if (latestEstimated) {
      return {
        kind: "ESTIMATED",
        basis: "ESTIMATED",
        valueM2: String(latestEstimated.valueM2),
        computedAt: latestEstimated.computedAt.toISOString(),
        method: latestEstimated.method as AreaMethod,
        methodVersion: latestEstimated.methodVersion,
        sources: (latestEstimated.sources as any[]) ?? [],
      };
    }

    const latestDeclared = await this.prisma.dossierArea.findFirst({
      where: { dossierId, kind: "DECLARED" },
      orderBy: { computedAt: "desc" },
    });
    if (latestDeclared) {
      return {
        kind: "DECLARED",
        basis: "DECLARED",
        valueM2: String(latestDeclared.valueM2),
        computedAt: latestDeclared.computedAt.toISOString(),
        method: latestDeclared.method as AreaMethod,
        methodVersion: latestDeclared.methodVersion,
        sources: (latestDeclared.sources as any[]) ?? [],
      };
    }

    return null;
  }

  /**
   * Client can propose a value, but it never drives decisions.
   * Append-only snapshot.
   */
  async declare(actor: Actor, dossierId: string, valueM2: number) {
    await this.assertAccess(actor, dossierId);
    const role = String(actor.role || "CLIENT");
    if (role !== "CLIENT") {
      // allow internal roles too, but keep method explicit
    }

    const v = clamp(valueM2, 0, 1e9);
    const inputs = { kind: "DECLARED", valueM2: v, actor: role };
    const inputsHash = sha256Hex(stableStringify(inputs));

    return this.prisma.dossierArea.create({
      data: {
        dossierId,
        kind: "DECLARED",
        valueM2: v.toFixed(2),
        method: "CLIENT_DECLARED",
        methodVersion: "v1.0.0",
        inputsHash,
        sources: [],
      },
    });
  }

  /**
   * Estimated area computed from dossier payload facts (dims, levels, setbacks, courtyard).
   * No direct surface input from user.
   */
  async estimate(actor: Actor, dossierId: string) {
    const d = await this.assertAccess(actor, dossierId);

    // Extract signals from payload (best-effort, V1)
    const p: any = d.payload ?? {};

    // land area (m2)
    const landArea =
      toNumber(p.landArea) ||
      toNumber(p.parcelArea) ||
      toNumber(p.lotArea) ||
      toNumber(p.terrainM2) ||
      0;

    // levels: total floors = RDC + etages
    const etages = toNumber(p.etages ?? p.floorsAboveGround ?? p.niveaux ?? p.levels ?? 0);
    const totalLevels = clamp(1 + Math.floor(etages), 1, 20);

    // courtyard area from dims
    const courW = toNumber(p.courW ?? p.courWidth ?? p.cour_largeur ?? 0);
    const courD = toNumber(p.courD ?? p.courDepth ?? p.cour_profondeur ?? 0);
    const courtyardArea = courW > 0 && courD > 0 ? courW * courD : 0;

    // setback at back: depth * facade width
    const reculFond = toNumber(p.reculFond ?? p.setbackBack ?? p.recul_fond ?? 0);
    const facadeWidth = toNumber(p.facadeWidth ?? p.frontWidth ?? p.largeurFacade ?? 0);
    const setbackArea = reculFond > 0 && facadeWidth > 0 ? reculFond * facadeWidth : 0;

    // efficiency coef to avoid over-claiming
    const efficiency = clamp(toNumber(p.efficiencyCoef ?? p.effCoef ?? 0.9) || 0.9, 0.5, 1);

    const baseFootprint = Math.max(0, landArea - courtyardArea - setbackArea);
    const estimated = baseFootprint * totalLevels * efficiency;

    const inputs = {
      landArea,
      totalLevels,
      courtyardArea,
      setbackArea,
      efficiency,
    };
    const inputsHash = sha256Hex(stableStringify(inputs));

    // Idempotence: if last ESTIMATED has same inputsHash, return it.
    const last = await this.prisma.dossierArea.findFirst({
      where: { dossierId, kind: "ESTIMATED" },
      orderBy: { computedAt: "desc" },
    });
    if (last?.inputsHash === inputsHash) return last;

    return this.prisma.dossierArea.create({
      data: {
        dossierId,
        kind: "ESTIMATED",
        valueM2: estimated.toFixed(2),
        method: "HEURISTIC_V1",
        methodVersion: "v1.0.0",
        inputsHash,
        sources: [],
      },
    });
  }

  /**
   * Verified: reserved to ADMIN (and OWNER as super-admin).
   * Can be repeated as dossier evolves; append-only snapshots.
   */
  async verify(actor: Actor, dossierId: string, valueM2: number, sources: any[] = []) {
    await this.assertAccess(actor, dossierId);
    const role = String(actor.role || "CLIENT");
    if (role !== "ADMIN" && role !== "OWNER") {
      throw new ForbiddenException("verify reserved to ADMIN/OWNER");
    }

    const v = clamp(valueM2, 0, 1e9);
    const inputs = { kind: "VERIFIED", valueM2: v, sources };
    const inputsHash = sha256Hex(stableStringify(inputs));

    return this.prisma.dossierArea.create({
      data: {
        dossierId,
        kind: "VERIFIED",
        valueM2: v.toFixed(2),
        method: "VERIFIED_DOC_V1",
        methodVersion: "v1.0.0",
        inputsHash,
        sources,
      },
    });
  }

  async complexity(actor: Actor, dossierId: string): Promise<Complexity> {
    const cur = await this.current(actor, dossierId);

    const thresholdM2 = 1200;
    if (!cur || cur.basis === "DECLARED") {
      return { thresholdM2, class: "SMALL", basis: "NONE", version: "v1.0.0" };
    }
    const val = Number(cur.valueM2);
    const klass = val > thresholdM2 ? "LARGE" : "SMALL";
    return {
      thresholdM2,
      class: klass,
      basis: cur.basis,
      valueM2: cur.valueM2,
      version: "v1.0.0",
    };
  }
}

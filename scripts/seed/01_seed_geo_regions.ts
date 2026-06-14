/*
  Seed GeoUnit(REGION)
  - Source: data/geo/maroc/regions.seed.json (existing) OR data/geo/01_regions.seed.json
  - Idempotent (upsert by compound unique: level+name+parentId)
*/

import fs from "node:fs";
import path from "node:path";
import { PrismaClient, GeoLevel } from "@prisma/client";

type RegionSeed = {
  name: string;
  code?: string;
};

const prisma = new PrismaClient();

function loadSeed(): RegionSeed[] {
  const candidates = [
    path.resolve(process.cwd(), "data/geo/maroc/regions.seed.json"),
    path.resolve(process.cwd(), "data/geo/01_regions.seed.json"),
  ];
  const p = candidates.find((x) => fs.existsSync(x));
  if (!p) throw new Error(`regions seed file not found. Tried: ${candidates.join(" | ")}`);
  const raw = fs.readFileSync(p, "utf-8");
  const json = JSON.parse(raw);
  if (!Array.isArray(json)) throw new Error("regions seed must be an array");
  return json.map((r: any) => ({ name: String(r.name), code: r.code ? String(r.code) : undefined }));
}

async function main() {
  const regions = loadSeed();
  const created: string[] = [];

  for (const r of regions) {
    const up = await prisma.geoUnit.upsert({
      where: {
        level_name_parentId: {
          level: GeoLevel.REGION,
          name: r.name,
          parentId: null,
        },
      },
      update: {
        code: r.code ?? null,
      },
      create: {
        level: GeoLevel.REGION,
        name: r.name,
        code: r.code ?? null,
        parentId: null,
      },
    });
    created.push(up.id);
  }

  // Hard rule: regions must be 12 (if using Morocco canonical).
  const count = await prisma.geoUnit.count({ where: { level: GeoLevel.REGION } });
  console.log(`[seed] regions upserted=${regions.length}, total_in_db=${count}`);
  if (count !== 12) {
    console.error(`[seed] WARNING: expected 12 regions, got ${count}. Check your seed file.`);
    process.exitCode = 2;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

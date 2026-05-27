/**
 * Seed Geo ref (Tome 0).
 * - Reads data/geo/ma/ref/*.json
 * - Upserts into GeoUnit table (REGION → PROVINCE → COMMUNE hierarchy)
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

async function main() {
  const root = path.resolve(__dirname, "..", "..", "..", "data", "geo", "ma", "ref");
  const regions: Array<{ code: string; name: string }> = readJson(path.join(root, "regions.json"));
  const provinces: Array<{ code: string; name: string; regionCode: string }> = readJson(path.join(root, "provinces.json"));
  const communes: Array<{ code: string; name: string; provinceCode: string }> = readJson(path.join(root, "communes.json"));

  console.log({ regions: regions.length, provinces: provinces.length, communes: communes.length });

  // ── Regions ──────────────────────────────────────────────────────────────
  for (const r of regions) {
    await prisma.geoUnit.upsert({
      where: { code: r.code },
      update: { name: r.name },
      create: { level: "REGION", code: r.code, name: r.name },
    });
  }
  console.log(`✅ ${regions.length} régions seedées`);

  // ── Provinces ─────────────────────────────────────────────────────────────
  for (const p of provinces) {
    const parent = await prisma.geoUnit.findUnique({ where: { code: p.regionCode } });
    await prisma.geoUnit.upsert({
      where: { code: p.code },
      update: { name: p.name, parentId: parent?.id },
      create: { level: "PROVINCE", code: p.code, name: p.name, parentId: parent?.id },
    });
  }
  console.log(`✅ ${provinces.length} provinces seedées`);

  // ── Communes ──────────────────────────────────────────────────────────────
  for (const c of communes) {
    const parent = await prisma.geoUnit.findUnique({ where: { code: c.provinceCode } });
    await prisma.geoUnit.upsert({
      where: { code: c.code },
      update: { name: c.name, parentId: parent?.id },
      create: { level: "COMMUNE", code: c.code, name: c.name, parentId: parent?.id },
    });
  }
  console.log(`✅ ${communes.length} communes seedées`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

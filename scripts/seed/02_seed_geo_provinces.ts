/*
  Seed GeoUnit(PROVINCE)
  Source: data/geo/02_provinces.seed.csv

  Columns:
    province_name, region_name, province_code(optional)

  Idempotent upsert by compound unique: level+name+parentId
*/

import fs from "node:fs";
import path from "node:path";
import { PrismaClient, GeoLevel } from "@prisma/client";

const prisma = new PrismaClient();

function parseCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  const headers = lines.shift()!.split(",").map((h) => h.trim());
  return lines
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const cells = l.split(",");
      const o: Record<string, string> = {};
      headers.forEach((h, i) => (o[h] = (cells[i] ?? "").trim()));
      return o;
    });
}

async function main() {
  const csvPath = path.resolve(process.cwd(), "data/geo/02_provinces.seed.csv");
  if (!fs.existsSync(csvPath)) throw new Error(`Missing ${csvPath}`);
  const rows = parseCsv(csvPath);

  let upserted = 0;
  for (const row of rows) {
    const provinceName = row["province_name"];
    const regionName = row["region_name"];
    const provinceCode = row["province_code"] || null;

    if (!provinceName || !regionName) continue;

    const region = await prisma.geoUnit.findFirst({
      where: { level: GeoLevel.REGION, name: regionName, parentId: null },
      select: { id: true },
    });
    if (!region) {
      console.error(`[seed] province skipped (region not found): ${provinceName} -> ${regionName}`);
      continue;
    }

    await prisma.geoUnit.upsert({
      where: {
        level_name_parentId: {
          level: GeoLevel.PROVINCE,
          name: provinceName,
          parentId: region.id,
        },
      },
      update: { code: provinceCode },
      create: {
        level: GeoLevel.PROVINCE,
        name: provinceName,
        code: provinceCode,
        parentId: region.id,
      },
    });
    upserted++;
  }

  const count = await prisma.geoUnit.count({ where: { level: GeoLevel.PROVINCE } });
  console.log(`[seed] provinces upserted=${upserted}, total_in_db=${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

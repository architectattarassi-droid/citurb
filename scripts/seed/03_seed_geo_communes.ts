/*
  Seed GeoUnit(COMMUNE)
  Source: data/geo/03_communes.seed.csv

  Columns:
    commune_name, province_name, commune_code(optional)

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
  const csvPath = path.resolve(process.cwd(), "data/geo/03_communes.seed.csv");
  if (!fs.existsSync(csvPath)) throw new Error(`Missing ${csvPath}`);
  const rows = parseCsv(csvPath);

  let upserted = 0;
  for (const row of rows) {
    const communeName = row["commune_name"];
    const provinceName = row["province_name"];
    const communeCode = row["commune_code"] || null;

    if (!communeName || !provinceName) continue;

    const province = await prisma.geoUnit.findFirst({
      where: { level: GeoLevel.PROVINCE, name: provinceName },
      select: { id: true },
    });

    if (!province) {
      console.error(`[seed] commune skipped (province not found): ${communeName} -> ${provinceName}`);
      continue;
    }

    await prisma.geoUnit.upsert({
      where: {
        level_name_parentId: {
          level: GeoLevel.COMMUNE,
          name: communeName,
          parentId: province.id,
        },
      },
      update: { code: communeCode },
      create: {
        level: GeoLevel.COMMUNE,
        name: communeName,
        code: communeCode,
        parentId: province.id,
      },
    });
    upserted++;
  }

  const count = await prisma.geoUnit.count({ where: { level: GeoLevel.COMMUNE } });
  console.log(`[seed] communes upserted=${upserted}, total_in_db=${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

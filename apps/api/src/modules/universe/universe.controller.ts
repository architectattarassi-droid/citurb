import { Body, Controller, Get, Post, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { UniverseService } from "./universe.service";
import { UniverseQuery } from "./universe.types";
import { Tome } from '../../tomes/tome-at';

function parseBool(v: any): boolean | undefined {
  if (v === undefined) return undefined;
  if (v === true || v === "true" || v === "1" || v === 1) return true;
  if (v === false || v === "false" || v === "0" || v === 0) return false;
  return undefined;
}
function parseNum(v: any): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeQuery(q: any): UniverseQuery {
  return {
    projectType: q.projectType,
    facades: parseNum(q.facades) as any,
    lotType: q.lotType,
    levels: parseNum(q.levels),
    hasBasement: parseBool(q.hasBasement),
    cour: q.cour,
    encorbellement: q.encorbellement,
    page: parseNum(q.page),
    pageSize: parseNum(q.pageSize),
    sort: q.sort,
    order: q.order,
  };
}

@Tome('tome_at')
@Controller("api/universe")
export class UniverseController {
  constructor(private readonly universe: UniverseService) {}

  @Get("count")
  count(@Query() q: any) {
    const query = normalizeQuery(q);
    return { count: this.universe.getCount(query) };
  }

  @Get("facets")
  facets(@Query() q: any) {
    const query = normalizeQuery(q);
    return this.universe.getFacets(query);
  }

  @Get("list")
  list(@Query() q: any) {
    const query = normalizeQuery(q);
    return this.universe.list(query);
  }

  @Get("export")
  export(@Query() q: any, @Res() res: Response) {
    const query = normalizeQuery(q);
    const csv = this.universe.exportCsv(query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="universe.csv"');
    res.send(csv);
  }
}

@Tome('tome_at')
@Controller("api/lotissement")
export class LotissementController {
  constructor(private readonly universe: UniverseService) {}

  @Get("override")
  listOverrides() {
    return { items: this.universe.getOverrides() };
  }

  @Post("override")
  upsert(@Body() body: any) {
    const lotId = String(body?.lotId ?? "");
    const overrides = (body?.overrides ?? {}) as Record<string, unknown>;
    if (!lotId) return { ok: false, error: "lotId is required" };
    return { ok: true, item: this.universe.upsertOverride(lotId, overrides) };
  }
}

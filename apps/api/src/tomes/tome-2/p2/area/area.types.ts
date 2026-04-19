export type AreaKind = "DECLARED" | "ESTIMATED" | "VERIFIED";

export type AreaMethod = "CLIENT_DECLARED" | "HEURISTIC_V1" | "VERIFIED_DOC_V1";

export type CurrentArea = {
  kind: AreaKind;
  valueM2: string; // Decimal as string from Prisma
  basis: "DECLARED" | "ESTIMATED" | "VERIFIED";
  computedAt: string;
  method: AreaMethod;
  methodVersion: string;
  sources: any[];
};

export type Complexity = {
  thresholdM2: number;
  class: "SMALL" | "LARGE";
  basis: "VERIFIED" | "ESTIMATED" | "NONE";
  valueM2?: string;
  version: string;
};

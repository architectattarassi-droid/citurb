// P2 UI — Consumer-only contracts (frontend must NOT infer business rules)

export type P2AreaLevelKey = "L1" | "L2" | "L3";

export type P2AreaLevel = {
  key: P2AreaLevelKey;
  label: string; // backend-provided label
  value: number; // backend-computed value
  unit: "m2" | "ha" | string;
  source?: string;
  meta?: Record<string, unknown>;
};

export type P2Complexity = {
  tier: "low" | "medium" | "high" | string;
  label: string;
  details?: string[];
};

export type P2Pricing = {
  currency: "MAD" | "EUR" | "USD" | string;
  amount?: number;
  amount_min?: number;
  amount_max?: number;
  label?: string;
  breakdown?: Array<{
    label: string;
    amount?: number;
    meta?: Record<string, unknown>;
  }>;
  disclaimers?: string[];
};

export type P2Vigilance = {
  level: "info" | "warning" | "critical" | string;
  title: string;
  message: string;
  rule_ids?: string[]; // backend-provided RuleIds (display only)
};

export type P2UiBlock =
  | { kind: "area"; levels: P2AreaLevel[] }
  | { kind: "complexity"; complexity: P2Complexity }
  | { kind: "pricing"; pricing: P2Pricing }
  | { kind: "vigilance"; items: P2Vigilance[] }
  | { kind: "text"; title?: string; body: string }
  | { kind: "list"; title?: string; items: string[] }
  | { kind: "unknown"; raw: unknown };

// ---------- INPUT (NO BUSINESS VALIDATION IN UI) ----------

export type P2InputPayload = {
  // identity / context
  city?: string;
  zone_code?: string;
  project_type?: string;
  notes?: string;

  // numeric inputs (raw user values, no derived values)
  land_area_m2?: number;
  built_area_m2?: number;
  floors?: number;

  // references
  lot_id?: string;
  dossier_ref?: string;

  // extensible
  extra?: Record<string, unknown>;
};

export type P2ResultPayload = {
  ok: true;
  request_id: string;
  ui_blocks: P2UiBlock[]; // backend-decided display structure
  headline?: {
    title: string;
    subtitle?: string;
  };
};

export type P2ErrorPayload = {
  ok: false;
  error: {
    code?: string;
    message: string;
    incident_id?: string;
    details?: unknown;
  };
};

export type P2SimulateResponse = P2ResultPayload | P2ErrorPayload;

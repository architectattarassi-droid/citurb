export const RULES = {
  TRACE_REDACTION: "T@-R-TRACE-001",
  ALERT_ADMIN: "T@-R-ALERT-001",

  // Contract / Tome-chain enforcement
  CONTRACT_TOME_CHAIN_REQUIRED: "T@-R-CONTRACT-001",
  MUTATION_GATE: "T@-META-005",
  PERM_MATRIX_ACTION_NOT_ALLOWED: "T3-R-L1-014",
  CYCLES_BILLING: "T3-R-L4-CYCLES-001",
} as const;

export type RuleId = (typeof RULES)[keyof typeof RULES];

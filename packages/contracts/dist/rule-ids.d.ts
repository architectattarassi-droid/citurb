export declare const RULES: {
    readonly TRACE_REDACTION: "T@-R-TRACE-001";
    readonly ALERT_ADMIN: "T@-R-ALERT-001";
    readonly CONTRACT_TOME_CHAIN_REQUIRED: "T@-R-CONTRACT-001";
    readonly MUTATION_GATE: "T@-META-005";
    readonly PERM_MATRIX_ACTION_NOT_ALLOWED: "T3-R-L1-014";
    readonly CYCLES_BILLING: "T3-R-L4-CYCLES-001";
};
export type RuleId = (typeof RULES)[keyof typeof RULES];

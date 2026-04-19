/**
 * Canonical Tome chain used to enforce: "front must pass through the doctrine".
 * This is a CONTRACT signal (not a security boundary). Real security remains server-side guards.
 */
export declare const TOMES: readonly ["T@", "T0", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9"];
export type TomeId = (typeof TOMES)[number];
export declare const TOME_CHAIN_V1: `v1:${string}`;
export declare const HDR_TOME_CHAIN: "x-cit-tome-chain";

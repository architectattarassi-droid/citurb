/**
 * Canonical Tome chain used to enforce: "front must pass through the doctrine".
 * This is a CONTRACT signal (not a security boundary). Real security remains server-side guards.
 */

export const TOMES = [
  "T@",
  "T0",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
] as const;

export type TomeId = (typeof TOMES)[number];

export const TOME_CHAIN_V1 = `v1:${TOMES.join(">")}` as const;

export const HDR_TOME_CHAIN = "x-cit-tome-chain" as const;

"use strict";
/**
 * Canonical Tome chain used to enforce: "front must pass through the doctrine".
 * This is a CONTRACT signal (not a security boundary). Real security remains server-side guards.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HDR_TOME_CHAIN = exports.TOME_CHAIN_V1 = exports.TOMES = void 0;
exports.TOMES = [
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
];
exports.TOME_CHAIN_V1 = `v1:${exports.TOMES.join(">")}`;
exports.HDR_TOME_CHAIN = "x-cit-tome-chain";

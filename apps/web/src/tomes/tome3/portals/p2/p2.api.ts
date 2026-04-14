import { apiFetch } from "../../../tome4/apiClient";
import type { P2InputPayload, P2SimulateResponse } from "./p2.types";

/**
 * P2 consumer-only fetcher.
 * IMPORTANT: endpoint path is a placeholder until Chat0 sync packet provides the canonical path.
 */
export function p2Simulate(payload: P2InputPayload) {
  return apiFetch<P2SimulateResponse>("/p2/simulate", { method: "POST", body: payload });
}

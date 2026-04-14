import { useCallback, useState } from "react";
import type { ApiError } from "../../../tome4/apiClient";
import { p2Simulate } from "./p2.api";
import type { P2InputPayload, P2SimulateResponse } from "./p2.types";

export type UseP2SimulateState = {
  data: P2SimulateResponse | null;
  loading: boolean;
  error: ApiError | null;
};

/**
 * Consumer-only hook.
 * No business inference. Just call + store response.
 */
export function useP2Simulate() {
  const [data, setData] = useState<P2SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const simulate = useCallback(async (payload: P2InputPayload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await p2Simulate(payload);
      setData(res);
      return res;
    } catch (e) {
      setError(e as ApiError);
      setData(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, simulate, reset };
}

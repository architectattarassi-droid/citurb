import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isChunkLoadError, reloadOnceForChunkError } from "./chunkReload";
import {
  __resetDeployWatch, checkForUpdate, flagUpdatePending, pendingUpdate, reloadIfUpdatePending,
} from "./deployWatch";

// Environnement node : fenêtre minimale (sessionStorage + location.reload).
function fakeWindow(opts: { storageThrows?: boolean } = {}) {
  const store = new Map<string, string>();
  const reload = vi.fn();
  const sessionStorage = {
    getItem: (k: string) => {
      if (opts.storageThrows) throw new Error("SecurityError");
      return store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (opts.storageThrows) throw new Error("SecurityError");
      store.set(k, v);
    },
  };
  vi.stubGlobal("window", { sessionStorage, location: { reload } });
  return { reload, store };
}

const json = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("isChunkLoadError", () => {
  it("reconnaît les messages Chrome, Firefox, Safari et ChunkLoadError", () => {
    expect(isChunkLoadError(new TypeError(
      "Failed to fetch dynamically imported module: https://x/assets/ChiffragePage-Bh1l95Wy.js",
    ))).toBe(true);
    expect(isChunkLoadError(new TypeError("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError({ name: "ChunkLoadError", message: "x" })).toBe(true);
  });

  it("ignore les autres erreurs", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError({ status: 404, statusText: "Not Found" })).toBe(false);
  });
});

describe("reloadOnceForChunkError", () => {
  it("recharge une seule fois dans la fenêtre anti-boucle", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const { reload } = fakeWindow();
    expect(reloadOnceForChunkError()).toBe(true);
    expect(reloadOnceForChunkError()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    vi.setSystemTime(1_000_000 + 11_000);
    expect(reloadOnceForChunkError()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("ne recharge pas sans sessionStorage (pas de garde possible)", () => {
    const { reload } = fakeWindow({ storageThrows: true });
    expect(reloadOnceForChunkError()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("deployWatch", () => {
  beforeEach(() => __resetDeployWatch());

  it("signale un build distant différent", async () => {
    const f = json({ buildId: "new" });
    await checkForUpdate(f as unknown as typeof fetch, 1, "old");
    expect(f).toHaveBeenCalledWith("/version.json", { cache: "no-store" });
    expect(pendingUpdate()).toBe("new");
  });

  it("ne signale rien pour le même build, une erreur HTTP ou hors ligne", async () => {
    await checkForUpdate(json({ buildId: "same" }) as unknown as typeof fetch, 1, "same");
    expect(pendingUpdate()).toBeNull();
    __resetDeployWatch();
    await checkForUpdate(json({}, false) as unknown as typeof fetch, 1, "same");
    expect(pendingUpdate()).toBeNull();
    __resetDeployWatch();
    const offline = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    await expect(checkForUpdate(offline as unknown as typeof fetch, 1, "same")).resolves.toBeUndefined();
    expect(pendingUpdate()).toBeNull();
  });

  it("limite la fréquence des vérifications", async () => {
    const f = json({ buildId: "same" });
    await checkForUpdate(f as unknown as typeof fetch, 1_000, "same");
    await checkForUpdate(f as unknown as typeof fetch, 2_000, "same");
    expect(f).toHaveBeenCalledTimes(1);
    await checkForUpdate(f as unknown as typeof fetch, 1_000 + 5 * 60_000, "same");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("recharge au plus une fois par build distant", () => {
    const { reload } = fakeWindow();
    expect(reloadIfUpdatePending()).toBe(false);
    flagUpdatePending("b2");
    expect(reloadIfUpdatePending()).toBe(true);
    expect(reloadIfUpdatePending()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

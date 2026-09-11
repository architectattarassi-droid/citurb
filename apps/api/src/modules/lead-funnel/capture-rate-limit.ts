/**
 * capture-rate-limit.ts
 *
 * Limiteur de débit en mémoire (fenêtre glissante) pour la route publique
 * POST /api/lead-funnel/capture. Gratuit, sans dépendance externe.
 *
 * Mémoire du process uniquement : suffisant pour une instance unique. Une
 * instance redémarrée repart de zéro, ce qui reste acceptable pour freiner
 * les soumissions automatisées.
 */

export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Enregistre une tentative. Retourne false si la clé a dépassé sa limite. */
  take(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(now);
    return true;
  }

  private prune(now: number): void {
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key);
    }
  }
}

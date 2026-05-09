import { Injectable, Logger } from "@nestjs/common";
import type { Response } from "express";

/**
 * MessagesStreamService — Sprint E2 (temps réel)
 *
 * Bus d'événements en mémoire (single-process) pour SSE.
 * Pour multi-instance Railway, brancher Redis Pub/Sub plus tard.
 *
 * Évents possibles :
 *   - message:new         (push d'un nouveau message)
 *   - message:edit        (édition)
 *   - message:delete      (suppression soft)
 *   - message:reaction    (réaction ajoutée/retirée)
 *   - message:read        (✓✓)
 *   - typing              (typing indicator, n'est pas persisté)
 *
 * Chaque cercle a son propre canal. Les SSE clients s'abonnent par cercleId
 * et reçoivent uniquement les events de leurs cercles.
 */

type ChatEvent = {
  type:
    | "message:new"
    | "message:edit"
    | "message:delete"
    | "message:reaction"
    | "message:read"
    | "typing";
  payload: any;
};

type Subscriber = {
  res: Response;
  userId: string;
};

@Injectable()
export class MessagesStreamService {
  private readonly log = new Logger("MessagesStreamService");
  private readonly channels = new Map<string, Set<Subscriber>>();

  // ── Subscribe / unsubscribe ────────────────────────────────────

  subscribe(cercleId: string, userId: string, res: Response): () => void {
    let set = this.channels.get(cercleId);
    if (!set) {
      set = new Set<Subscriber>();
      this.channels.set(cercleId, set);
    }
    const sub: Subscriber = { res, userId };
    set.add(sub);

    // Heartbeat: ping toutes les 25s pour éviter timeout proxy
    const ping = setInterval(() => {
      try {
        res.write(`: ping ${Date.now()}\n\n`);
      } catch {
        clearInterval(ping);
      }
    }, 25000);

    return () => {
      clearInterval(ping);
      const s = this.channels.get(cercleId);
      if (s) {
        s.delete(sub);
        if (s.size === 0) this.channels.delete(cercleId);
      }
    };
  }

  // ── Publish ────────────────────────────────────────────────────

  publish(cercleId: string, event: ChatEvent): void {
    const set = this.channels.get(cercleId);
    if (!set || set.size === 0) return;

    const data = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
    const dead: Subscriber[] = [];
    for (const sub of set) {
      try {
        sub.res.write(data);
      } catch (err) {
        dead.push(sub);
      }
    }
    for (const d of dead) set.delete(d);
  }

  // ── Typing indicator (ephemeral) ───────────────────────────────

  typing(cercleId: string, userId: string, displayName: string, isTyping: boolean): void {
    this.publish(cercleId, {
      type: "typing",
      payload: { userId, displayName, isTyping, at: Date.now() },
    });
  }

  // ── Counts (debug / health) ────────────────────────────────────

  stats() {
    let total = 0;
    for (const s of this.channels.values()) total += s.size;
    return { channels: this.channels.size, totalSubscribers: total };
  }
}

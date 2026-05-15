import { Injectable, Logger } from "@nestjs/common";
import type { Response } from "express";

/**
 * DirectMessagesStreamService — Sprint L
 *
 * Bus SSE in-memory pour la messagerie directe 1-to-1.
 * Subscribers groupés par userId (pas par threadId) car un user reçoit
 * des events pour TOUS ses threads en parallèle.
 */

type DMEvent = {
  type:
    | "dm:new"
    | "dm:edit"
    | "dm:delete"
    | "dm:read"
    | "dm:typing";
  payload: any;
};

type Subscriber = { res: Response };

@Injectable()
export class DirectMessagesStreamService {
  private readonly log = new Logger("DirectMessagesStreamService");
  private readonly userChannels = new Map<string, Set<Subscriber>>();

  subscribe(userId: string, res: Response): () => void {
    let set = this.userChannels.get(userId);
    if (!set) {
      set = new Set<Subscriber>();
      this.userChannels.set(userId, set);
    }
    const sub: Subscriber = { res };
    set.add(sub);

    const ping = setInterval(() => {
      try { res.write(`: ping ${Date.now()}\n\n`); } catch { clearInterval(ping); }
    }, 25000);

    return () => {
      clearInterval(ping);
      const s = this.userChannels.get(userId);
      if (s) {
        s.delete(sub);
        if (s.size === 0) this.userChannels.delete(userId);
      }
    };
  }

  /** Publie un event vers TOUS les userIds donnés (généralement les participants d'un thread). */
  publishToUsers(userIds: string[], event: DMEvent): void {
    const data = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
    for (const userId of userIds) {
      const set = this.userChannels.get(userId);
      if (!set || set.size === 0) continue;
      const dead: Subscriber[] = [];
      for (const sub of set) {
        try { sub.res.write(data); } catch { dead.push(sub); }
      }
      for (const d of dead) set.delete(d);
    }
  }

  stats() {
    let total = 0;
    for (const s of this.userChannels.values()) total += s.size;
    return { userChannels: this.userChannels.size, totalSubscribers: total };
  }
}

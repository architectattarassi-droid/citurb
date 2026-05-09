"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesStreamService = void 0;
const common_1 = require("@nestjs/common");
let MessagesStreamService = class MessagesStreamService {
    log = new common_1.Logger("MessagesStreamService");
    channels = new Map();
    // ── Subscribe / unsubscribe ────────────────────────────────────
    subscribe(cercleId, userId, res) {
        let set = this.channels.get(cercleId);
        if (!set) {
            set = new Set();
            this.channels.set(cercleId, set);
        }
        const sub = { res, userId };
        set.add(sub);
        // Heartbeat: ping toutes les 25s pour éviter timeout proxy
        const ping = setInterval(() => {
            try {
                res.write(`: ping ${Date.now()}\n\n`);
            }
            catch {
                clearInterval(ping);
            }
        }, 25000);
        return () => {
            clearInterval(ping);
            const s = this.channels.get(cercleId);
            if (s) {
                s.delete(sub);
                if (s.size === 0)
                    this.channels.delete(cercleId);
            }
        };
    }
    // ── Publish ────────────────────────────────────────────────────
    publish(cercleId, event) {
        const set = this.channels.get(cercleId);
        if (!set || set.size === 0)
            return;
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
        const dead = [];
        for (const sub of set) {
            try {
                sub.res.write(data);
            }
            catch (err) {
                dead.push(sub);
            }
        }
        for (const d of dead)
            set.delete(d);
    }
    // ── Typing indicator (ephemeral) ───────────────────────────────
    typing(cercleId, userId, displayName, isTyping) {
        this.publish(cercleId, {
            type: "typing",
            payload: { userId, displayName, isTyping, at: Date.now() },
        });
    }
    // ── Counts (debug / health) ────────────────────────────────────
    stats() {
        let total = 0;
        for (const s of this.channels.values())
            total += s.size;
        return { channels: this.channels.size, totalSubscribers: total };
    }
};
exports.MessagesStreamService = MessagesStreamService;
exports.MessagesStreamService = MessagesStreamService = __decorate([
    (0, common_1.Injectable)()
], MessagesStreamService);

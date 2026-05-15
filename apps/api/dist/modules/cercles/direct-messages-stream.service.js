"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectMessagesStreamService = void 0;
const common_1 = require("@nestjs/common");
let DirectMessagesStreamService = class DirectMessagesStreamService {
    log = new common_1.Logger("DirectMessagesStreamService");
    userChannels = new Map();
    subscribe(userId, res) {
        let set = this.userChannels.get(userId);
        if (!set) {
            set = new Set();
            this.userChannels.set(userId, set);
        }
        const sub = { res };
        set.add(sub);
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
            const s = this.userChannels.get(userId);
            if (s) {
                s.delete(sub);
                if (s.size === 0)
                    this.userChannels.delete(userId);
            }
        };
    }
    /** Publie un event vers TOUS les userIds donnés (généralement les participants d'un thread). */
    publishToUsers(userIds, event) {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
        for (const userId of userIds) {
            const set = this.userChannels.get(userId);
            if (!set || set.size === 0)
                continue;
            const dead = [];
            for (const sub of set) {
                try {
                    sub.res.write(data);
                }
                catch {
                    dead.push(sub);
                }
            }
            for (const d of dead)
                set.delete(d);
        }
    }
    stats() {
        let total = 0;
        for (const s of this.userChannels.values())
            total += s.size;
        return { userChannels: this.userChannels.size, totalSubscribers: total };
    }
};
exports.DirectMessagesStreamService = DirectMessagesStreamService;
exports.DirectMessagesStreamService = DirectMessagesStreamService = __decorate([
    (0, common_1.Injectable)()
], DirectMessagesStreamService);

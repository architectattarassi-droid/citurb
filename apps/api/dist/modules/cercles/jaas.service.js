"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JaasService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
let JaasService = class JaasService {
    jwt;
    log = new common_1.Logger("JaasService");
    constructor(jwt) {
        this.jwt = jwt;
    }
    isJaasConfigured() {
        return !!(process.env.JAAS_APP_ID && process.env.JAAS_API_KEY && process.env.JAAS_PRIVATE_KEY_PEM);
    }
    /**
     * Retourne la config Jitsi à passer au front.
     *
     * @param jitsiRoomName — nom de room CITURBAREA (slug court, sans /)
     * @param user — { id, displayName, email, isModerator }
     */
    buildConfig(jitsiRoomName, user) {
        if (!this.isJaasConfigured()) {
            // Fallback meet.jit.si (anonyme, marche tout de suite)
            return {
                mode: "public",
                domain: "meet.jit.si",
                roomName: jitsiRoomName,
                parentNodeId: "jaas-container",
            };
        }
        const appId = process.env.JAAS_APP_ID;
        const apiKey = process.env.JAAS_API_KEY;
        const privateKey = process.env.JAAS_PRIVATE_KEY_PEM.replace(/\\n/g, "\n");
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            aud: "jitsi",
            iss: "chat",
            sub: appId,
            room: "*",
            nbf: now - 10,
            iat: now,
            exp: now + 2 * 60 * 60, // 2h
            context: {
                features: {
                    livestreaming: false,
                    recording: false,
                    transcription: false,
                    "outbound-call": false,
                },
                user: {
                    "hidden-from-recorder": false,
                    moderator: user.isModerator,
                    name: user.displayName,
                    id: user.id,
                    avatar: "",
                    email: user.email,
                },
            },
        };
        let token;
        try {
            token = this.jwt.sign(payload, {
                algorithm: "RS256",
                privateKey,
                keyid: apiKey,
            });
        }
        catch (e) {
            this.log.error(`JaaS sign failed: ${e?.message} — fallback meet.jit.si`);
            return {
                mode: "public",
                domain: "meet.jit.si",
                roomName: jitsiRoomName,
                parentNodeId: "jaas-container",
            };
        }
        return {
            mode: "jaas",
            domain: "8x8.vc",
            // JaaS exige le format <appId>/<roomName>
            roomName: `${appId}/${jitsiRoomName}`,
            jwt: token,
            appId,
            parentNodeId: "jaas-container",
        };
    }
};
exports.JaasService = JaasService;
exports.JaasService = JaasService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], JaasService);

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entitlementsFor = exports.capsFor = exports.AuthService = exports.Tome5Module = void 0;
/**
 * Tome 5 — Auth / RBAC (JWT, caps, rôles, entitlements)
 * Barrel d'export canonique.
 */
var tome_5_module_1 = require("./tome-5.module");
Object.defineProperty(exports, "Tome5Module", { enumerable: true, get: function () { return tome_5_module_1.Tome5Module; } });
var auth_service_1 = require("./auth/auth.service");
Object.defineProperty(exports, "AuthService", { enumerable: true, get: function () { return auth_service_1.AuthService; } });
var rbac_1 = require("./auth/rbac");
Object.defineProperty(exports, "capsFor", { enumerable: true, get: function () { return rbac_1.capsFor; } });
Object.defineProperty(exports, "entitlementsFor", { enumerable: true, get: function () { return rbac_1.entitlementsFor; } });

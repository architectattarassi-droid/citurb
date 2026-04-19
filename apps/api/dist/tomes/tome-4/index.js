"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome4Service = exports.Tome4Module = void 0;
/**
 * Tome 4 — Wiring technique (controllers, jobs, storage, adapters)
 * Barrel d'export canonique.
 */
var tome_4_module_1 = require("./tome-4.module");
Object.defineProperty(exports, "Tome4Module", { enumerable: true, get: function () { return tome_4_module_1.Tome4Module; } });
var tome_4_service_1 = require("./tome-4.service");
Object.defineProperty(exports, "Tome4Service", { enumerable: true, get: function () { return tome_4_service_1.Tome4Service; } });

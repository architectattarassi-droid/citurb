"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Chargement du .env racine du monorepo — DOIT s'exécuter avant tout autre
// import (notamment AppModule), car des consommateurs import-time lisent
// process.env au moment de l'évaluation de leurs @Module (ex. JwtModule.register
// dans auth/admin/cercles). Sans ça, le secret JWT est figé sur le fallback à
// l'import puis vérifié avec la vraie valeur → mismatch 401. Path absolu via
// __dirname → robuste quel que soit le cwd (dev: apps/api/src, prod: apps/api/dist).
// N'écrase pas les variables déjà présentes (sûr en prod : Railway les fournit).
const dotenv = require("dotenv");
const path_1 = require("path");
dotenv.config({ path: (0, path_1.join)(__dirname, "../../../.env") });

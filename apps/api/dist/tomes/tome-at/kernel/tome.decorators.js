"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule = exports.Tome = exports.META_RULE = exports.META_TOME = void 0;
const common_1 = require("@nestjs/common");
// Canonical metadata keys (OPS-only; never leak to public)
exports.META_TOME = 'citurbarea:tome';
exports.META_RULE = 'citurbarea:rule_id';
/**
 * Decorator required on every controller AND every handler.
 * Goal: prevent "free-floating" endpoints that bypass the Tome doctrine.
 */
const Tome = (tome) => (0, common_1.SetMetadata)(exports.META_TOME, tome);
exports.Tome = Tome;
/**
 * Decorator required on every handler that enforces/implements a doctrine rule.
 * Example: @Rule('T3-R-L1-014')
 */
const Rule = (ruleId) => (0, common_1.SetMetadata)(exports.META_RULE, ruleId);
exports.Rule = Rule;

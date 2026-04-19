"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireCaps = exports.REQ_CAPS_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.REQ_CAPS_KEY = "req_caps";
const RequireCaps = (...caps) => (0, common_1.SetMetadata)(exports.REQ_CAPS_KEY, caps);
exports.RequireCaps = RequireCaps;

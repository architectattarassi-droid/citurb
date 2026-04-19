"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDir = ensureDir;
exports.readJson = readJson;
exports.writeJson = writeJson;
const fs = require("fs");
const path = require("path");
function ensureDir(p) {
    if (!fs.existsSync(p))
        fs.mkdirSync(p, { recursive: true });
}
function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath))
            return fallback;
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return fallback;
    }
}
function writeJson(filePath, value) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

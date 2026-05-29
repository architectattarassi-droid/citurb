"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIME_LIMITS = void 0;
exports.validatePresign = validatePresign;
exports.extFor = extFor;
exports.MIME_LIMITS = {
    photo: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10 * 1024 * 1024 },
    video: { mimes: ["video/mp4", "video/quicktime", "video/webm"], maxBytes: 200 * 1024 * 1024 },
    thumbnail: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 2 * 1024 * 1024 },
};
function validatePresign(input) {
    const lim = exports.MIME_LIMITS[input.kind];
    if (!lim)
        throw new Error(`Kind invalide: ${input.kind}`);
    if (!lim.mimes.includes(input.mime)) {
        throw new Error(`MIME non autorisé pour ${input.kind}: ${input.mime} (attendu: ${lim.mimes.join(", ")})`);
    }
    if (!Number.isFinite(input.size) || input.size <= 0 || input.size > lim.maxBytes) {
        throw new Error(`Taille hors plage pour ${input.kind}: ${input.size} (max: ${lim.maxBytes})`);
    }
    if (!input.ownerKey || !/^[A-Za-z0-9_\-:.]{1,64}$/.test(input.ownerKey)) {
        throw new Error("ownerKey invalide");
    }
}
function extFor(mime) {
    return {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "video/mp4": "mp4",
        "video/quicktime": "mov",
        "video/webm": "webm",
    }[mime] || "bin";
}

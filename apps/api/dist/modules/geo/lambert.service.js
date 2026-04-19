"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambertService = void 0;
const common_1 = require("@nestjs/common");
// Clarke 1880 ellipsoid
const A = 6378249.145;
const E = 0.08248325676;
// Lambert conformal conic parameters — Maroc
const PARAMS = {
    Lambert_Maroc_Nord: {
        lat0: toRad(33.3),
        lng0: toRad(-5.4),
        k0: 1.0,
        fe: 500000,
        fn: 300000,
        phi1: toRad(31.73),
        phi2: toRad(34.87),
    },
    Lambert_Maroc_Sud: {
        lat0: toRad(29.7),
        lng0: toRad(-5.4),
        k0: 1.0,
        fe: 500000,
        fn: 300000,
        phi1: toRad(29.18),
        phi2: toRad(31.73),
    },
};
function toRad(deg) { return (deg * Math.PI) / 180; }
function toDeg(rad) { return (rad * 180) / Math.PI; }
function mSeries(phi) {
    const sinPhi = Math.sin(phi);
    return Math.cos(phi) / Math.sqrt(1 - E * E * sinPhi * sinPhi);
}
function tSeries(phi) {
    const sinPhi = Math.sin(phi);
    const eSinPhi = E * sinPhi;
    return Math.tan(Math.PI / 4 - phi / 2) / Math.pow((1 - eSinPhi) / (1 + eSinPhi), E / 2);
}
function lambertParams(p) {
    const m1 = mSeries(p.phi1);
    const m2 = mSeries(p.phi2);
    const t0 = tSeries(p.lat0);
    const t1 = tSeries(p.phi1);
    const t2 = tSeries(p.phi2);
    const n = (Math.log(m1) - Math.log(m2)) / (Math.log(t1) - Math.log(t2));
    const F = m1 / (n * Math.pow(t1, n));
    const rho0 = A * F * Math.pow(t0, n);
    return { n, F, rho0 };
}
let LambertService = class LambertService {
    detectSystem(x, y) {
        return y > 300000 ? 'Lambert_Maroc_Nord' : 'Lambert_Maroc_Sud';
    }
    lambertToWGS84(x, y, system) {
        const p = PARAMS[system];
        const { n, F, rho0 } = lambertParams(p);
        const dx = x - p.fe;
        const dy = rho0 - (y - p.fn);
        const rho = Math.sqrt(dx * dx + dy * dy) * Math.sign(n);
        const theta = Math.atan2(dx, dy);
        const t = Math.pow(rho / (A * F), 1 / n);
        let phi = Math.PI / 2 - 2 * Math.atan(t);
        for (let i = 0; i < 10; i++) {
            const sinPhi = Math.sin(phi);
            const eSinPhi = E * sinPhi;
            phi = Math.PI / 2 - 2 * Math.atan(t * Math.pow((1 - eSinPhi) / (1 + eSinPhi), E / 2));
        }
        const lng = theta / n + p.lng0;
        return { lat: toDeg(phi), lng: toDeg(lng) };
    }
    wgs84ToLambert(lat, lng, system) {
        const p = PARAMS[system];
        const { n, F, rho0 } = lambertParams(p);
        const phi = toRad(lat);
        const lam = toRad(lng);
        const t = tSeries(phi);
        const rho = A * F * Math.pow(t, n);
        const theta = n * (lam - p.lng0);
        const x = p.fe + rho * Math.sin(theta);
        const y = p.fn + rho0 - rho * Math.cos(theta);
        return { x, y };
    }
};
exports.LambertService = LambertService;
exports.LambertService = LambertService = __decorate([
    (0, common_1.Injectable)()
], LambertService);

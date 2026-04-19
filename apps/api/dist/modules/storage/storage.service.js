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
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs/promises");
const path = require("path");
const archiver = require("archiver");
const fss = require("fs");
let StorageService = class StorageService {
    root;
    constructor() {
        this.root = process.env.STORAGE_ROOT ?? 'C:/CITURBAREA_DATA';
    }
    phaseDirs = [
        '01_esquisse',
        '02_aps',
        '03_apd',
        '04_mandat_bet',
        '05_autorisation',
        '06_dossier_execution',
        '07_dce',
        '08_mandats',
        '09_ouverture_chantier',
        '10_go_planchers',
        '11_lots_secondaires',
        '12_reception_provisoire',
        '13_reception_definitive',
        '14_permis_habiter',
    ];
    withPv = new Set(['10_go_planchers', '11_lots_secondaires']);
    async ensureDossierStructure(dossierId, refInterne) {
        const base = path.join(this.root, 'dossiers', dossierId);
        await fs.mkdir(base, { recursive: true });
        for (const phase of this.phaseDirs) {
            const phaseBase = path.join(base, phase);
            await fs.mkdir(path.join(phaseBase, 'finale'), { recursive: true });
            await fs.mkdir(path.join(phaseBase, 'sources'), { recursive: true });
            if (this.withPv.has(phase)) {
                await fs.mkdir(path.join(phaseBase, 'pv_hebdomadaires'), { recursive: true });
            }
        }
        await fs.mkdir(path.join(base, 'archive'), { recursive: true });
        const meta = { dossierId, refInterne: refInterne ?? null, createdAt: new Date().toISOString(), version: 1 };
        await fs.writeFile(path.join(base, 'meta.json'), JSON.stringify(meta, null, 2));
    }
    async getDossierPath(dossierId) {
        return path.join(this.root, 'dossiers', dossierId);
    }
    async getPhasePath(dossierId, phase, subdir) {
        return path.join(this.root, 'dossiers', dossierId, phase, subdir);
    }
    async archiveDossier(dossierId, refInterne) {
        const base = path.join(this.root, 'dossiers', dossierId);
        const date = new Date().toISOString().slice(0, 10);
        const zipPath = path.join(base, 'archive', `dossier_complet_${refInterne}_${date}.zip`);
        await new Promise((resolve, reject) => {
            const output = fss.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 6 } });
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            archive.glob('**/*', { cwd: base, ignore: ['archive/**'] });
            archive.finalize();
        });
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StorageService);

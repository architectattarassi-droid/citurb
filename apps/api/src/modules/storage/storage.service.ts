import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as archiver from 'archiver';
import * as fss from 'fs';

@Injectable()
export class StorageService {
  private readonly root: string;

  constructor() {
    this.root = process.env.STORAGE_ROOT ?? 'C:/CITURBAREA_DATA';
  }

  private phaseDirs = [
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

  private withPv = new Set(['10_go_planchers', '11_lots_secondaires']);

  async ensureDossierStructure(dossierId: string, refInterne?: string): Promise<void> {
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

  async getDossierPath(dossierId: string): Promise<string> {
    return path.join(this.root, 'dossiers', dossierId);
  }

  async getPhasePath(
    dossierId: string,
    phase: string,
    subdir: 'finale' | 'sources' | 'pv_hebdomadaires',
  ): Promise<string> {
    return path.join(this.root, 'dossiers', dossierId, phase, subdir);
  }

  async archiveDossier(dossierId: string, refInterne: string): Promise<void> {
    const base = path.join(this.root, 'dossiers', dossierId);
    const date = new Date().toISOString().slice(0, 10);
    const zipPath = path.join(base, 'archive', `dossier_complet_${refInterne}_${date}.zip`);

    await new Promise<void>((resolve, reject) => {
      const output = fss.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 6 } });
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      archive.glob('**/*', { cwd: base, ignore: ['archive/**'] });
      archive.finalize();
    });
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../kernel/prisma/prisma.service";
import { ProbativeLogService } from "../kernel/services/probative-log.service";

export type Profession = "AVOCAT" | "NOTAIRE" | "ADOUL" | "EXPERT_JUDICIAIRE" | "HUISSIER";
export type AgrementStatus = "PENDING" | "VERIFIED_BARREAU" | "KYC_DONE" | "AGREE_CITURBAREA" | "SUSPENDED" | "REJECTED";

export interface Mandataire {
  id: string;
  slug: string;
  nomComplet: string;
  profession: Profession;
  ordreNumero: string;
  ville: string;
  specialites: string[];
  tarifHoraireMad: number;
  note: number;            // 0-5
  missionsCompletees: number;
  bio?: string;
  photoUrl?: string;
  status: AgrementStatus;
  rayonKm?: number;
}

/**
 * MandatairesRegistryService — annuaire d'avocats/adouls/notaires agréés CITURBAREA.
 * Indispensable au parcours MRE (exécution physique des démarches au Maroc).
 * Seed 50 mandataires pilotes ; missions stockées dans Dossier.payload.mandataireMissions.
 */
@Injectable()
export class MandatairesRegistryService {
  private readonly logger = new Logger(MandatairesRegistryService.name);
  private registry: Mandataire[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly probative: ProbativeLogService,
  ) {
    this.registry = this.seed();
  }

  search(filters: { ville?: string; specialite?: string; minNote?: number; maxTarif?: number; profession?: Profession }): Mandataire[] {
    return this.registry.filter((m) => {
      if (m.status !== "AGREE_CITURBAREA") return false;
      if (filters.ville && m.ville.toLowerCase() !== filters.ville.toLowerCase()) return false;
      if (filters.profession && m.profession !== filters.profession) return false;
      if (filters.specialite && !m.specialites.some((s) => s.toLowerCase().includes(filters.specialite!.toLowerCase()))) return false;
      if (filters.minNote && m.note < filters.minNote) return false;
      if (filters.maxTarif && m.tarifHoraireMad > filters.maxTarif) return false;
      return true;
    }).sort((a, b) => b.note - a.note);
  }

  getBySlug(slug: string): Mandataire | null {
    return this.registry.find((m) => m.slug === slug) || null;
  }

  /** Demande de mission à un mandataire (stockée sur le dossier). */
  async requestMission(input: { dossierId: string; mandataireId: string; clientUserId: string; missionType: string; description: string; honorairesProposeMad: number; deadline?: string }) {
    const d = await this.prisma.dossier.findUnique({ where: { id: input.dossierId } });
    if (!d) throw new Error(`Dossier introuvable: ${input.dossierId}`);
    const m = this.registry.find((x) => x.id === input.mandataireId);
    if (!m) throw new Error(`Mandataire introuvable`);
    const payload = (d.payload as any) || {};
    const missions = payload.mandataireMissions || [];
    const mission = {
      id: randomUUID(),
      mandataireId: input.mandataireId,
      mandataireNom: m.nomComplet,
      clientUserId: input.clientUserId,
      missionType: input.missionType,
      description: input.description,
      honorairesProposeMad: input.honorairesProposeMad,
      deadline: input.deadline,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    missions.push(mission);
    payload.mandataireMissions = missions;
    await this.prisma.dossier.update({ where: { id: input.dossierId }, data: { payload } });
    return mission;
  }

  async transitionMission(dossierId: string, missionId: string, status: string, extra?: any) {
    const d = await this.prisma.dossier.findUnique({ where: { id: dossierId } });
    if (!d) throw new Error(`Dossier introuvable`);
    const payload = (d.payload as any) || {};
    const missions = payload.mandataireMissions || [];
    const mission = missions.find((x: any) => x.id === missionId);
    if (!mission) throw new Error(`Mission introuvable`);
    mission.status = status;
    mission[`${status.toLowerCase()}At`] = new Date().toISOString();
    if (extra) Object.assign(mission, extra);
    payload.mandataireMissions = missions;
    await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });
    if (status === "VALIDATED") {
      await this.probative.append({
        kind: "MANDATAIRE_MISSION_VALIDATED", rule_id: "T2-R-MANDAT-001",
        projectId: dossierId, actorId: mission.clientUserId,
        metadata: { missionId, mandataireId: mission.mandataireId },
      }).catch(() => {});
    }
    return mission;
  }

  async listMissions(dossierId: string) {
    const d = await this.prisma.dossier.findUnique({ where: { id: dossierId } });
    return ((d?.payload as any) || {}).mandataireMissions || [];
  }

  /** Seed déterministe de 50 mandataires pilotes. */
  private seed(): Mandataire[] {
    const villes: [string, number][] = [
      ["Casablanca", 12], ["Rabat", 8], ["Marrakech", 6], ["Tanger", 5],
      ["Fès", 4], ["Agadir", 3], ["Salé", 3], ["Meknès", 3],
      ["Kénitra", 2], ["Oujda", 2], ["Tétouan", 1], ["Errachidia", 1],
    ];
    const specs = ["succession", "achat immobilier", "vente immobilier", "contentieux foncier",
      "copropriété", "urbanisme", "fiscal", "sociétés commerciales", "recouvrement", "baux",
      "construction", "MRE-Diaspora", "expertise judiciaire", "actes adoulaires", "donation"];
    const professions: Profession[] = ["AVOCAT", "NOTAIRE", "ADOUL", "EXPERT_JUDICIAIRE", "HUISSIER"];
    const prenoms = ["Yassine", "Fatima", "Mohamed", "Khadija", "Driss", "Salma", "Hamid", "Nadia", "Karim", "Leila", "Omar", "Houda"];
    const noms = ["Alaoui", "Benani", "Tazi", "Fassi", "Idrissi", "Bennani", "Cherkaoui", "Berrada", "Lahlou", "Sqalli"];

    const out: Mandataire[] = [];
    let seed = 42;
    const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    let idx = 0;
    for (const [ville, count] of villes) {
      for (let i = 0; i < count; i++) {
        const prof = professions[Math.floor(rng() * professions.length)];
        const nom = `${prenoms[Math.floor(rng() * prenoms.length)]} ${noms[Math.floor(rng() * noms.length)]}`;
        const nSpecs = 2 + Math.floor(rng() * 3);
        const mySpecs = Array.from(new Set(Array.from({ length: nSpecs }, () => specs[Math.floor(rng() * specs.length)])));
        out.push({
          id: `mand-${++idx}`,
          slug: `${nom.toLowerCase().replace(/\s+/g, "-")}-${ville.toLowerCase()}-${idx}`,
          nomComplet: nom,
          profession: prof,
          ordreNumero: `${prof.slice(0, 3)}-${1000 + idx}`,
          ville,
          specialites: mySpecs,
          tarifHoraireMad: 800 + Math.floor(rng() * 28) * 100,    // 800-3500
          note: Math.round((3.5 + rng() * 1.5) * 10) / 10,         // 3.5-5.0
          missionsCompletees: Math.floor(rng() * 150),
          bio: `${prof === "AVOCAT" ? "Avocat" : prof === "NOTAIRE" ? "Notaire" : prof === "ADOUL" ? "Adoul" : "Expert"} à ${ville}, spécialisé(e) en ${mySpecs[0]}. Agréé(e) CITURBAREA pour l'accompagnement des MRE.`,
          status: "AGREE_CITURBAREA",
          rayonKm: 30 + Math.floor(rng() * 70),
        });
      }
    }
    return out;
  }
}

/**
 * Création de dossier par l'admin — functions/_lib/dossierAdmin.ts.
 * Cas de référence : Mehdaoui (client existant d'ARC-BATI, dossier déjà avancé,
 * permis d'habiter partiel déjà réglé, autorisation expirée).
 */
import { describe, expect, it } from "vitest";
import {
  PHASES, cleTelephone, creerDossierAdmin, jetonDossier, lireJetonDossier, niveauAlerte, nomAffiche, validerCreation, type Sql,
} from "../../../../../../../functions/_lib/dossierAdmin";
import { mentionsManquantes, validerCabinet } from "../../../../../../../functions/_lib/cabinets";

const MEHDAOUI = {
  cabinetId: "cab_arc_bati",
  client: { type: "PERSONNE", civilite: "M.", prenom: "Rida", nom: "Mehdaoui", telephone: "06 12 34 56 78" },
  projet: {
    intitule: "Construction d'un immeuble R+1", typologie: "IMMEUBLE", gabarit: "r+1", lot: "Lot n° 624", lotissement: "Lotissement Alliance Darna",
    commune: "Mehdiya", prefecture: "Kénitra", titreFoncier: "TF 84848/13", autorisationNum: "GUcmha-0036/2023",
    autorisationDate: "2023-03-01", autorisationExpiration: "2026-03-01", etatChantier: "Permis d'habiter partiel délivré pour le rez-de-chaussée",
  },
  phaseActuelle: "96_PERMIS_HABITER",
  etapes: [
    { phaseCode: "30_DOSSIER_AUTORISATION", statut: "FAITE_HORS_PLATEFORME", date: "2023-01-15" },
    { phaseCode: "34_PERMIS_CONSTRUIRE", statut: "FAITE_HORS_PLATEFORME", date: "2023-03-01", note: "GUcmha-0036/2023" },
    { phaseCode: "28_DOSSIER_LOTISSEMENT", statut: "SANS_OBJET" },
  ],
  missionsReglees: [{ code: "PERMIS_HABITER", libelle: "Permis d'habiter partiel (RDC)", montant: "3 000,00", date: "2025-11-20" }],
  inviter: true,
  test: true,
};

describe("validation de la création", () => {
  it("accepte le cas Mehdaoui et normalise", () => {
    const v = validerCreation(MEHDAOUI);
    if (!v.ok) throw new Error(v.erreurs.join());
    expect(v.d.client.nom).toBe("MEHDAOUI");
    expect(v.d.client.telephone).toBe("0612345678");
    expect(v.d.projet.gabarit).toBe("R+1");
    expect(v.d.projet.intitule).toBe("TEST — Construction d'un immeuble R+1");
    expect(v.d.missionsReglees[0].montant).toBe("3000.00");
    expect(v.d.etapes.map((e) => e.statut)).toEqual(["FAITE_HORS_PLATEFORME", "FAITE_HORS_PLATEFORME", "SANS_OBJET"]);
    expect(nomAffiche(v.d.client)).toBe("Monsieur Rida MEHDAOUI");
  });
  it("refuse une étape postérieure à la phase actuelle et une phase inconnue", () => {
    const v = validerCreation({ ...MEHDAOUI, phaseActuelle: "30_DOSSIER_AUTORISATION" });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erreurs.join()).toMatch(/postérieure.*34_PERMIS_CONSTRUIRE/);
    expect(validerCreation({ ...MEHDAOUI, phaseActuelle: "XX" }).ok).toBe(false);
  });
  it("société : raison sociale requise, ICE à 15 chiffres, avertit si ICE absent", () => {
    const base = { ...MEHDAOUI, client: { type: "SOCIETE", raisonSociale: "SARL TEST", telephone: "0612345678" } };
    const v = validerCreation(base);
    expect(v.ok && v.avertissements.join()).toMatch(/ICE/);
    expect(validerCreation({ ...base, client: { ...base.client, ice: "123" } }).ok).toBe(false);
    expect(validerCreation({ ...base, client: { type: "SOCIETE", telephone: "0612345678" } }).ok).toBe(false);
  });
  it("refuse téléphone, e-mail, dates invalides et expiration avant autorisation", () => {
    expect(validerCreation({ ...MEHDAOUI, client: { ...MEHDAOUI.client, telephone: "12" } }).ok).toBe(false);
    expect(validerCreation({ ...MEHDAOUI, client: { ...MEHDAOUI.client, email: "x@" } }).ok).toBe(false);
    expect(validerCreation({ ...MEHDAOUI, projet: { ...MEHDAOUI.projet, autorisationExpiration: "2022-01-01" } }).ok).toBe(false);
    expect(validerCreation({ ...MEHDAOUI, projet: { ...MEHDAOUI.projet, autorisationDate: "01/03/2023" } }).ok).toBe(false);
  });
  it("les phases viennent de packages/contracts, dans l'ordre", () => {
    expect(PHASES[0].code).toBe("00_BRIEF");
    expect(PHASES.some((p) => p.code === "96_PERMIS_HABITER")).toBe(true);
  });
});

describe("dédoublonnage et alertes", () => {
  it("rapproche les téléphones sur 9 chiffres", () => {
    expect(cleTelephone("0612345678")).toBe(cleTelephone("+212 6 12 34 56 78"));
  });
  it("alerte J−90 et expiration (spec §8.4)", () => {
    expect(niveauAlerte("2026-03-01", "2026-10-15")).toBe("EXPIREE");
    expect(niveauAlerte("2027-01-10", "2026-10-15")).toBe("J90");
    expect(niveauAlerte("2027-01-14", "2026-10-15")).toBeNull();
    expect(niveauAlerte(null, "2026-10-15")).toBeNull();
  });
});

describe("lien d'invitation signé", () => {
  const secret = "x".repeat(40);
  it("aller-retour, falsification et expiration", async () => {
    const j = await jetonDossier(secret, "dos_abc", 0);
    expect(await lireJetonDossier(secret, j, 1000)).toBe("dos_abc");
    expect(await lireJetonDossier("y".repeat(40), j, 1000)).toBeNull();
    expect(await lireJetonDossier(secret, j.replace("d1.", "d1.9"), 1000)).toBeNull();
    expect(await lireJetonDossier(secret, j, 91 * 24 * 3600 * 1000)).toBeNull();
  });
});

describe("création en base (base simulée)", () => {
  function fausseBase(existants: { cabinet?: boolean; email?: boolean } = {}) {
    const requetes: Array<{ texte: string; valeurs: unknown[] }> = [];
    const sql = (async (s: TemplateStringsArray, ...valeurs: unknown[]) => {
      const texte = s.join("?");
      requetes.push({ texte, valeurs });
      if (texte.includes('FROM "Cabinet"')) return existants.cabinet === false ? [] : [{ id: "cab_arc_bati" }];
      if (texte.includes('lower("email")')) return existants.email ? [{ id: "u1" }] : [];
      return [];
    }) as unknown as Sql;
    return { sql, requetes };
  }

  it("crée compte, dossier, étapes (antérieures + en cours) et journal sans coordonnée", async () => {
    const v = validerCreation(MEHDAOUI);
    if (!v.ok) throw new Error();
    const { sql, requetes } = fausseBase();
    const r = await creerDossierAdmin(sql, v.d, "admin@test", "2026-10-15T10:00:00.000Z");
    expect(r.compteCree).toBe(true);
    const insertDossier = requetes.find((q) => q.texte.includes('INSERT INTO "Dossier"'))!;
    expect(insertDossier.valeurs).toContain("96_PERMIS_HABITER");
    expect(insertDossier.valeurs).toContain("2026-03-01");
    const etapes = requetes.filter((q) => q.texte.includes('INSERT INTO "DossierEtape"'));
    expect(etapes.map((q) => q.valeurs[2])).toEqual(["FAITE_HORS_PLATEFORME", "FAITE_HORS_PLATEFORME", "SANS_OBJET", "EN_COURS"]);
    const journal = requetes.find((q) => q.texte.includes('INSERT INTO "DossierEvenement"'))!;
    const details = String(journal.valeurs[4]);
    expect(details).toContain("PERMIS_HABITER");
    expect(details).not.toMatch(/0612345678|Mehdaoui|MEHDAOUI/);
  });
  it("refuse un cabinet inconnu et un e-mail déjà pris (dédoublonnage)", async () => {
    const v = validerCreation({ ...MEHDAOUI, client: { ...MEHDAOUI.client, email: "rida@test.ma" } });
    if (!v.ok) throw new Error();
    await expect(creerDossierAdmin(fausseBase({ cabinet: false }).sql, v.d, "a")).rejects.toMatchObject({ code: "cabinet_inconnu" });
    await expect(creerDossierAdmin(fausseBase({ email: true }).sql, v.d, "a")).rejects.toMatchObject({ code: "email_existant" });
  });
});

describe("cabinets", () => {
  it("liste les mentions légales manquantes, sans rien inventer", () => {
    expect(mentionsManquantes({ ice: null, identifiantFiscal: "1", rc: null, patente: null })).toEqual(["ICE", "RC", "Patente"]);
    expect(validerCabinet({ nom: "" }).ok).toBe(false);
    expect(validerCabinet({ nom: "Cabinet X", logoUrl: "http://x" }).ok).toBe(false);
  });
});

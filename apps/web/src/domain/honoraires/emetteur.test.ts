import { describe, expect, it } from "vitest";
import { CONTACT } from "../../config/contact";
import { BANDEAU_SUIVI, EMETTEUR, mentionsEmetteurManquantes } from "./emetteur";
import { CABINET_ARC_BATI } from "../../../../../functions/_lib/cabinets";

describe("émetteur des devis et factures : CITURBAREA / HSE DECO (décision du 15/10/2026)", () => {
  it("aucun identifiant légal inventé : tout est « à compléter »", () => {
    expect(EMETTEUR.raisonSociale).toBe("HSE DECO");
    expect(mentionsEmetteurManquantes()).toEqual(["ICE", "IF", "RC", "Patente", "Siège social"]);
  });
  it("seules coordonnées : celles de CITURBAREA (config/contact.ts)", () => {
    expect(EMETTEUR.telephone).toBe(CONTACT.telAffiche);
    expect(EMETTEUR.whatsapp).toBe(CONTACT.whatsapp);
    expect(BANDEAU_SUIVI.join(" ")).not.toMatch(/ARC-BATI|@/);
  });
  it("le cabinet ARC-BATI ne porte aucune coordonnée", () => {
    expect([CABINET_ARC_BATI.telephone, CABINET_ARC_BATI.email, CABINET_ARC_BATI.adresse]).toEqual([null, null, null]);
  });
});

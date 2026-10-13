/** Textes des pages Cercles pros : arabe complet, anglais sans clé inconnue, variables identiques. */
import { describe, expect, it } from "vitest";
import { DICTIONNAIRES, texte } from "./textes";

const variables = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("textes Cercles pros", () => {
  it("chaque clé française existe en arabe, non vide, avec les mêmes variables", () => {
    for (const [cle, fr] of Object.entries(DICTIONNAIRES.fr)) {
      const ar = (DICTIONNAIRES.ar as Record<string, string>)[cle];
      expect(ar, cle).toBeTruthy();
      expect(variables(ar), cle).toEqual(variables(fr));
    }
  });
  it("l'anglais ne contient que des clés connues, avec les mêmes variables ; repli sur le français", () => {
    for (const [cle, en] of Object.entries(DICTIONNAIRES.en)) {
      const fr = (DICTIONNAIRES.fr as Record<string, string>)[cle];
      expect(fr, cle).toBeDefined();
      expect(variables(en as string), cle).toEqual(variables(fr));
    }
    expect(texte("en")("err_unite_invalide")).toBe(DICTIONNAIRES.fr.err_unite_invalide);
    expect(texte("ar")("anResultats", { n: 3 })).toBe("3 مهني");
  });
});

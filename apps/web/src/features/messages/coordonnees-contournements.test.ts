/**
 * Contournements du masquage des coordonnées (moteur commun functions/_lib/coordonnees.ts) :
 * chiffres en lettres (FR / EN / AR / darija), séparateurs multiples, « gmail » sans @, pseudos @….
 */
import { describe, expect, it } from "vitest";
import { detecterCoordonnees, masquerCoordonnees, MASQUE } from "../../../../../functions/_lib/coordonnees";

describe("coordonnées : contournements détectés et masqués", () => {
  it.each([
    ["zéro six soixante et un vingt-deux trente-trois quarante-quatre", "telephone"],
    ["zero six six un deux deux trois trois quatre quatre", "telephone"],
    ["appelle : zero six 61 22 33 44", "telephone"],
    ["zero six one two three four five six seven", "telephone"],
    ["سفر ستة ستة واحد اثنين اثنين ثلاثة ثلاثة أربعة أربعة", "telephone"],
    ["صفر ستة ستة واحد وزوج زوج تلاتة تلاتة ربعة ربعة", "telephone"],
    ["sifr stta stta wa7ed jouj jouj tlata tlata rb3a rb3a", "telephone"],
    ["0 6 . 6 1 - 2 2 / 3 3 4 4", "telephone"],
    ["06..61..22..33..44", "telephone"],
    ["écris-moi sur mon gmail", "email"],
    ["amina point deco arobase gmail point com", "email"],
    ["suivez @atlas.deco", "messagerie"],
    ["mon snap : atlasdeco", "messagerie"],
  ])("« %s » → %s", (texte, type) => {
    expect(detecterCoordonnees(texte)).toContain(type);
    expect(masquerCoordonnees(texte)).toContain(MASQUE);
  });

  it("le numéro en lettres disparaît du texte masqué, le reste est gardé", () => {
    const m = masquerCoordonnees("Bonjour, mon numéro : zéro six soixante et un vingt-deux trente-trois quarante-quatre. Merci");
    expect(m).toMatch(/^Bonjour, mon numéro : \[coordonnées masquées/);
    expect(m).toMatch(/Merci$/);
    expect(m).not.toMatch(/soixante|quarante/);
  });

  it.each([
    "Il me faut deux portes et trois fenêtres",
    "Budget 15 000 000 DH, livraison le 2026-10-13",
    "Prix 1 250 DH le m², 6 sacs de 50 kg",
    "Norme NM 10.1.004, classe CPJ 45",
    "Une villa R+1 de 250 m² sur un terrain de 300 m²",
    "خمسة أبواب وثلاث نوافذ",
    "Rendez-vous lundi à dix heures, deux personnes",
    "Contact via la plateforme uniquement",
  ])("ne touche pas : %s", (t) => {
    expect(detecterCoordonnees(t)).toEqual([]);
    expect(masquerCoordonnees(t)).toBe(t);
  });
});

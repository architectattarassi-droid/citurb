import { describe, expect, it } from "vitest";
import { CATALOGUE } from "./catalogue";
import { BOM, lignesImport, lireTableau, modeleCsv } from "./csv";

describe("import / export tableur des fiches de prix", () => {
  it("le modèle se relit : en-tête, une ligne par matériau, lignes sans prix ignorées", () => {
    const refs = CATALOGUE.filter((r) => r.categorie === "GROS_OEUVRE");
    const csv = modeleCsv(refs);
    expect(csv.startsWith(`${BOM}code;designation;unite_vente;prix_ht`)).toBe(true);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const t = lireTableau(csv);
    expect(t.length).toBe(refs.length + 1);
    const r = lignesImport(t, "rabat-sale-kenitra");
    expect(r.lignes.length).toBe(0);
    expect(r.ignorees).toBe(refs.length);
  });

  it("CSV « ; » avec guillemets, virgule décimale, date française, livraison", () => {
    const t = lireTableau('code;unite_vente;prix_ht;tva;validite;marque;frais_livraison;delai_jours\ncit-go-008;sac50;"78,50";20;31/12/2026;"Holcim; CPJ45";300;2\n');
    const { lignes } = lignesImport(t, "casablanca-settat");
    expect(lignes).toEqual([{
      materiauCode: "CIT-GO-008", uniteVente: "sac50", prixHT: "78,50", tvaPct: 20, validiteJusquau: "2026-12-31", marque: "Holcim; CPJ45",
      livraison: [{ zone: "casablanca-settat", frais: 300, delaiJours: 2 }],
    }]);
  });

  it("copier-coller depuis Excel (tabulations) et CSV à virgules", () => {
    expect(lignesImport(lireTableau("code\tunite_vente\tprix_ht\nCIT-GO-011\tm3\t190\n"), "x").lignes[0].prixHT).toBe("190");
    expect(lignesImport(lireTableau("code,unite_vente,prix_ht\r\nCIT-GO-011,m3,190\r\n"), "x").lignes[0].materiauCode).toBe("CIT-GO-011");
  });

  it("en-tête absente → signalée", () => {
    expect(lignesImport(lireTableau("a;b\n1;2"), "x").enteteManquante).toBe(true);
  });
});

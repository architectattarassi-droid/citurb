/**
 * Document d'une facture ou d'un avoir (spec §5.2), émis par CITURBAREA / HSE DECO.
 * Même modèle et mêmes rendus PDF / DOCX que le devis (documentDevis.ts, rendu/).
 * Différences avec le devis : mentions légales de l'émetteur (et ICE du client
 * société), HT / TVA / TTC explicites, référence au devis accepté et à sa date
 * d'acceptation, échéance et mode de règlement, montant en lettres ; pas de
 * base de calcul. Une mention légale manquante s'affiche « à compléter », en rouge.
 */
import { formatDH } from "./decimal";
import type { Bloc, Cellule, DocumentDevis } from "./documentDevis";
import { EMETTEUR, mentionsEmetteurManquantes, type Emetteur } from "./emetteur";
import { totauxFacture } from "./facturation";
import { montantEnLettres } from "./lettres";

export interface LigneFactureDoc { libelle: string; detail?: string; montantHT: string }

export interface ContexteFacture {
  numero: string;
  type: "ACOMPTE" | "SITUATION" | "SOLDE" | "FORFAIT_UNIQUE" | "AVOIR";
  dateEmission: string;
  dateEcheance: string;
  emetteur?: Emetteur;
  client: { nomAffiche: string; type: "PERSONNE" | "SOCIETE"; ice?: string | null; adresse?: string | null; ville?: string | null };
  projet: { intitule: string; commune: string; prefecture?: string | null; lot?: string | null; lotissement?: string | null; titreFoncier?: string | null };
  architecte: { nom: string; architecte?: string | null } | null;
  devis: { numero: string; dateAcceptation: string | null } | null;
  echeance: { libelle: string; phase: string } | null;
  factureOrigine?: { numero: string; dateEmission: string } | null;
  motif?: string | null;
  lignes: LigneFactureDoc[];
  tauxTVA: string;
  retenueSource?: string | null;
}

const dateFr = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return `${j} ${["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][m - 1]} ${a}`;
};
const TYPES: Record<ContexteFacture["type"], string> = {
  ACOMPTE: "Facture d'acompte", SITUATION: "Facture de situation", SOLDE: "Facture de solde", FORFAIT_UNIQUE: "Facture", AVOIR: "Avoir",
};

export function construireDocumentFacture(c: ContexteFacture): DocumentDevis {
  const em = c.emetteur ?? EMETTEUR;
  const avoir = c.type === "AVOIR";
  const titre = avoir ? `AVOIR N° ${c.numero}` : `FACTURE N° ${c.numero}`;
  const blocs: Bloc[] = [];

  const ids = [em.ice && `ICE ${em.ice}`, em.identifiantFiscal && `IF ${em.identifiantFiscal}`, em.rc && `RC ${em.rc}`, em.patente && `Patente ${em.patente}`].filter(Boolean).join(" · ");
  blocs.push({
    t: "entete", marque: em.marque,
    lignes: [`${em.raisonSociale}${em.formeJuridique ? `, ${em.formeJuridique}` : ""} — plateforme de mise en relation et de gestion de projets`, [em.siege, `Tél. ${em.telephone}`, em.site].filter(Boolean).join(" | "), ids].filter(Boolean),
  });

  // Mentions obligatoires manquantes : jamais inventées, signalées en rouge.
  const manquantes = mentionsEmetteurManquantes(em).map((m) => `${m} de ${em.raisonSociale}`);
  if (c.client.type === "SOCIETE" && !c.client.ice) manquantes.push("ICE du client (société)");
  if (manquantes.length) blocs.push({ t: "hypotheses", titre: "Mentions légales à compléter avant envoi", lignes: manquantes });

  blocs.push({ t: "titre", texte: titre, reference: `${TYPES[c.type]} — émise le ${dateFr(c.dateEmission)}`, sousTitre: c.projet.intitule });

  const situation = [c.projet.lot, c.projet.lotissement, [c.projet.commune, c.projet.prefecture].filter(Boolean).join(" — ")].filter(Boolean).join(", ");
  const ident: Array<[string, string]> = [
    ["Client", [c.client.nomAffiche, c.client.type === "SOCIETE" && c.client.ice ? `ICE ${c.client.ice}` : ""].filter(Boolean).join(" — ")],
    ["Adresse du client", [c.client.adresse, c.client.ville].filter(Boolean).join(", ")],
    ["Projet", c.projet.intitule],
    ["Situation", situation],
    ["Titre foncier", c.projet.titreFoncier ?? ""],
    ["Architecte du projet", c.architecte ? [c.architecte.nom, c.architecte.architecte].filter(Boolean).join(" — ") : ""],
    ["Devis accepté", c.devis ? `${c.devis.numero}${c.devis.dateAcceptation ? `, accepté le ${dateFr(c.devis.dateAcceptation)}` : ""}` : ""],
    ["Échéance du contrat", c.echeance ? `${c.echeance.libelle} — ${c.echeance.phase}` : ""],
    ["Facture d'origine", c.factureOrigine ? `${c.factureOrigine.numero} du ${dateFr(c.factureOrigine.dateEmission)}` : ""],
    ["Motif", c.motif ?? ""],
    [avoir ? "Date" : "Date d'échéance", dateFr(avoir ? c.dateEmission : c.dateEcheance)],
  ];
  blocs.push({ t: "identification", lignes: ident.filter(([, v]) => v) });

  blocs.push({ t: "section", titre: "DÉTAIL" });
  blocs.push({
    t: "tableau",
    colonnes: [{ titre: "Désignation", largeur: 0.74 }, { titre: "Montant HT", largeur: 0.26, align: "droite" }],
    lignes: c.lignes.map((l): Cellule[] => [{ texte: l.libelle, sous: l.detail }, { texte: formatDH(l.montantHT) }]),
  });

  const ht = c.lignes.reduce((s, l) => s.plus(l.montantHT), totauxFacture(0).ht);
  const t = totauxFacture(ht, c.tauxTVA, c.retenueSource ?? 0);
  const totaux: Cellule[][] = [
    [{ texte: "Total HT" }, { texte: formatDH(t.ht) }],
    [{ texte: `TVA ${t.tauxTVA.toString().replace(".", ",")} %` }, { texte: formatDH(t.tva) }],
    [{ texte: "Total TTC", gras: true }, { texte: formatDH(t.ttc), gras: true }],
  ];
  if (!t.retenue.estNul()) totaux.push([{ texte: "Retenue à la source" }, { texte: formatDH(t.retenue.fois(-1)) }], [{ texte: "Net à payer", gras: true }, { texte: formatDH(t.netAPayer), gras: true }]);
  blocs.push({ t: "tableau", colonnes: [{ titre: "", largeur: 0.74 }, { titre: "", largeur: 0.26, align: "droite" }], lignes: totaux, styles: totaux.map((l) => (l[0].gras ? "total" : "normal")) });

  blocs.push({ t: "paragraphe", style: "gras", texte: `${avoir ? "Arrêté le présent avoir" : "Arrêtée la présente facture"} à la somme de : ${montantEnLettres(t.netAPayer)}${avoir ? "" : " toutes taxes comprises"}.` });
  if (t.tauxTVA.estNul()) blocs.push({ t: "paragraphe", style: "note", texte: "TVA applicable selon la réglementation en vigueur." });

  blocs.push({ t: "section", titre: avoir ? "IMPUTATION" : "RÈGLEMENT" });
  if (avoir) {
    blocs.push({ t: "paragraphe", texte: "Le présent avoir s'impute sur la facture d'origine ; tout trop-perçu est remboursé ou imputé sur la prochaine échéance, au choix du client." });
  } else {
    blocs.push({ t: "paragraphe", texte: `Payable au plus tard le ${dateFr(c.dateEcheance)}, à l'ordre de ${em.raisonSociale} (${em.marque}), par virement, chèque ou espèces, en rappelant le numéro de facture.` });
    blocs.push({ t: "paragraphe", style: em.rib ? "normal" : "alerte", texte: em.rib ? `Coordonnées bancaires : ${em.rib}` : "Coordonnées bancaires de HSE DECO : à compléter." });
    blocs.push({ t: "paragraphe", style: "note", texte: "Conformément au contrat, le démarrage de la phase concernée intervient après encaissement de la présente échéance." });
  }
  blocs.push({ t: "bandeau", lignes: ["SUIVEZ VOTRE PROJET EN LIGNE", "Vos devis, factures et leur état de règlement sont consultables à tout moment dans votre espace client sur www.citurbarea.com."] });

  return { version: 1, numero: c.numero, brouillon: false, titre, blocs, piedDePage: `${em.marque} — ${em.raisonSociale} — ${avoir ? "Avoir" : "Facture"} N° ${c.numero}` };
}

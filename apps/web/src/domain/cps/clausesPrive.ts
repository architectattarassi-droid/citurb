/**
 * Clauses administratives propres au MARCHÉ PRIVÉ de construction d'une villa,
 * qui remplacent dans le CPS généré les clauses types (apps/api/data/cps-templates/
 * clauses) contestées par le contre-audit du 2026-10-10 :
 *   - DOC art. 769/770 : ne plus attribuer à l'art. 770 un délai de forclusion,
 *     ne créer aucun délai nouveau, renvoyer aux dispositions impératives ;
 *   - TRC / RCD : obligation légale limitée (ACAPS, arrêtés du 30/12/2024) aux
 *     bâtiments résidentiels de plus de 3 étages ou de plus de 800 m² → ici
 *     exigence CONTRACTUELLE ;
 *   - garantie biennale : contractuelle (la loi 44-00 vise la VEFA) ;
 *   - sous-traitance : clause de droit privé (pas le décret 2-22-431) ;
 *   - options tranchées (prix fermes OU révisables, tribunaux OU arbitrage),
 *     pénalités plafonnées à 8 %, installation de chantier hors PU.
 * Rédactions à faire valider par le conseil juridique avant signature.
 */
export type ArbitragesCps = {
  /** Prix fermes et non révisables (défaut) ou révisables (formule à annexer). */
  prix: "FERMES" | "REVISABLES";
  /** Juridictions compétentes (défaut) ou arbitrage (loi 95-17). */
  litiges: "TRIBUNAUX" | "ARBITRAGE";
  /** Assurances TRC (maître d'ouvrage) et RCD (constructeurs) exigées contractuellement (défaut : oui). */
  assurancesContractuelles: boolean;
  /** Délai de paiement des situations (jours). */
  delaiPaiementJours: number;
};

export const ARBITRAGES_DEFAUT: ArbitragesCps = { prix: "FERMES", litiges: "TRIBUNAUX", assurancesContractuelles: true, delaiPaiementJours: 30 };

type Clause = { titre: string; corps: string; fondement: string };

export function clausesPrive(a: ArbitragesCps, delaiAmiable = 30): Record<string, Clause | null> {
  return {
    DECENNALE_DOC_769: {
      titre: "Responsabilité décennale des constructeurs",
      corps: [
        "La responsabilité décennale des constructeurs (architecte, ingénieurs, entrepreneur) est régie par les dispositions impératives de l'article 769 du Dahir formant Code des obligations et des contrats (DOC), dans sa version applicable.",
        "",
        "Elle demeure distincte des garanties contractuelles de parfait achèvement et de bon fonctionnement instituées par le présent marché. Aucune stipulation du marché ne peut avoir pour objet ou pour effet de réduire les droits que le maître d'ouvrage tient de ces dispositions.",
        "",
        "Son point de départ et ses conditions de mise en œuvre sont ceux prévus par la loi, sans préjudice des stipulations relatives aux opérations de réception et à leur constatation contradictoire.",
      ].join("\n"),
      fondement: "DOC, art. 769",
    },
    DECENNALE_FORCLUSION_DOC_770: {
      titre: "Signalement des désordres et exercice des recours",
      corps: [
        "Tout désordre constaté par le maître d'ouvrage est signalé par écrit à l'entrepreneur et aux intervenants concernés, avec la description de sa nature et, si possible, un constat photographique ou technique.",
        "",
        "Les délais d'action relatifs à la responsabilité décennale sont ceux prévus par l'article 769 du DOC. Le présent article ne crée aucun délai de forclusion et ne modifie pas les délais légaux impératifs.",
        "",
        "En cas de désordre grave ou présentant un danger, le maître d'ouvrage peut prendre immédiatement les mesures conservatoires nécessaires, en informant les intervenants concernés.",
      ].join("\n"),
      fondement: "DOC, art. 769 ; stipulation contractuelle",
    },
    BIENNALE_2_ANS_VEFA_44_00: {
      titre: "Garantie contractuelle de bon fonctionnement (2 ans)",
      corps: "Les éléments d'équipement dissociables du gros œuvre (appareils sanitaires, robinetterie, appareillage électrique, équipements de climatisation, menuiseries et quincaillerie, volets) bénéficient d'une garantie contractuelle de bon fonctionnement de deux (2) ans à compter de la réception provisoire. L'entrepreneur répare ou remplace à ses frais tout élément qui cesse de fonctionner normalement pendant ce délai, hors usure normale et défaut d'entretien.",
      fondement: "Stipulation contractuelle (la garantie biennale de la loi 44-00 vise la vente en l'état futur d'achèvement)",
    },
    ASSURANCE_TRC_59_13: {
      titre: "Assurance Tous Risques Chantier",
      corps: a.assurancesContractuelles
        ? [
          "L'obligation légale d'assurance Tous Risques Chantier (loi 59-13 et arrêtés d'application en vigueur depuis le 30 décembre 2024) vise, pour l'habitat, les bâtiments de plus de trois étages ou de plus de 800 m². Le présent ouvrage n'y étant pas assujetti au vu de ses caractéristiques, les parties conviennent expressément de la souscrire à titre contractuel, en raison notamment du sous-sol, des soutènements et de la mitoyenneté.",
          "",
          "Le maître d'ouvrage souscrit une police TRC couvrant l'ouvrage pour le montant des travaux, la responsabilité civile envers les tiers et les avoisinants, pour toute la durée du chantier. Franchises, plafonds et exclusions sont précisés aux conditions particulières ; l'attestation est remise avant l'ordre de service de commencer.",
        ].join("\n")
        : "L'ouvrage, compte tenu de ses caractéristiques, n'est pas assujetti à l'assurance obligatoire Tous Risques Chantier. Les parties n'en prévoient pas la souscription ; l'entrepreneur reste responsable des dommages causés aux ouvrages et aux tiers jusqu'à la réception.",
      fondement: "Loi 59-13 (Code des assurances) et arrêtés du 30/12/2024 ; stipulation contractuelle",
    },
    ASSURANCE_RC_DECENNALE_59_13: {
      titre: "Assurance de responsabilité civile décennale",
      corps: a.assurancesContractuelles
        ? "L'entrepreneur, ainsi que l'architecte et les bureaux d'études intervenants, justifient avant l'ordre de service de commencer d'une assurance de responsabilité civile décennale couvrant les ouvrages du présent marché, exigée à titre contractuel (l'obligation légale ne visant que les bâtiments résidentiels de plus de trois étages ou de plus de 800 m²). L'absence d'assujettissement légal ne supprime pas la responsabilité décennale prévue par le DOC."
        : "L'ouvrage n'est pas assujetti à l'assurance obligatoire de responsabilité civile décennale. Cette absence d'assujettissement ne supprime pas la responsabilité décennale des constructeurs prévue par l'article 769 du DOC.",
      fondement: "Loi 59-13 et arrêtés du 30/12/2024 ; DOC, art. 769 ; stipulation contractuelle",
    },
    PENALITES_RETARD_CCAG: {
      titre: "Pénalités de retard",
      corps: [
        "Sauf prolongation de délai régulièrement accordée, tout retard imputable à l'entrepreneur dans l'achèvement des travaux donne lieu à une pénalité égale à un pour mille (1 ‰) du montant initial HT du marché par jour calendaire de retard.",
        "",
        "Le montant cumulé des pénalités de retard est plafonné à huit pour cent (8 %) du montant initial HT du marché. Les retards résultant d'une décision du maître d'ouvrage, d'une suspension ordonnée ou d'un événement ouvrant droit à prolongation sont examinés contradictoirement avant toute application de pénalité.",
      ].join("\n"),
      fondement: "Stipulation contractuelle (valeurs reprises du CCAG-Travaux, art. 65, à titre de référence)",
    },
    REVISION_PRIX_INDEX_TP: {
      titre: "Caractère des prix",
      corps: a.prix === "FERMES"
        ? "Les prix du marché sont fermes et non révisables pendant toute la durée contractuelle d'exécution. Seules les modifications de prestations acceptées par écrit (article « Nature et règlement des prix ») peuvent faire varier le montant du marché."
        : "Les prix sont révisables par application de la formule paramétrique, des index officiels du bâtiment et des coefficients annexés au marché, avec pour date de référence le mois de remise de l'offre. Une formule non renseignée ne produit aucun effet contractuel.",
      fondement: "Stipulation contractuelle",
    },
    SOUS_TRAITANCE_DOC_2_22_431: {
      titre: "Sous-traitance",
      corps: "Toute sous-traitance est subordonnée à l'information préalable et à l'acceptation écrite du maître d'ouvrage, sur proposition indiquant l'identité, les qualifications et les assurances du sous-traitant ainsi que les ouvrages concernés. L'entrepreneur principal demeure seul responsable envers le maître d'ouvrage de l'exécution de l'ensemble des travaux ; les sous-traitants sont payés par lui, sauf stipulation contraire écrite.",
      fondement: "DOC ; stipulation contractuelle",
    },
    PRIX_FORME_MARCHE: {
      titre: "Nature et règlement des prix",
      corps: [
        "Le marché est conclu à prix unitaires, à l'exception des postes expressément désignés comme forfaitaires (unité « ff ») au bordereau. Les prix unitaires s'appliquent aux quantités réellement exécutées, mesurées et constatées contradictoirement selon les modes de métré annexés.",
        "",
        "Chaque prix comprend la fourniture, la main-d'œuvre, le matériel, les transports, les pertes, les frais généraux et la marge de l'entrepreneur, à l'exclusion de l'installation, du repli et du nettoyage de chantier, rémunérés uniquement par le poste forfaitaire 00.01. Aucune prestation ne peut être rémunérée deux fois.",
        "",
        "Tout ouvrage supplémentaire ou toute modification susceptible de faire varier le montant du marché fait l'objet, avant exécution, d'un accord écrit sur son prix et, le cas échéant, sur son incidence sur le délai, sauf mesure conservatoire urgente justifiée. La TVA est appliquée au taux légal en vigueur.",
      ].join("\n"),
      fondement: "Stipulation contractuelle",
    },
    LITIGES_COMPETENCE_DROIT: {
      titre: "Règlement des différends et droit applicable",
      corps: [
        `Tout différend relatif à l'interprétation ou à l'exécution du marché fait l'objet d'une notification écrite précisant les faits, les demandes et les pièces justificatives. Les parties recherchent une solution amiable dans un délai de ${delaiAmiable} jours calendaires à compter de cette notification.`,
        "",
        a.litiges === "TRIBUNAUX"
          ? "À défaut d'accord amiable, le différend relève des juridictions marocaines compétentes du lieu d'exécution des travaux."
          : "À défaut d'accord amiable, le différend est tranché par voie d'arbitrage conformément à la loi 95-17 relative à l'arbitrage et à la médiation conventionnelle, selon la convention d'arbitrage annexée au marché.",
        "",
        "Le marché est régi par le droit marocain.",
      ].join("\n"),
      fondement: a.litiges === "TRIBUNAUX" ? "DOC ; Code de procédure civile" : "Loi 95-17",
    },
    DELAIS_PAIEMENT_32_10: {
      titre: "Situations, délais de paiement et intérêts de retard",
      corps: [
        `Les situations de travaux sont établies mensuellement par l'entrepreneur, vérifiées par le maître d'œuvre et réglées par le maître d'ouvrage dans un délai de ${a.delaiPaiementJours} jours à compter de leur réception vérifiée.`,
        "",
        "Tout retard de paiement imputable au maître d'ouvrage ouvre droit, après mise en demeure, à des intérêts de retard au taux convenu aux conditions particulières. Lorsque le maître d'ouvrage agit en qualité de professionnel, les dispositions légales impératives relatives aux délais de paiement entre commerçants (loi 69-21) s'appliquent ; leur applicabilité est vérifiée lors de la mise au point du marché.",
      ].join("\n"),
      fondement: "Stipulation contractuelle ; loi 69-21 sous réserve de son champ d'application",
    },
    RESILIATION_MARCHE: {
      titre: "Résiliation du marché",
      corps: "Le marché peut être résilié par le maître d'ouvrage, après mise en demeure restée sans effet dans le délai qu'elle fixe, en cas de manquement grave de l'entrepreneur à ses obligations, d'abandon de chantier, de défaut de production des attestations d'assurance exigées par le marché, de retard atteignant le plafond des pénalités ou d'ouverture d'une procédure collective dans les conditions légales. La résiliation donne lieu à un constat contradictoire des travaux exécutés et à un décompte ; les travaux restants peuvent être confiés à un tiers aux frais et risques de l'entrepreneur défaillant.",
      fondement: "DOC (résolution pour inexécution) ; stipulation contractuelle",
    },
    RECEPTION_PROVISOIRE_DEFINITIVE: {
      titre: "Réceptions",
      corps: [
        "La réception provisoire est prononcée par procès-verbal contradictoire après achèvement des travaux, essais et vérifications ; les réserves y sont consignées avec leur délai de levée. Elle fait courir la garantie de parfait achèvement (1 an) et la garantie contractuelle de bon fonctionnement (2 ans), et transfère la garde de l'ouvrage.",
        "",
        "La réception définitive est prononcée par procès-verbal contradictoire à l'expiration du délai de parfait achèvement et après levée de toutes les réserves ; elle conditionne la libération de la retenue de garantie et du cautionnement. Aucune réception ne vaut renonciation aux droits que le maître d'ouvrage tient de l'article 769 du DOC.",
      ].join("\n"),
      fondement: "Stipulation contractuelle ; DOC, art. 769",
    },
  };
}

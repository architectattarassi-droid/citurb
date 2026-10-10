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
  /** Avance de démarrage en % du montant initial HT (0 = pas d'avance). */
  avancePct: number;
  /** Taux et modalités des intérêts de retard de paiement ; null = à renseigner avant signature. */
  tauxInteretsRetard: string | null;
  /** Délai de remise du cautionnement définitif après signature (jours) — proposition contractuelle, non légale. */
  delaiCautionJours: number;
  /** Délai des mises en demeure (reprises, résiliation), en jours calendaires. */
  delaiMiseEnDemeureJours: number;
  /** Force majeure : réexamen contradictoire après N jours d'empêchement continu. */
  forceMajeureReexamenJours: number;
  /** Force majeure : durée continue ouvrant droit à résiliation ; null = à négocier avant signature. */
  forceMajeureResiliationJours: number | null;
};

/**
 * Valeurs par défaut : propositions contractuelles (contre-examen GPT du 10/10/2026),
 * aucune n'est une prescription légale. Les variables `null` bloquent la signature.
 */
export const ARBITRAGES_DEFAUT: ArbitragesCps = {
  prix: "FERMES", litiges: "TRIBUNAUX", assurancesContractuelles: true, delaiPaiementJours: 30,
  avancePct: 0, tauxInteretsRetard: null, delaiCautionJours: 15, delaiMiseEnDemeureJours: 15,
  forceMajeureReexamenJours: 30, forceMajeureResiliationJours: null,
};

/** Variables contractuelles encore ouvertes (à renseigner avant signature). */
export function variablesNonArretees(a: ArbitragesCps): string[] {
  const v: string[] = [];
  if (!a.tauxInteretsRetard) v.push("taux et modalités de calcul des intérêts de retard de paiement");
  if (!a.forceMajeureResiliationJours) v.push("durée d'empêchement continu ouvrant droit à résiliation pour force majeure");
  return v;
}

/** `corps` absent : on garde le texte du gabarit (seuls titre et fondement sont corrigés). */
type Clause = { titre: string; corps?: string; fondement: string };

export function clausesPrive(a: ArbitragesCps, delaiAmiable = 30, delaiExecution = 365): Record<string, Clause | null> {
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
          "L'obligation légale d'assurance Tous Risques Chantier (Code des assurances modifié par la loi 59-13, textes d'application en vigueur depuis le 30 décembre 2024) vise, pour l'habitat, les bâtiments de plus de trois étages ou de plus de 800 m². Le présent ouvrage n'y étant pas assujetti au vu de ses caractéristiques, les parties conviennent expressément de la souscrire à titre contractuel, en raison notamment du sous-sol, des soutènements et de la mitoyenneté.",
          "",
          "Le maître d'ouvrage souscrit une police TRC couvrant l'ouvrage pour le montant des travaux, la responsabilité civile envers les tiers et les avoisinants, pour toute la durée du chantier. L'attestation, remise avant l'ordre de service de commencer, identifie l'assureur, le numéro de police, le montant assuré, les plafonds, franchises et exclusions ; la garantie des avoisinants (sous-sol et mitoyenneté) doit y être expressément acceptée par l'assureur. L'étendue des garanties est confirmée par l'assureur avant la signature du marché.",
        ].join("\n")
        : "L'ouvrage, compte tenu de ses caractéristiques, n'est pas assujetti à l'assurance obligatoire Tous Risques Chantier. Les parties n'en prévoient pas la souscription ; l'entrepreneur reste responsable des dommages causés aux ouvrages et aux tiers jusqu'à la réception.",
      fondement: "Loi 17-99 portant Code des assurances, modifiée par la loi 59-13, et textes d'application en vigueur depuis le 30/12/2024 ; stipulation contractuelle",
    },
    ASSURANCE_RC_DECENNALE_59_13: {
      titre: "Assurance de responsabilité civile décennale",
      corps: a.assurancesContractuelles
        ? [
          "L'entrepreneur justifie, avant l'ordre de service de commencer, d'une assurance de responsabilité civile décennale couvrant les ouvrages du présent marché, exigée à titre contractuel (l'obligation légale ne visant que les bâtiments résidentiels de plus de trois étages ou de plus de 800 m²). L'attestation identifie l'assureur, le numéro de police, les ouvrages couverts, les plafonds et franchises ; l'assurabilité de l'ouvrage et l'étendue des garanties sont confirmées par l'assureur avant la signature du marché.",
          "",
          "Les obligations d'assurance de l'architecte et des bureaux d'études relèvent de leurs contrats respectifs avec le maître d'ouvrage. L'absence d'assujettissement légal ne supprime pas la responsabilité décennale prévue par l'article 769 du DOC.",
        ].join("\n")
        : "L'ouvrage n'est pas assujetti à l'assurance obligatoire de responsabilité civile décennale. Cette absence d'assujettissement ne supprime pas la responsabilité décennale des constructeurs prévue par l'article 769 du DOC.",
      fondement: "Loi 17-99 portant Code des assurances, modifiée par la loi 59-13, et textes d'application en vigueur depuis le 30/12/2024 ; DOC, art. 769 ; stipulation contractuelle",
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
        "Chaque prix comprend la fourniture, la main-d'œuvre, le matériel, les transports, les pertes, les frais généraux et la marge de l'entrepreneur, à l'exclusion de l'installation, du repli et du nettoyage de chantier, rémunérés uniquement par le poste forfaitaire 00.01 (base-vie, clôture et signalisation, branchements provisoires, repli et nettoyage final). Les frais de chantier compris dans les prix unitaires couvrent la conduite et l'encadrement des travaux, les consommables et le nettoyage courant des postes de travail. Aucune prestation ne peut être rémunérée deux fois.",
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
        a.tauxInteretsRetard
          ? `Tout retard de paiement imputable au maître d'ouvrage ouvre droit, après mise en demeure, à des intérêts de retard calculés comme suit : ${a.tauxInteretsRetard}. Lorsque`
          : "Tout retard de paiement imputable au maître d'ouvrage ouvre droit, après mise en demeure, à des intérêts de retard dont le taux et les modalités de calcul sont arrêtés au tableau des arbitrages (**variable à renseigner avant signature** ; à défaut, régime légal applicable selon la qualité du maître d'ouvrage). Lorsque le maître d'ouvrage agit en qualité de professionnel, les dispositions légales impératives relatives aux délais de paiement entre commerçants (loi 69-21) s'appliquent ; leur applicabilité est vérifiée lors de la mise au point du marché.",
      ].join("\n"),
      fondement: "Stipulation contractuelle ; loi 69-21 sous réserve de son champ d'application",
    },
    RESILIATION_MARCHE: {
      titre: "Résiliation du marché",
      corps: [
        `Le marché peut être résilié par le maître d'ouvrage, après mise en demeure écrite restée sans effet ${a.delaiMiseEnDemeureJours} jours calendaires après sa réception, en cas de manquement grave de l'entrepreneur à ses obligations, d'abandon de chantier, de défaut de production des attestations d'assurance exigées par le marché, de retard atteignant le plafond des pénalités ou d'ouverture d'une procédure collective dans les conditions légales.`,
        "",
        "La décision de résiliation est notifiée par écrit. Dans les quinze jours qui suivent, un constat contradictoire est dressé en présence des deux parties et du maître d'œuvre (ou, en cas de carence de l'entrepreneur dûment convoqué, par huissier de justice) : travaux exécutés, ouvrages en cours, approvisionnements et matériel présents, état de sécurité du chantier. Le décompte de résiliation reprend les travaux exécutés aux prix du marché, les approvisionnements acceptés, les pénalités encourues et, le cas échéant, le surcoût d'achèvement par un tiers aux frais et risques de l'entrepreneur défaillant ; il est notifié à l'entrepreneur, qui dispose de trente jours pour présenter ses observations.",
      ].join("\n"),
      fondement: "DOC (résolution pour inexécution) ; stipulation contractuelle (délais proposés, non légaux)",
    },
    PARFAIT_ACHEVEMENT_1_AN: {
      titre: "Garantie de parfait achèvement (1 an)",
      corps: [
        "L'entrepreneur est tenu, pendant un (1) an à compter de la réception provisoire, d'une garantie de parfait achèvement : il reprend à ses frais les désordres, défauts et malfaçons consignés en réserves au procès-verbal de réception ou notifiés par écrit par le maître d'ouvrage pendant ce délai.",
        "",
        `Le maître d'œuvre fixe pour chaque reprise un délai d'exécution raisonnable, adapté à sa nature. À défaut d'exécution dans ce délai, le maître d'ouvrage met l'entrepreneur en demeure par écrit ; si la mise en demeure reste sans effet ${a.delaiMiseEnDemeureJours} jours calendaires après sa réception (délai réduit en cas d'urgence ou de risque pour la sécurité ou la conservation de l'ouvrage), les reprises peuvent être exécutées par un tiers aux frais et risques de l'entrepreneur, après constat contradictoire ou, à défaut, constat d'huissier. La réception définitive n'est prononcée qu'après levée de l'intégralité des réserves.`,
      ].join("\n"),
      fondement: "Stipulation contractuelle (durée usuelle, CCAG-Travaux cité à titre de référence) ; sans préjudice de l'article 769 du DOC",
    },
    AVANCE_ACOMPTES_SITUATIONS: {
      titre: "Avance, acomptes et situations de travaux",
      corps: [
        a.avancePct > 0
          ? `Une avance de démarrage de ${a.avancePct} % du montant initial HT du marché est versée après notification de l'ordre de service de commencer, contre remise d'une caution bancaire de restitution d'avance du même montant. Elle est remboursée par retenue sur chaque acompte, proportionnellement au montant des travaux exécutés, de sorte qu'elle soit intégralement remboursée au dernier acompte précédant la réception provisoire ; la caution est libérée à due concurrence.`
          : "Aucune avance de démarrage n'est prévue au présent marché.",
        "",
        "Les paiements s'effectuent par acomptes mensuels sur la base des situations de travaux établies par l'entrepreneur, contradictoirement vérifiées et arrêtées par le maître d'œuvre. Le décompte général et définitif est établi après réception et levée des réserves. Les délais et intérêts de retard de l'article « Situations, délais de paiement et intérêts de retard » s'appliquent à chaque acompte.",
      ].join("\n"),
      fondement: "Stipulation contractuelle",
    },
    // Obligations de l'architecte et du BET : dans leurs propres contrats (contre-examen B5).
    RC_PRO_ARCHITECTE_016_89: null,
    DELAI_EXECUTION_OS: {
      titre: "Délai d'exécution et ordres de service",
      corps: [
        `Le délai global d'exécution des travaux est fixé à ${delaiExecution} jours calendaires à compter de la notification de l'ordre de service (OS) de commencer les travaux. Le planning détaillé (chemin critique, jalons, plannings par lot) est soumis au maître d'œuvre dans les quinze jours suivant cet OS.`,
        "",
        "Le délai n'est prolongé que par : un OS écrit ; un cas de force majeure notifié et constaté dans les conditions de l'article « Force majeure » ; des journées d'intempéries ayant rendu impossible ou dangereuse l'exécution des ouvrages en cours, constatées contradictoirement au journal de chantier le jour même, avec relevé météorologique à l'appui ; des sujétions imprévues approuvées par écrit par le maître d'ouvrage. Chaque journée ainsi constatée prolonge le délai d'autant ; la demande de prolongation est présentée au plus tard avec la situation mensuelle suivante. Toute suspension de chantier fait l'objet d'un OS et d'un constat contradictoire.",
      ].join("\n"),
      fondement: "Stipulation contractuelle",
    },
    CAUTIONNEMENT_DEFINITIF: {
      titre: "Cautionnement définitif",
      corps: [
        `L'entrepreneur remet, dans les ${a.delaiCautionJours} jours calendaires suivant la notification de la signature du marché, un cautionnement définitif de trois pour cent (3 %) du montant initial HT du marché, sous forme de caution bancaire émise par un établissement agréé par Bank Al-Maghrib. Sa remise est une condition préalable à la notification de l'ordre de service de commencer.`,
        "",
        "Le cautionnement garantit la bonne exécution du marché. Il est restitué après la réception définitive, déduction faite des sommes éventuellement dues. Les autres garanties bancaires (restitution d'avance, retenue de garantie) sont régies par leurs articles propres.",
      ].join("\n"),
      fondement: "Stipulation contractuelle (délai proposé, non légal ; taux inspiré du CCAG-Travaux à titre de référence)",
    },
    FORCE_MAJEURE_DOC_268_269: {
      titre: "Force majeure",
      corps: [
        "Aucune partie n'est responsable de l'inexécution de ses obligations lorsqu'elle provient d'un cas de force majeure ou d'un cas fortuit au sens des articles 268 et 269 du DOC.",
        "",
        `La partie affectée notifie l'événement par écrit dans les meilleurs délais, avec ses justificatifs et ses conséquences prévisibles. L'empêchement est constaté contradictoirement ; les délais d'exécution sont suspendus pour sa durée et les mesures conservatoires nécessaires sont prises. Après ${a.forceMajeureReexamenJours} jours d'empêchement continu, les parties réexaminent contradictoirement la situation (mesures conservatoires, planning, coûts de maintien du chantier).`,
        "",
        a.forceMajeureResiliationJours
          ? `Si l'empêchement dure plus de ${a.forceMajeureResiliationJours} jours continus, chaque partie peut résilier le marché sans indemnité ni pénalité, après décompte contradictoire des travaux exécutés.`
          : "La durée d'empêchement continu ouvrant droit à résiliation sans indemnité ni pénalité est arrêtée au tableau des arbitrages (**variable à renseigner avant signature**) ; la résiliation donne lieu à un décompte contradictoire des travaux exécutés.",
      ].join("\n"),
      fondement: "DOC, art. 268 et 269 ; stipulation contractuelle",
    },
    DONNEES_PERSONNELLES_09_08: {
      titre: "Protection des données personnelles (CNDP)",
      corps: "Chaque partie respecte la loi 09-08 pour les traitements de données personnelles dont elle a la responsabilité dans le cadre du marché (coordonnées des intervenants, contrôle d'accès, vidéosurveillance de chantier le cas échéant). Selon la nature de chaque traitement, elle procède à la déclaration préalable ou à la demande d'autorisation auprès de la CNDP, informe les personnes concernées et ne recueille leur consentement que lorsque la loi l'exige ; elle limite la collecte à la finalité poursuivie, assure la sécurité des données et respecte les droits d'accès, de rectification et d'opposition.",
      fondement: "Loi 09-08, sous le contrôle de la CNDP",
    },
    RECEPTION_PROVISOIRE_DEFINITIVE: {
      titre: "Réceptions",
      corps: [
        "La réception provisoire est prononcée par procès-verbal contradictoire après achèvement des travaux, essais et vérifications ; les réserves y sont consignées avec leur délai de levée. Elle fait courir la garantie de parfait achèvement (1 an) et la garantie contractuelle de bon fonctionnement (2 ans), et transfère la garde de l'ouvrage.",
        "",
        "La demande de réception est accompagnée du dossier des ouvrages exécutés (DOE : plans conformes à l'exécution, notices et garanties des équipements, procès-verbaux d'essais). Un DOE incomplet est consigné en réserve ; la retenue de garantie n'est libérée qu'après sa remise complète.",
        "",
        "La réception définitive est prononcée par procès-verbal contradictoire à l'expiration du délai de parfait achèvement et après levée de toutes les réserves ; elle conditionne la libération de la retenue de garantie et du cautionnement. Aucune réception ne vaut renonciation aux droits que le maître d'ouvrage tient de l'article 769 du DOC.",
      ].join("\n"),
      fondement: "Stipulation contractuelle ; DOC, art. 769",
    },
  };
}

/**
 * Références légales des gabarits de lots (Titre II) ramenées à ce qui est vérifié :
 * l'article 769 du DOC fonde la décennale ; « 770 » et « 769 bis » ne sont pas
 * retenus (contre-audit du 10/10/2026), la garantie de 2 ans est contractuelle.
 */
export function assainirReferences(md: string): string {
  return md
    .replace(/\*\*Garantie biennale\*\* \(art\. 769 bis DOC\)/g, "**Garantie contractuelle de bon fonctionnement**")
    .replace(/\(réf\. art\. 769\/770 du DOC\)/g, "(stipulation contractuelle)")
    .replace(/aux \*\*articles 769 et 770 (du [^*]*)\*\*/g, "à l'**article 769 $1**")
    .replace(/aux articles \*\*769 et 770\*\*/g, "à l'article **769**")
    .replace(/769 ?(\/|-|et) ?770/g, "769")
    .replace(/769 bis/g, "769")
    .replace(/Garantie biennale — 2 ans/g, "Garantie contractuelle de bon fonctionnement — 2 ans")
    .replace(/\*\*biennale\*\*/g, "**de bon fonctionnement** (2 ans, contractuelle)")
    .replace(/Garantie \*\*biennale\*\*/g, "Garantie **de bon fonctionnement** (2 ans, contractuelle)");
}

/** Fondement d'une clause type : le CCAG-Travaux n'est cité qu'à titre de référence (marché privé). */
export function fondementPrive(f: string): string {
  const g = assainirReferences(f);
  return /CCAG/.test(g) && !/référence/.test(g) ? `${g} — CCAG-Travaux cité à titre de référence, non applicable de plein droit` : g;
}

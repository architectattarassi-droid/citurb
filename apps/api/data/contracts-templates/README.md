# Bibliothèque contrats CITURBAREA — Templates pré-codés

30 contrats type marocains pré-rédigés, prêts à instancier en 1 clic depuis
les portails P1-P6 et Cercles. Chaque template injecte automatiquement les
clauses légales actualisées (DOC, loi 32-10 délais paiement, loi 09-08 RGPD,
RPS 2011, etc.).

## Structure

```
contracts-templates/
  ├── by-project/
  │   ├── promesse-vente-immobilier.json
  │   ├── vefa-loi-44-00.json
  │   ├── reservation-lot-25-90.json
  │   ├── bail-commercial-loi-49-16.json
  │   ├── bail-habitation-loi-67-12.json
  │   ├── emphytéotique.json
  │   └── pacte-associes-sarl-immo.json
  ├── by-prestation/
  │   ├── architecte-mission-complete.json
  │   ├── architecte-mission-partielle.json
  │   ├── mod-maitrise-ouvrage-deleguee.json
  │   ├── bet-structure.json
  │   ├── bet-fluides.json
  │   ├── bet-hqe-rt2024.json
  │   ├── bureau-controle-technique.json
  │   ├── geometre-topographe.json
  │   ├── geotechnique-g1-g5.json
  │   ├── marche-travaux-entreprise-generale.json
  │   ├── marche-travaux-entreprise-specialisee.json
  │   ├── sous-traitance-btp-loi-32-99.json
  │   └── amo-assistance-maitrise-ouvrage.json
  ├── specifique-maroc/
  │   ├── apport-societe-acte-adoulaire.json
  │   ├── procuration-ancfcc.json
  │   ├── copropriete-acte-loi-18-00.json
  │   ├── reglement-copropriete.json
  │   ├── convention-syndic.json
  │   ├── gardiennage-chantier-loi-27-06.json
  │   ├── police-trc-souscription.json
  │   └── police-decennale-doc-769.json
  └── cercles/
      ├── partenariat-architectes.json
      └── nda-projet.json
```

## Format d'un contrat

```json
{
  "code": "ARCHITECTE_MISSION_COMPLETE",
  "label": "Contrat d'architecte — Mission complète",
  "labelAr": "عقد المعمار — مهمة كاملة",
  "fondementJuridique": [
    { "code": "LOI_016_89", "label": "Loi 016-89 relative à l'exercice de la profession d'architecte" },
    { "code": "BAREME_CNOA_2018", "label": "Barème CNOA 2018" },
    { "code": "DOC_769", "label": "DOC art. 769 — garantie décennale" }
  ],
  "parties": [
    { "role": "MAITRE_OUVRAGE", "label": "Maître d'Ouvrage", "labelAr": "صاحب المشروع" },
    { "role": "ARCHITECTE", "label": "Architecte", "labelAr": "المعمار" }
  ],
  "clauses": [
    {
      "numero": "1",
      "titre": "Objet du contrat",
      "corpsMD": "Le présent contrat a pour objet la mission complète d'architecte conformément au barème CNOA 2018, pour le projet {{PROJECT_NAME}} situé {{PROJECT_ADDRESS}}.",
      "obligatoire": true
    },
    ...
  ],
  "risquesAdresses": [
    { "risque": "Honoraires forfaitaires sans clause révision variantes", "mitigation": "Clause art. 6 + grille variantes par phase" }
  ],
  "annexesRequises": ["CIN_MAITRE_OUVRAGE", "TITRE_FONCIER", "PROGRAMME_TECHNIQUE", "ASSURANCE_RC_PRO_ARCHITECTE"],
  "signatureRequise": [
    { "ordre": 1, "partie": "ARCHITECTE", "lieu": "Page 1 + Page finale + paraphes" },
    { "ordre": 2, "partie": "MAITRE_OUVRAGE", "lieu": "Page 1 + Page finale + paraphes" }
  ]
}
```

## Innovations CITURBAREA (vs avocat traditionnel)

1. **Clauses adaptatives RPS 2011** — injection automatique selon zone sismique commune
2. **Auto-injection loi 32-10** — délais paiement + intérêts moratoires BAM+7 actualisés quotidiennement
3. **Signature multi-parties séquentielle hash-chainée** — ordre logique imposé (MO → architecte → BET → entreprise), SHA-256 chaîné + horodatage qualifié eIDAS-MA Barid eSign
4. **Bilinguisme FR↔AR juridique** — équivalents légaux (ex: "force majeure" → القوة القاهرة avec ref DOC art. 268), validé sur corpus Cour Cassation
5. **Veille jurisprudentielle active** — moteur scanne Cour Cassation / Cours d'Appel mensuelles, alerte *"Article 7.2 invalidé par Cass. Com. 1456/2024 — proposez avenant"*

## Tableau récapitulatif des 30 contrats

| # | Contrat | Cible | Loi/Fondement | Risque #1 |
|---|---------|-------|---------------|-----------|
| 1 | Promesse vente immobilier | P4 | DOC 478 | Arrhes/acompte confusion |
| 2 | VEFA | P2 | Loi 44-00 | Absence garantie achèvement = nullité |
| 3 | Réservation lot | P4 | Loi 25-90 | Équipements promis flous |
| 4 | Bail commercial | P4 | Loi 49-16 | Absence état des lieux |
| 5 | Bail habitation | P1/P4 | Loi 67-12 | Bail verbal |
| 6 | Emphytéotique | P2 | DOC 626 | Accession différée mal stipulée |
| 7 | Pacte associés SARL immo | P2 | Loi 5-96 | Deadlock non résolu |
| 8 | Architecte mission complète | P1/P2 | CNOA + DOC 769 | Honoraires variantes |
| 9 | Architecte mission partielle | P1 | CNOA | Non-substitution |
| 10 | MOD | P3 | DOC 879 | Requalification constructeur |
| 11 | BET structure | P3 | DOC 723 | Non-conformité RPS 2011 |
| 12 | BET fluides | P3 | DOC 723 | — |
| 13 | BET HQE/RT 2024 | P3 | RT 2024 AMEE | — |
| 14 | Bureau contrôle technique | P2/P3 | Pratique + NM ISO | Co-décennale |
| 15 | Géomètre topographe | tous | Loi 30-93 ONIGT | Bornage non contradictoire |
| 16 | Géotechnique G1-G5 | P2/P3 | NF P94-500 NM | Décennale sol |
| 17 | Marché travaux EG | P2/P3 | Loi 89-15 + 32-10 | Délais paiement non conformes |
| 18 | Marché travaux ES | P3 | DOC 723 | Coordination OPC |
| 19 | Sous-traitance BTP | P3 | Loi 32-99 | Sous-traitance occulte = nullité |
| 20 | AMO | P3 | DOC 879 | Obligation conseil |
| 21 | Apport société + adoul | P2 | Loi 19-94 | Double formalisme |
| 22 | Procuration ANCFCC | tous | Adoulaire | Étendue mal délimitée |
| 23 | Copropriété acte | P2 | Loi 18-00 | Tantièmes erronés |
| 24 | Règlement copropriété | P2 | Loi 18-00 | — |
| 25 | Convention syndic | P2 | Loi 18-00 | — |
| 26 | Gardiennage chantier | P2/P3 | Loi 27-06 | Agrément DGSN |
| 27 | TRC Tous Risques Chantier | P2 | Police d'assurance | Souscripteur ambigu |
| 28 | Décennale (DOC 769) | P2/P3 | DOC 769 | Couverture insuffisante |
| 29 | Partenariat architectes | Cercles | DOC | Co-traitance solidaire/conjointe |
| 30 | NDA projet | Cercles | DOC | Pénalité forfaitaire absente |

**Valeur globale CITURBAREA** : (a) standardisation prouvée + traçabilité probatoire chainée vs Word ; (b) coût marginal nul après amortissement = 10× moins cher ; (c) mise à jour systémique vs contrat figé à la date de signature chez avocat.

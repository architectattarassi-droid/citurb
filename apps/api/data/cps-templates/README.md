# Bibliothèque CPS pré-codée CITURBAREA

Cahier des Prescriptions Spéciales (CPS) modèles, lot par lot, prêts à
instancier depuis le wizard P2/P3. Chaque template injecte automatiquement
les normes marocaines applicables selon zone sismique + zone climatique RT 2024.

## Structure

```
cps-templates/
  ├── project-types/        # 15 types de projets supportés
  │   ├── villa-r1-haut-standing.json
  │   ├── immeuble-r4-logement-social.json
  │   ├── lotissement-viabilise.json
  │   ├── hangar-industriel-charpente-metallique.json
  │   ├── ecole-primaire-publique.json
  │   ├── hopital-regional.json
  │   ├── hotel-4-etoiles.json
  │   ├── station-service.json
  │   ├── mosquee-minaret.json
  │   ├── centre-commercial.json
  │   ├── riad-renovation-medina.json
  │   ├── logement-militaire.json
  │   ├── parking-silo-r3.json
  │   ├── centre-culturel.json
  │   └── marche-couvert.json
  ├── lots/                 # 26 lots TPHI (Lot 0 → Lot 25)
  │   ├── lot-00-generalites.json
  │   ├── lot-01-terrassement.json
  │   ├── lot-02-gros-oeuvre-beton.json
  │   └── ...
  ├── normes/               # Normes marocaines (NM, NM EN, RPS, RT)
  │   ├── nm-en-206-1-2014.json
  │   ├── rps-2011.json
  │   ├── rt-2024.json
  │   └── ...
  └── clauses-legales/      # Clauses transverses (DOC 769, loi 32-10, etc.)
      ├── decennale-doc-769.json
      ├── delais-paiement-loi-32-10.json
      ├── force-majeure-doc-268.json
      └── ...
```

## Pipeline génération

```
Input wizard P2/P3
  → CpsGeneratorService.generate({ projectTypeCode, zoneSismique, zoneRT, ... })
  → loadProjectType()       # charge le type + mapping lots applicables
  → resolveNormes()          # filtre selon zone sismique + RT
  → detectConflicts()        # ex: RPS 2011 vs RT 2024 isolation extérieure
  → renderArticles()         # Handlebars sur corpsMD avec variables
  → injectClausesLegales()   # CCAG-T (public) ou CCAP (privé)
  → composeMarkdown()        # assemblage 0..25 + sommaire auto
  → hashChain()              # SHA-256 → ProbativeLog Tome @
  → output: { md, pdf, docx, xml }
```

## Format des fichiers

### project-type.json
```json
{
  "code": "VILLA_R1_HS",
  "label": "Villa R+1 résidentiel haut standing",
  "labelAr": "فيلا طابق أرضي + علوي راقي",
  "porteScope": ["P1", "P2"],
  "defaultClasseSismique": "II",
  "defaultZoneRT": "Z2",
  "lots": [
    { "code": "LOT_00_GENERALITES", "obligatoire": true, "ordre": 0 },
    { "code": "LOT_01_TERRASSEMENT", "obligatoire": true, "ordre": 1 },
    ...
  ]
}
```

### lot.json
```json
{
  "code": "LOT_02_GO_BETON",
  "numero": 2,
  "intitule": "Gros œuvre — Béton armé",
  "intituleAr": "البناء الخرساني المسلح",
  "normesRefs": ["NM_EN_206_1_2014", "RPS_2011", "NM_EN_1992_EC2"],
  "articles": [
    { "numero": "2.1", "titre": "Objet", "corpsMD": "..." },
    { "numero": "2.5", "titre": "Composition et résistance des bétons", "corpsMD": "..." },
    ...
  ]
}
```

### norme.json
```json
{
  "reference": "NM EN 206-1:2014",
  "intitule": "Béton — Spécification, performances, production et conformité",
  "organisme": "IMANOR",
  "dateBO": "2014-09-15",
  "versionEnVigueur": "2014",
  "domaines": ["beton", "structure"],
  "obligatoireZoneSismique": ["I", "II", "III"],
  "applicableLots": [2, 3, 18]
}
```

## Roadmap implementation

| Module | Effort | Dépend | Blocker |
|--------|--------|--------|---------|
| Seed 26 lots × 8 articles base | 12 j | — | — |
| Seed 80 normes NM/NM EN | 12 j | M1 | Licence IMANOR catalogue |
| Seed 15 project types + mappings | 6 j | M1+M2 | Validation CNOA |
| CpsGeneratorService Handlebars | 8 j | M1-M3 | — |
| Rendu PDF/DOCX/XML | 6 j | M4 | Polices arabe naskh |
| Wizard front édition TipTap | 10 j | M4 | — |
| Visa eSign Barid (qualifié eIDAS-MA) | 7 j | M5 | Convention Barid |
| Veille IMANOR auto + diff | 4 j | M2 | bulletin.imanor accès |
| Bilingue FR/AR + RTL | 6 j | M6 | Cabinet juridique |

**Total : ~71 jours-homme** (1 lead full-stack + 1 ingé BTP rédacteur normes mi-temps).

## Partenariats stratégiques requis

- **IMANOR** — licence catalogue normes (~50k MAD/an)
- **CNOA** — convention visa architecte modèle
- **Ministère Habitat** — CPC référence + CCAG-Travaux 2016
- **Barid Al-Maghrib** — API eSign qualifiée
- **AMEE** — RT 2024 conformité
- **FNBTP** — validation modèles entreprise

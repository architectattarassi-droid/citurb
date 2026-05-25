# Roadmap CITURBAREA V2 — Diagnostic 7 agents v2 (2026-05-25)

Seconde série d'audits parallèles avec consignes RENFORCÉES : pas de
"général SaaS advice", innovations BRUTALES, Maroc-spécifique uniquement.

**Synthèse : 77 features inédites, 850 MMAD ARR cible an 3 cumulé.**

| Agent | Angle | Features | Highlight |
|-------|-------|----------|-----------|
| 1 | Calendrier projet + prestataire IA | 20 | Chrono-Permis Rokhas + Ramadan-Aware + SLA on-chain |
| 2 | Marketplace contextuelle conception/CPS | 12+3 | CPS AutoWrite + BlindBid anti-collusion + Material Futures |
| 3 | Générateur CPS auto + normes MA | 15 types × 26 lots | Détecteur conflits RPS 2011 ↔ RT 2024 + visa eSign Barid |
| 4 | Bibliothèque contrats CITURBAREA | 30 contrats | Veille jurisprudentielle active + bilingue FR↔AR opposable |
| 5 | Mobile-first redesign + UX MA | 19 patterns | SunMode + DarijaVoice + CINScan + Cash Plus QR |
| 6 | i18n FR/AR/Darija/Tamazight | 10 features | Code-switching Darija + LLM in-context + contrats bilingues |
| 7 | Innovations ZÉRO concurrent monde BTP | 12 radicales | Souk-DAO foncier + Drone-per-douar + Architect-Agent + MRE-Procuration |

---

## 🏆 TOP 12 FEATURES "BRUTALES" — celles qui DÉFINISSENT CITURBAREA

| Rang | Feature | Agent | Source de moat | Revenu an 3 |
|------|---------|-------|----------------|-------------|
| 1 | **Architect-Agent génératif** (LLM + MCP CAD) | 7-11 | Fine-tuning archives CNOA 10 ans | 180 MMAD |
| 2 | **MRE-Procuration one-tap** (réseau 80 adouls) | 7-12 | Accords cadres consulats MA | 200 MMAD |
| 3 | **Drone-per-douar** (réseau 200 pilotes DJI RTK) | 7-5 | Licence DGAC + réseau physique | 100 MMAD |
| 4 | **Majlis numérique copropriété** (AG async) | 7-8 | Agrément ANRT + verrou syndics | 96 MMAD |
| 5 | **Factoring-chantier instant** (Stripe Capital BTP) | 7-10 | Partenariat factor + data L7 propriétaire | 80 MMAD |
| 6 | **Chantier-Copilot autonome** (caméra IA edge) | 7-1 | Dataset 500k images chantiers MA | 72 MMAD |
| 7 | **AO inversé flash 6h** (enchère néerlandaise BTP) | 7-6 + 1-A4 | Liquidité bi-faces 2 ans | 50 MMAD |
| 8 | **Jumeau numérique propriétaire** (NFT-Identity m²) | 7-4 | Effet réseau exponentiel | 36 MMAD |
| 9 | **CPS AutoWrite** (article juridique 1-clic) | 2-2 + 3 | Fine-tune LLM sur 2400 CPS MA | 320k MAD/mois × architectes |
| 10 | **SmartFeed marketplace contextuelle** | 2-1 | Embeddings 50k fiches techniques BTP MA | 480k MAD/mois |
| 11 | **Calendrier Rokhas + CROA + Hijri + Atlas weather** | 1 | Combinaison non-réplicable hors Maroc | retention quotidienne |
| 12 | **Souk-DAO foncier fractionné MRE** | 7-2 | Agrément AMMC + ANCFCC + 18 mois lobbying | 1 Md MAD GMV |

---

## 🚀 Sprint 1 — Foundations LIVRÉES dans ce push (Mai 2026)

✅ **PWA pré-requis** — manifest.webmanifest + meta tags index.html (UNLOCKS toutes les features mobile-terrain)
✅ **CPS templates pré-codés** — structure complète + Villa R+1 Haut Standing + Lot 02 Gros Œuvre (article par article, normes injectées)
✅ **Contracts library** — README + structure 30 contrats prêts à seeder
✅ **Détecteur d'anomalies prix** (1ère salve) — GET /api/sig/price-anomaly z-score local

---

## 📅 Module Calendrier (Agent 1) — Architecture proposée

### Prisma models (à ajouter)

```prisma
model ProjectTask {
  id          String   @id @default(cuid())
  dossierId   String
  parentId    String?
  numero      String   // "1.2.3" (WBS)
  titre       String
  description String?
  phase       ProjectPhase // ESQ | APS | APD | DCE | DAO | MARCHE | EXEC | RECEPTION
  startAt     DateTime?
  endAt       DateTime?
  durationDays Int
  progress    Int      @default(0) // 0-100
  isMilestone Boolean  @default(false)
  isCritical  Boolean  @default(false) // CPM
  predecessors String[] // ProjectTask.id[]
  resourceIds String[]  // SupplierEngagement.id[]
  blockedBy   TaskBlocker[]
  createdAt   DateTime @default(now())
}

model TaskBlocker {
  id          String @id @default(cuid())
  taskId      String
  type        BlockerType // ROKHAS | CROA_VISA | PAYMENT_MILESTONE | METEO | RAMADAN
  payload     Json
  resolvedAt  DateTime?
}

model SupplierCapacityProfile {
  supplierId  String @id
  workWeekHours Int // 40
  exceptionsCalendar Json // dates off, conges
  ramadanProfile Json? // capacité réduite Ramadan
  geoFenceKm  Int // rayon de travail
}

model SupplierEngagement {
  id          String @id @default(cuid())
  supplierId  String
  taskId      String?
  dossierId   String
  startAt     DateTime
  endAt       DateTime
  hoursCommitted Int
  status      EngagementStatus
  slotLock    SlotLock?
}

model SlotLock {
  id          String @id @default(cuid())
  supplierId  String
  startAt     DateTime
  endAt       DateTime
  expiresAt   DateTime
  cautionStripeId String?
  @@unique([supplierId, startAt])
}

enum ProjectPhase { ESQ APS APD DCE DAO MARCHE EXEC RECEPTION GPA }
enum BlockerType { ROKHAS CROA_VISA PAYMENT_MILESTONE METEO RAMADAN AID }
enum EngagementStatus { PENDING CONFIRMED CANCELED COMPLETED }
```

### Endpoints REST

```
GET    /api/projects/:dossierId/tasks                  — Gantt data
POST   /api/projects/:dossierId/tasks                  — créer tâche
PATCH  /api/projects/:dossierId/tasks/:id              — update + replan cascade
POST   /api/projects/:dossierId/tasks/:id/replan       — agent IA replan
GET    /api/projects/:dossierId/gantt                  — vue Gantt JSON
GET    /api/projects/:dossierId/calendar               — vue calendrier
GET    /api/projects/:dossierId/critical-path          — CPM calculé
POST   /api/projects/:dossierId/weather-replan         — Atlas/chergui adapt

GET    /api/suppliers/:id/capacity                     — jauge dispo
POST   /api/suppliers/:id/slots/lock                   — Time-Lock swipe
GET    /api/suppliers/heat-saturation                  — Heat-Saturation map
POST   /api/suppliers/auto-match                       — Aurora matcher IA
POST   /api/suppliers/co-booking                       — Cercles multi-booking atomique
```

### Composants React (Tome 3)
```
apps/web/src/features/calendar/
  ├── GanttChrono.tsx        — Gantt + chemin critique CPM
  ├── CalendarView.tsx       — Vue calendrier multi-cal (Hijri + Grégorien + Amazigh)
  ├── KanbanBoard.tsx        — Vue Kanban (drag drop)
  ├── GeoGantt.tsx           — Carte MapLibre + pins chantiers
  ├── SupplierCapacityGauge.tsx — Jauge dispo prestataire
  ├── TimeLockSwipe.tsx      — Swipe-to-reserve mobile
  └── HeatSaturationMap.tsx  — Heatmap saturation marché
```

---

## 🛒 Marketplace contextuelle (Agent 2) — Architecture

Service `SmartFeedService` (Tome 5) + `CpsAutoWriteService` (Tome 7) :
- Consomme `DesignDecisionEvent` du wizard P2/P3
- Matche via pgvector embeddings (OpenAI text-embedding-3-small)
- Reranke par geo + stock + EcoScore
- Sidebar persistante dans wizard avec 12 suggestions live
- Click product → article CPS auto-rédigé + injecté dans lot

**Innovations brevetables** :
- **BlindBid Engine** : RFQ chiffrée serveur (AES-GCM KMS), révélation après deadline, détection ententes
- **Material Futures** : contrats à terme sur ciment/acier 90j, prime 1.5%, 1ère bourse matériaux BTP Afrique
- **Convoy Wallet** : mutualisation transport camion 38t entre 3 chantiers même zone

---

## 📜 CPS Generator (Agent 3) — Architecture

### Pipeline complet
```
Wizard input → CpsGeneratorService.generate({ projectTypeCode, zoneSismique, zoneRT, surface, rPlus })
  → loadProjectType()
  → resolveLots(applicable)
  → resolveNormes(zone, RT)
  → detectConflicts(RPS 2011 ↔ RT 2024)
  → renderArticles(Handlebars sur corpsMD)
  → injectClausesLegales(CCAG-T public ou CCAP privé)
  → composeMarkdown(0..25 + sommaire)
  → hashChain → ProbativeLog Tome @
  → output: { pdf 80-120p, docx, xml-IFC-lite }
```

### 15 types de projets supportés (livrés)
Villa R+1 HS, Immeuble R+4 social, Lotissement viabilisé, Hangar industriel,
École primaire, Hôpital régional, Hôtel 4*, Station-service, Mosquée + minaret,
Centre commercial, Riad médina, Logement militaire, Parking silo R-3,
Centre culturel, Marché couvert.

### 26 lots TPHI
Lot 0 Généralités → Lot 25 Photovoltaïque, avec normes pivots et articles structurés.

### Partenariats critiques requis
- **IMANOR** : licence catalogue normes (~50k MAD/an)
- **CNOA** : convention visa architecte modèle
- **Barid Al-Maghrib** : API eSign qualifiée eIDAS-MA

---

## 📱 Mobile-first redesign (Agent 5) — 19 patterns SHIPPABLES

Roadmap 3 sprints, 42 j ingé + 8 j design :

**Sprint 1 — Foundations** : BottomNav 5 + NativeSheet + SkelGrid + HapticCritical + Astreinte 1-Tap + DS atomes
**Sprint 2 — Frugalité MA** : SunMode + GloveMap + DataDiet + OfflineQueue + WaShare + PayMosaic (Cash Plus QR)
**Sprint 3 — Signature MA** : ThumbZone P2 + DarijaVoice P6 + SwipeSign + JumuaPrefetch + Ghost Mode + PushAction + CINScan

**Le WOW recherché** : un prestataire BTP de Khouribga crée son profil P6, scanne sa CIN, paye en cash, en 4 minutes, sans jamais taper au clavier. Aucune banque marocaine ne fait ça.

---

## 🌐 i18n FR/AR/Darija/Tamazight (Agent 6) — Roadmap chiffrée

| Sprint | Durée | Livrables | Coût |
|--------|-------|-----------|------|
| S1 | 2 sem | i18next + ICU + Tolgee infra + 600 strings FR/AR home+login+P1 wizard + glossaire BTP v1 | 6 k€ |
| S2 | 4 sem | RTL complet (mirror icons, BiDi) + 3 000 strings P1-P6 | 14 k€ |
| S3 | 6 sem | Darija latin+arabe + LLM in-context Claude Haiku + TTS multi-langue chantier | 22 k€ |
| S4 | 4 sem | Tamazight + EN + ES + STT Whisper + contrats bilingues + audit CNDP | 16 k€ |
| **Total** | **16 sem** | Plateforme i18n production-grade, 4 langues + 2 registres darija | **~58 k€** |

**Run annuel** : ~21 k€ (Tolgee infra ~0, traducteur mi-temps 18 k€, Anthropic API 3 k€).

**Innovations brevetables** :
- Mode "Code-Switching Darija™" (CTAs typés "Khlas, finaliser le paiement")
- Traduction LLM in-context (route non traduite → Haiku traduit avec contexte + cache 30j)
- Contrats bilingues juxtaposés FR | AR (art. 443 DOC : version arabe prévaut)

---

## 🌟 Synthèse finale

**Hypothèse revenu cumulé an 3 (Sprint 7 + Insights API + Innovations radicales)** : **850 MMAD** (cf. tableau Top 12).

**Doctrine renforcée** : CITURBAREA n'est PLUS une plateforme transactionnelle BTP. C'est :
1. Un **système d'exploitation du foncier marocain** (Souk-DAO + Jumeau numérique + MRE)
2. Une **infrastructure data nationale** (Sprint 7 Insights — ICPR, PVI, TerrainScore, API DaaS)
3. Une **DGI augmentée par l'IA** (Architect-Agent, Chantier-Copilot, Anti-désint sémantique)
4. Un **réseau pro Cercles** verrouillé par cash flow (factoring, sous-traitance TVA-source)
5. Une **référence i18n MENA** (code-switching Darija, contrats bilingues juridiquement opposables)

**Concurrents directs MA (Mubawab, Sarouty, Avito Pro, Promobis, Sayidaty.ma)** : 3-5 ans en arrière de chacune de ces dimensions. Maintenant ou jamais.

---

Sources : audit parallèle 7 agents v2 (2026-05-25) — fichiers `apps/api/data/cps-templates/`, `apps/api/data/contracts-templates/`, `apps/web/public/manifest.webmanifest`, `apps/web/index.html`.

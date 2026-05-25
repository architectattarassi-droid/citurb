# Roadmap CITURBAREA — Diagnostic 7 agents experts (2026-05-25)

Synthèse de l'audit parallèle de 7 agents experts indépendants, chacun
spécialisé sur un angle distinct de la plateforme. **53 features inattendues
proposées au total**, classées ci-dessous par impact stratégique.

| Agent | Angle | Features livrées |
|-------|-------|------------------|
| 1 | SIG / Cartographie avancée | 8 |
| 2 | UX / Growth / Conversion P1-P6 | 7 |
| 3 | IA / Automation | 7 |
| 4 | Compliance / Legal Maroc | 7 |
| 5 | Réseau Pro / Cercles B2B | 10 |
| 6 | Mobile / PWA / Terrain | 8 |
| 7 | Data / Analytics / Insights | 8 |

---

## 🎯 TOP 10 par impact stratégique (toutes catégories confondues)

| # | Feature | Agent | Effort | ROI |
|---|---------|-------|--------|-----|
| 1 | **Coffre probant horodaté qualifié (TSA Barid eSign)** | 4 | M | 2,7 M MAD/an + moat juridique |
| 2 | **TRC + RC décennale embarquée** (commission courtage 10%) | 4 | S | 9 M MAD/an |
| 3 | **Registre + DPIA CNDP self-service** (loi 09-08) | 4 | M | 3,6 M MAD/an + évite 300 k MAD amende |
| 4 | **Sous-traitance TVA-source auto** (Cercles, sort le secteur du gris) | 5 | L | Pull effect 10-40 tâcherons/général |
| 5 | **Avance-Décompte TGR** (factoring marchés publics) | 5 | L | Rétention quotidienne |
| 6 | **Skyline réglementaire 2.5D** (extrusion CES/COS PA AURS) | 1 | L | Effet "wow" démo client |
| 7 | **Conseil de Famille Mode** (WhatsApp share devis darija) | 2 | S | +30% conv D+2 |
| 8 | **Mode Chantier Offline (PCO)** PWA precache | 6 | L | Annule rupture terrain |
| 9 | **Détecteur d'anomalies prix** (z-score local) | 1 | S | Shield anti-arnaque viral |
| 10 | **QR-Print carte chantier** (signé, vérifiable mobile) | 1 + 6 | S | Pub physique virale |

---

## 🚀 Sprint 1 — Quick Wins (effort S, 2 semaines)

À shipper en priorité : ROI immédiat, dépendances minimales.

### 1.1 Détecteur d'anomalies prix ✅ IMPLÉMENTÉ DANS CE PUSH
- Endpoint `GET /api/sig/price-anomaly?lat=&lng=&priceMad=&surfaceM2=&bienFamily=`
- Calcul z-score local sur DGI 2017 × IPAI BAM 2026
- 5 verdicts : SUSPICIOUS_LOW, UNDERPRICED, NORMAL, OVERPRICED, SUSPICIOUS_HIGH
- À brancher : badge UI dans wizards P1/P2/P4 + page publique de vérification

### 1.2 PWA pré-requis bloquants (½ journée — Agent 6)
- `manifest.webmanifest` + meta tags PWA dans `apps/web/index.html`
- `vite-plugin-pwa` + service worker Workbox
- Sans ça, AUCUNE feature mobile-terrain (Agents 6 #1-8) n'est shippable

### 1.3 Score-Qual Cercles Soulbound (Agent 5 #6)
- Badge non-transférable agrégeant : dossiers livrés, paiements à temps, notes peer
- Réutilise infra Score L7 P6 existante
- Gamification quotidienne → rétention

### 1.4 Conseil de Famille Mode (Agent 2 #2)
- Bouton "Partager au conseil" → WhatsApp deep-link darija + PDF 1 page
- Page publique read-only avec 3 réactions emoji 👍 🤔 ❌
- Cron 24h : si 2/3 positives → SMS auto avec remise -5%

### 1.5 Séquestre Délai (Agent 2 #7)
- 500 DH sur le total = "séquestre délai" affiché dans dashboard
- Refund auto si SLA dépassé
- Lift estimé +15% CR landing→paiement

### 1.6 Clinique notariale on-demand (Agent 5 #9)
- Pool notaires/avocats + visio 30 min sur LiveKit existant
- 350 MAD/consultation, commission Cercles 25%
- Templates contrats marocains pré-remplis

### 1.7 QR-Print carte chantier (Agent 1 #6 + Agent 6 #4)
- Bouton "Imprimer la carte" → PDF A4 + QR signé
- Vérification mobile via route publique `/v/:dossierId`
- Anti-fraude visas CROA + pub physique virale

### 1.8 Boussole + cap solaire (Agent 6 #8)
- DeviceOrientation API + suncalc.js
- Pré-remplit note bioclimatique réglementation thermique 2024 MA

---

## 🛡️ Sprint 2 — Defensibility & Compliance (effort M-L, 1-3 mois)

Verrouille les risques juridiques et crée de la valeur opposable.

### 2.1 Coffre probant horodaté qualifié (Agent 4 #1) — LE PLUS URGENT
- TSA Barid eSign branchée à `ProbativeLogService` existant
- Scellement PAdES-LTV des contrats P2/P4
- **Aujourd'hui, tous les contrats sont écrit privé non daté de manière certaine (art. 425 DOC) → inutilisables en référé**

### 2.2 Module LBC-FT + déclaration de soupçon UTRF (Agent 4 #2)
- KYC renforcé + filtre PEP/sanctions + DS-UTRF auto pour notaires
- Évite 100 k–500 k MAD amende/manquement (art. 28 loi 43-05)

### 2.3 Registre + DPIA CNDP (Agent 4 #3)
- Module `tome-7/cndp/` : registre RT/ST, DPIA P6, autorisation préalable
- **CITURBAREA probablement en infraction aujourd'hui** (scoring algorithmique P6 non déclaré CNDP)

### 2.4 Rétention différenciée + crypto-shredding (Agent 4 #7)
- Politique par type doc (KYC 10 ans, probants 15 ans, marketing 3 ans)
- AES-256 KMS révocable
- Audit CNDP "vert"

### 2.5 AURS Live-Sync + Diff Visualizer (Agent 1 #8)
- Cron quotidien fetch couches AURS + diff turf.difference
- Push notification clients ayant dossier sur zone modifiée
- Preuve fraîcheur cartographique opposable

---

## 🤖 Sprint 3 — IA Agents spécialisés (effort M, 2-4 mois)

7 agents IA pour automatiser ce qui est manuel aujourd'hui.

### 3.1 Agent Anti-Désint Sémantique (Agent 3 #4)
- Claude Haiku 3.5 + few-shot Darija
- Complète regex existant (pas remplace), +60% détection
- ~12 €/mois pour 50k messages

### 3.2 Agent Auditeur SIG-P2 (Agent 3 #1)
- Croise déclaratif P2 avec AURS + ANCFCC + Sentinel-2
- Flag écart > 10% (sous-déclaration surface)
- 4h OPS gagnées/dossier douteux

### 3.3 Agent Pré-Rédacteur Rapports P4/P5 (Agent 3 #6)
- Draft 70% du rapport, expert valide
- Capacité expert × 3,5 (6h → 1h45)
- Marge passe 35% → 68%

### 3.4 Agent Conformité Documentaire (Agent 3 #3)
- ELA + métadonnées EXIF pour détection deepfake/photoshop
- Cross-check CIN ↔ titre foncier ↔ commune
- 1 fraude/mois évitée

### 3.5 Agent Recruteur P6 (Agent 3 #5)
- Scrape CNOA/ONA + LinkedIn + AMI conformes robots.txt
- 0 → 200 prestataires P6 en 3 mois (vs 12 mois manuel)
- Débloque liquidity du marché P6

### 3.6 Agent Négociateur DGI (Agent 3 #2)
- Claude Opus 4.7 + cache aggressif
- Mémoire opposition DGI draft (validation humaine obligatoire)
- Remise moyenne client 30-50k MAD justifie upsell premium

### 3.7 Agent Pricing Conversationnel Cercles (Agent 3 #7)
- Whisper local (RGPD-safe, audio jamais persisté) + Sonnet 4.5
- Side-panel pricing pendant visio LiveKit pros
- Différenciation absolue vs WhatsApp Business

**Coût total infra IA cible : ~450 €/mois pour 200 dossiers/mois = 2,25 €/dossier**
**ROI marginal ≈ 1644× la commission moyenne 40 000 MAD**

---

## 📱 Sprint 4 — Mobile/Terrain (effort M-L, 3-6 mois)

Une fois PWA prereqs livrés (sprint 1.2) :

| Feature | Effort | Cible |
|---------|--------|-------|
| Mode Chantier Offline (precache tuiles + GeoJSON + photos) | L | P3/P4/P6/Cercles |
| Constat vidéo géolocalisé à valeur probante | M | P4/P3/Cercles |
| Mesure surface WebXR (ARCore) | L | P5/Cercles/P3 |
| Carnet de chantier vocal Darija | M | P3/P6/Cercles |
| Vision IA conformité photo (TFJS edge) | L | P2/P3/OPS |
| Push API + WhatsApp bridge (anti-désint preserved) | M | Tous |

---

## 💰 Sprint 5 — Cercles devient OS du chantier (effort L, 6-12 mois)

Les 10 features Cercles (Agent 5) qui transforment le réseau en outil quotidien :

| # | Feature | Monétisation | Effort |
|---|---------|--------------|--------|
| 1 | AO-Cercle privé floor-price scellé (commit-reveal) | 1.5% adjugé | M |
| 4 | Sous-traitance TVA-source automatique | 0.5% + 290 MAD/mois | L |
| 2 | Avance-Décompte TGR (factoring marchés publics) | 0.8-1.4%/mois | L |
| 3 | Pool RC décennale mutualisée | 12-18% prime | M |
| 5 | Co-Visa Studio (plans IFC live + e-signature) | 49 MAD/sess ou 990/mois | M |
| 8 | Loc-Matos express + caution Stripe | 8% loueur + 1.5% acheteur | M |
| 10 | Index BTP-MA hebdo (référence sectorielle) | Freemium + 1 990 MAD/mois API | M |

---

## 🗺️ Sprint 6 — SIG features uniques au Maroc (effort M, 3-6 mois)

| # | Feature | Effort | USP |
|---|---------|--------|-----|
| 1 | Time-Machine prix DGI 2017→2026 (slider animé) | M | Données IPAI × DGI uniques |
| 2 | Isochrones inversées "bassin atteint" | M | Aucun acteur MA n'offre ça |
| 3 | Skyline 2.5D CES/COS extrusion | L | Effet wow premier au monde MA |
| 4 | Cone-of-view photo EXIF cap GPS | S | Anti-fraude photo géo-validée |
| 7 | Heatmap concurrence dossiers actifs (data propriétaire) | M | Effet réseau |

---

## 📊 Sprint 7 — CITURBAREA Insights (le pivot Bloomberg marocain) — Agent 7

**Thèse stratégique** : CITURBAREA dispose de 3 actifs uniques au Maroc qui n'existent
nulle part publiquement :
1. **Prix réels** (`Dossier.budgetEstime` + payload P4 prixVente vs DGI 2017)
2. **Délais réels permis** (`RokhasDossier.delaiGlobalJours` — donnée OR — ni AUC ni Ministère ne la publient)
3. **Coûts construction par corps de métier** (P3 — `CommandePrestataire`, `Devis`, `Facture`)

Aucun acteur public (DGI, HCP, BAM, AMMC) ne dispose de la vraie donnée transactionnelle live + géocodée.

| # | Feature | Cible monétisable | Effort | TTM | ARR |
|---|---------|-------------------|--------|-----|-----|
| 1 | **ICPR** Indice Prix Réels mensuel | Banques (AWB/BCP/BMCE), BAM, DGI, AMMC, notaires | M | 6-9 mois | 8-15 MMAD |
| 2 | **PVI** Permit Velocity Index | Promoteurs, banques, Ministère, presse | S | 3 mois | 3-6 MMAD |
| 3 | **TerrainScore™** /100 marchabilité | B2C + agents + notaires + banques | M | 4-6 mois | 4-8 MMAD |
| 4 | **CCCI** Construction Cost Index | FNBTP, assureurs, CNSS | M | 9-12 mois | 5-10 MMAD |
| 5 | **Opportunity Radar** alerting marché | Propriétaires + investisseurs | S | 4 mois | 2-5 MMAD |
| 6 | **P3 MOD Peer Benchmark** miroir anonyme | MOD/Firms (upsell Firm PRO) | S | 3 mois | 3-6 MMAD |
| 7 | **CITURBAREA Insights API** DaaS | BAM, AMMC, ANCFCC, Ministères, hedge funds MENA | L | 12-15 mois | 10-25 MMAD |
| 8 | **Dispute & Risk Atlas** litiges & non-conf. | Wafa/RMA/Saham, AMMC, avocats | M | 9 mois | 3-7 MMAD |

**ARR consolidé cible an 3 : 38-82 MMAD** (sans cannibaliser revenus P1-P6).

**Pourquoi ça change la valorisation** :
- Plateforme transactionnelle Maroc se vaut ~3-5× revenus
- Infra data nationale immobilière se vaut 8-15× (CoStar 12× sales, Reonomy 200 M$, Domain.com.au 10×)
- Soft power régulatoire : publier ICPR avant DGI = partenaire refonte barème loi finances 2027/2028
- Optionnalité IPO/M&A : profil "data + workflow + B2G" = candidat CSE OPCI ou cible CDG Invest / Mediterrania Capital

**3 chantiers transverses requis** :
1. **Datalake analytique séparé** (Tome 0 prévu) — réplication CDC vers ClickHouse/DuckDB
2. **InsightsAnonymizerService** centralisé — k-anonymity, l-diversity, differential privacy
3. **Conformité Loi 09-08 / CNDP** — clause "données agrégées peuvent être publiées sous forme d'indices de marché" dans onboarding P1-P6

**Quick win 90 jours** : PVI (#2) + Opportunity Radar (#5) + MOD Benchmark (#6) — effort S, données déjà là, ARR combiné 8-17 MMAD.

---

## 🚨 Risques transverses identifiés

1. **Légaux** : CITURBAREA probablement en infraction CNDP aujourd'hui (P6 scoring sans déclaration préalable). Sprint 2.3 PRIORITAIRE.
2. **Probants** : `ProbativeLogService` SHA-256 ≠ horodatage qualifié eIDAS. Sans Sprint 2.1, les contrats P2/P4 sont fragiles en référé.
3. **Mobile** : sans PWA prereqs (Sprint 1.2), TOUTES les features mobile-terrain (Agent 6) sont impossibles.
4. **IA budget** : hard-cap mensuel obligatoire via `estimateMonthlyCost()` pattern existant (chatbot.service.ts).

---

## ✨ Recommandations exécution

**Mois 1** : Sprint 1 complet (8 quick wins, surtout 1.1+1.2+1.7+2.1 en parallèle).
**Mois 2-3** : Sprint 2 + Sprint 3.1 (anti-désint sémantique).
**Mois 4-6** : Sprint 3 complet + Sprint 4 (3 premières features mobile).
**Mois 6-12** : Sprint 5 + 6 (Cercles + SIG avancé) selon traction commerciale.

**Hypothèse revenu additionnel cumulé 12 mois** :
- Sprint 1 : +25% conversion = +X MAD ARPU
- Sprint 2 : ~18 M MAD/an (revenus directs Agent 4)
- Sprint 3 : -800 € OPS/mois × 12 = économies + capacité × 3
- Sprint 5 : Cercles monétisé = nouveau pillar revenue

Source : audit parallèle 7 agents (1 SIG, 2 UX, 3 IA, 4 Legal, 5 Cercles, 6 Mobile, 7 Data — synthèse 2026-05-25).

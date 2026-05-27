# PIVOT STRATÉGIQUE — « Le Visa du Foncier Maghrébin »

> Plan d'action 90 jours (Q3 2026) → Horizon Q2 2027
> Tranché par le Comité Délibératif du 25 mai 2026
> Intègre le feedback fondateur du 27 mai 2026 : « on ne tue pas les portes »
> Auteur : Yassine Attarassi (CITURBAREA) — version v1.0 — 27 mai 2026

---

## 1. Vision

**CITURBAREA devient le Visa du foncier maghrébin** : la couche d'authentification,
d'estimation, de transaction et de conformité qui se superpose à toutes les
opérations foncières et immobilières du Maroc, puis du Maghreb.

Le « Visa foncier » se définit en trois actes :

1. **L'identifiant unique** d'une parcelle, d'un bien ou d'un projet, traçable
   du registre cadastral (ANCFCC) au permis de construire (Rokhas) en passant
   par la transaction notariée et le suivi de chantier.
2. **Le score de confiance** rattaché à cet identifiant : conformité juridique,
   estimation marché, historique transactionnel, scoring environnemental,
   scoring constructeur.
3. **La passerelle institutionnelle** entre l'écosystème privé (acheteurs MRE,
   investisseurs OPCI, BTP) et l'écosystème public (DGI, ANCFCC, agences urbaines,
   collectivités, Ministère de l'Habitat).

L'analogie produit : Zillow + Stripe + Truework, version foncier maghrébin —
mais ancré dans les institutions locales, pas en concurrence avec elles.

---

## 2. Position fondateur — « on ne tue pas les portes »

Le Comité Délibératif a un instant envisagé d'abandonner certaines portes (P3, P6)
pour concentrer les ressources sur le Visa foncier. **Le fondateur s'y oppose.**

### Justification

- Les **six portes (P1–P6)** sont des **points d'entrée du marché** sur la
  thèse Visa foncier. Couper une porte, c'est couper un canal d'acquisition
  utilisateur AVANT d'avoir mesuré sa réelle conversion.
- **Cercles** (réseau pro BTP marocain) est l'infrastructure sociale qui
  transforme la plateforme d'un outil transactionnel en réseau actif. C'est
  l'asset défensif n°1 vs un Zillow international qui débarquerait.
- **Le module SIG** (1 505 communes, PA AURS vectorisés, DGI parsing, IPAI
  BAM correction) est l'infrastructure technique qui rend le Visa
  techniquement crédible. C'est l'asset défensif n°2.
- **Le marché trie** les portes via l'instrumentation analytique. Pas
  l'équipe a priori. Une porte qui ne décolle pas après 90 jours d'instrumentation
  sera archivée avec données à l'appui, pas par intuition.

### Décision

| Asset | Statut | Investissement Q3 |
|-------|--------|--------------------|
| P1 Particulier | Garder, instrumenter | Finir wizard + paiement |
| P2 Promoteur | Garder, instrumenter | Finir wizard + paiement |
| P3 MOD délégué | Garder, instrumenter | Finir wizard + paiement |
| P4 Foncier | **Garder + accélérer** (c'est la porte qui converge avec le Visa) | Finir wizard + paiement + UX premium |
| P5 Rapports | Garder, instrumenter | Finir wizard + paiement |
| P6 Prestataires | Garder, instrumenter (via Cercles) | Finir scoring L7 + onboarding pro |
| Cercles | Garder, accélérer | Hub Diaspora Q4 (cf. §5) |
| SIG | Garder, accélérer | Couche Visa foncier (cf. §3) |
| **Visa foncier (nouveau)** | **Couche transverse au-dessus des 6 portes** | **Module Zillow MA pilote Q3** |

Le Visa foncier **ne remplace pas** les portes. Il les **fédère** : chaque porte
alimente le Visa (P1/P2 → demandes adresses qualifiées, P4 → vente, P5 →
rapports d'expertise officiels, P6 → fournisseurs certifiés). Et le Visa
**enrichit** chaque porte (estimation, conformité, scoring).

---

## 3. Architecture cible — 4 couches

```
┌─────────────────────────────────────────────────────────┐
│  COUCHE 4 — CHANTIER                                    │
│  Suivi PV, photos drone, paiements escrow, garanties    │
│  Sources : P3 wizard + Cercles pros + connexion Rokhas  │
├─────────────────────────────────────────────────────────┤
│  COUCHE 3 — TRANSACTION                                 │
│  Mandat de vente, signature notariale, escrow, OPCI     │
│  Sources : P4 wizard + Cercles MRE + notaires partenaires│
├─────────────────────────────────────────────────────────┤
│  COUCHE 2 — ESTIMATION (Zillow MA — pilote Q3)          │
│  Prix m² + fourchette + comparables + scoring confiance │
│  Sources : DGI 2017 × IPAI BAM + observations marché    │
├─────────────────────────────────────────────────────────┤
│  COUCHE 1 — REGISTRE                                    │
│  ID parcelle + statut juridique + PA + zonage + accès   │
│  Sources : ANCFCC + AURS/AUC/AUDRSO + Taamir + OSM      │
└─────────────────────────────────────────────────────────┘
```

Cette architecture n'a pas besoin d'attendre la promulgation de la loi PICA
(Plateforme d'Identification de la Conformité Aménagement) pour démarrer :
le Visa peut exister **de facto** par usage du marché, et **de jure** dès que
la loi sera promulguée (Q2 2027 cible).

---

## 4. Q3 2026 — Plan d'action 90 jours (juillet-septembre)

Cinq livrables, mesurables, datés. Pas de scope creep.

### Livrable #1 — Instrumentation analytique sur les 6 portes (J+15)

**Pourquoi** : on doit **mesurer** les portes avant de les juger. Aujourd'hui
on n'a aucune télémétrie produit consolidée (juste les logs API et le compteur
Stripe).

**Quoi** :
- Self-hosted PostHog (ou Plausible si on veut RGPD-friendly out-of-the-box).
  Préférence : **Plausible self-hosted** pour minimiser la surface PII.
- Events funnel par porte :
  - `porte_landing_viewed` (utm_source, ville, device)
  - `porte_wizard_step_completed` (porte, step_id, duration_ms)
  - `porte_quote_computed` (porte, montant_mad, surface, bienFamily)
  - `porte_intake_submitted` (porte, dossierId, leadOwner)
  - `porte_payment_started` (porte, montant)
  - `porte_payment_received` (porte, montant)
  - `porte_activated` (porte, time_from_landing_min)
- Dashboard CC `/cc/metrics` :
  - Funnel par porte (visite → wizard → devis → intake → paiement → activation)
  - Tableau Go/No-Go (cf. §9)
  - Cohortes par mois d'acquisition
- Cible technique : 100 % des events tirés en < 200 ms (pas de blocage UI), 0
  PII brute (uniquement IDs hashés côté client).

**Owner** : équipe dev (1 ETP × 10 jours).
**Budget** : 0 € (self-hosted) + 5 €/mois VPS.

---

### Livrable #2 — Zillow MA pilote (J+30)

**Pourquoi** : on doit prouver, sur 3 quartiers à fort signal de marché, qu'on
peut estimer un prix m² **mieux** que les compétiteurs locaux (Mubawab,
Avito, Sarouty), avec une **transparence des sources** que personne ne fait
aujourd'hui.

**Quoi** :
- 500 parcelles pilotes seedées : **170 Casa-Anfa + 170 Marrakech-Gueliz + 160 Tanger-Centre**.
- 1 000 comparables transactions historiques (fictifs mais réalistes — données
  de marché 2024-2026 cohérentes avec les referentiels DGI 2017 + IPAI BAM).
- Algorithme d'estimation : pondération distance + récence + bienFamily + ville,
  croisé avec **référentiel DGI 2017 × correction IPAI BAM 2026**.
- Sortie : prix m² central + fourchette ±1σ + score confiance 0-100 + 10
  comparables + sources (DGI, BAM, observations marché).
- Endpoint public `/api/zillow-ma/estimation` (pas d'auth pour estimation simple).
- Page publique `/foncier/estimation` SEO-friendly (mobile-first).
- Page détail parcelle `/foncier/parcelle/:id` (post-login pour le détail complet).

**Acceptance criteria** :
- Time-to-estimation < 2 s sur mobile 4G.
- Confidence ≥ 70 % sur les 3 quartiers pilotes.
- 100 % des estimations renvoient les sources officielles citables.

**Owner** : équipe dev (2 ETP × 15 jours).
**Budget** : 0 € (infra existante).

---

### Livrable #3 — Conformité CNDP (J+90 — avant 30 septembre 2026)

**Pourquoi** : la CNDP marocaine (Commission Nationale de protection des
Données à caractère Personnel, loi 09-08) **doit** être saisie avant
exploitation commerciale large. Si on attend que le marché tire, on prend le
risque d'un coup d'arrêt réglementaire.

**Quoi** :
- Désignation DPO interne (proposition : Yassine en cumul + cabinet externe
  consultant 0.5 ETP).
- Cartographie des traitements (registre RGPD-like CNDP) :
  - Lead capture (P1–P6 wizards)
  - Comptes utilisateurs Cercles
  - Estimations foncières Zillow MA (anonymes par défaut, IP hashée)
  - Données SIG (publiques, hors RGPD)
- Dossier de déclaration normale CNDP (form D-NORMALE) déposé en ligne sur
  portail CNDP.
- Politique de confidentialité publique mise à jour citant la déclaration CNDP.
- Cookie banner conforme (déjà absent — à ajouter pour Plausible).
- DPA (Data Processing Agreement) avec sous-traitants : Railway, Cloudflare,
  Resend, Twilio, OpenAI (si chatbot tirant des données utilisateur).

**Owner** : Yassine + cabinet juridique externe (0.5 ETP).
**Budget** : ~25 000 MAD (cabinet) + 0 € CNDP (gratuit).

---

### Livrable #4 — Conventions institutionnelles (J+90)

**Pourquoi** : le Visa foncier sans accès aux bases institutionnelles, c'est
un Zillow scrappé. On a besoin d'API B2B officielles pour passer du « plausible »
au « probant ».

**Quoi** (3 RDV cibles concrets) :
1. **DGI — Mostatmir** : RDV ciblé avec la direction des conventions B2B.
   Demande : flux API officiel des valeurs vénales DGI (au-delà du PDF 2017),
   en échange d'un retour analytique anonymisé sur les volumes de transactions
   et l'écart marché/référentiel.
2. **CNOA** (Conseil National de l'Ordre des Architectes) : audience demandant
   convention de référencement réciproque (CITURBAREA = annuaire institutionnel,
   CNOA = supervision déontologique).
3. **Ministère de l'Habitat** : courrier officiel positionnant CITURBAREA
   comme **plateforme candidate** pour l'application opérationnelle du **projet
   de loi PICA** (Plateforme d'Identification de la Conformité Aménagement).
   Objectif : être dans la boucle quand le décret d'application sortira.

**Owner** : Yassine (lobbying institutionnel direct).
**Budget** : 15 000 MAD frais déplacements + représentation.

---

### Livrable #5 — Production-ready des 6 portes (J+60)

**Pourquoi** : décision fondateur « on ne tue pas les portes » → corollaire :
on les **termine**. Une porte instrumentée mais cassée donne de fausses métriques.

**Quoi (par porte)** :
- **P1** : wizard finalisé, paiement Stripe testé end-to-end, email transactionnel
  multilingue, accusé de réception client + alerte OPS.
- **P2** : 5 sections (IMM/GR/LOT/EPIG/AMG) terminées, devis CNOA exact, contrat
  type CNOA généré PDF, intake → admin validation flow ferme.
- **P3** : 40+ corps de métier validés, pricing 10 %, contrat universel généré,
  intake → admin validation.
- **P4** : 3 packs (BASIQUE / MOYEN / RENTABILITÉ) finalisés, rapport
  watermarqué « exclusif CITURBAREA », **convergence Zillow MA** (le rapport
  P4 cite l'estimation Zillow comme socle).
- **P5** : 4 types de rapports, pricing forfait × surface × délai, rapport
  watermarqué, paywall gating.
- **P6** : scoring L7 finalisé, classes BTP, agréments, vérification admin,
  catalogue matériaux fournisseurs activé.

**Owner** : équipe dev (3 ETP × 30 jours, en parallèle).
**Budget** : intégré dans le run-rate.

---

## 5. Q4 2026 — Plan (octobre-décembre)

Cap : **monétiser la Diaspora MRE** (segment à 7M de personnes, ~9 % du PIB,
appétit fort pour le foncier au pays).

### App MRE Diaspora (mobile-first PWA)

- Onboarding KYC simplifié (CIN MRE + sélection ville d'origine + budget).
- Catalogue géolocalisé `Mon village` (Béni Mellal, Tinghir, Larache, etc.) avec
  toutes les parcelles disponibles + estimation Zillow MA + score juridique.
- Mandat à distance — délégation à un **mandataire local certifié CITURBAREA**
  pour visite, négociation, signature notariale (procuration consulaire).
- Paiement multi-devises (EUR, CAD, USD, AED) avec couverture forex transparente.
- Calendrier vacances : agenda visite collective août/décembre.

### Cercles Diaspora Hub

- Groupes par communauté MRE-pays (MRE France, MRE Belgique, MRE Espagne…) ×
  pays d'origine (Béni Mellal, Tata, Tiznit…).
- Live ramadan / aïd : « 30 min avec un notaire de votre province ».
- Sondages : « Quelle est la prochaine ville à couvrir en Zillow MA ? »

### Mandataires locaux — 50 villes

- Programme **CITURBAREA Mandataires** : recrutement de 50 architectes
  juniors ou agents fonciers certifiés CITURBAREA, payés à la commission
  sur transaction Visa foncier.
- Onboarding via Cercles (les pros existants candidatent en priorité).
- Outil interne : appli mobile mandataire (check-in géolocalisé sur parcelle,
  upload photos timestampées, signature notariale digitalisée).

**Budget Q4** : 250 000 MAD (devs + marketing acquisition MRE + déploiement
mandataires) — cf. §11.

---

## 6. Q1 2027 — Plan (janvier-mars)

Cap : **financiariser le foncier** via OPCI tokenisé.

### OPCI tokenisé AMMC

- Partenariat avec une société de gestion OPCI agréée AMMC.
- Tokenisation des parts (BCT marocaine si possible, sinon blockchain privée
  Polygon avec passerelle MAD-bridge).
- Pool MRE syndiqué : 100 MAD ticket minimum, dividendes trimestriels (locatif
  + plus-values).
- Visa CITURBAREA = preuve d'éligibilité du sous-jacent foncier (estimation,
  conformité, scoring).

### Drone + IA pour estimation premium

- Programme pilote 3 villes (Casablanca, Marrakech, Tanger) :
  - Survol drone des nouvelles parcelles entrantes (résolution 5 cm/pixel).
  - Pipeline IA : détection bâti, calcul surface, état (vacant / bâti / en
    construction), évaluation accessibilité.
  - Output : `Visa Premium` à 500 MAD/parcelle (mandat exclusif).

### Pool MRE syndiqué pour acquisition foncière

- Levée de fonds via plateforme CITURBAREA — 5 deals pilotes (1 par ville
  Q3 + 2 nouvelles villes Q1).
- Communication : « investissez 100 € dans le foncier de votre ville d'origine ».

**Budget Q1 2027** : 400 000 MAD (juridique OPCI + flotte drone + IA + marketing).

---

## 7. Q2 2027 — Plan (avril-juin)

Cap : **expansion Maghreb** + **statut PICA promulgué**.

### Statut PICA (Plateforme d'Identification de la Conformité Aménagement)

- Suivi parlementaire actif (lobbying via livrable #4 Q3).
- Si promulgation → CITURBAREA candidate pour rôle d'opérateur agréé.
- Si retard parlementaire → maintien de la position « plateforme de fait »
  reconnue par usage.

### Pilote Tunis / Alger

- **Tunis** : convention avec la Direction Générale des Domaines (équivalent
  ANCFCC tunisien). Pilote 200 parcelles La Marsa + Sidi Bou Saïd.
- **Alger** : convention avec la Direction Générale du Domaine National. Pilote
  200 parcelles Hydra + Dély Ibrahim.
- Adaptation algorithme estimation : remplacer DGI MA × IPAI BAM par
  équivalents TN (BCT + ONS) et DZ (ONS + Banque d'Algérie).

**Budget Q2 2027** : 600 000 MAD (juridique conventions binationales +
adaptation tech + équipe locale).

---

## 8. Métriques tracking — 6 KPIs par porte

| KPI | Définition | Cible Q3 (sortie 30 sept) |
|-----|-----------|----------------------------|
| **DAU** (Daily Active Users) | utilisateurs uniques/jour | P1: 200, P2: 50, P3: 30, P4: 80, P5: 40, P6: 100 |
| **GMV** (Gross Merchandise Value) | total MAD facturé/mois | P1: 50k, P2: 200k, P3: 100k, P4: 80k, P5: 30k, P6: N/A |
| **Conversion** | landing → paiement (%) | P1: 3 %, P2: 1.5 %, P3: 1 %, P4: 2 %, P5: 2 %, P6: 5 % (signup) |
| **NPS** | net promoter score (enquête post-validation) | ≥ 30 toutes portes |
| **ARPU** | revenu moyen par utilisateur payant (MAD) | P1: 5 000, P2: 25 000, P3: 60 000, P4: 8 000, P5: 4 000, P6: 0 (gratuit) |
| **Churn 30j** | % utilisateurs créés -30 j jamais revenus | < 80 % toutes portes (segment digital MA, taux élevé acceptable v1) |

Pour le **Visa foncier Zillow MA** :
- Estimations/jour (cible J+90 : 500/jour)
- Conversion estimation → signup (cible : 8 %)
- Conversion signup → demande rapport P4/P5 (cible : 15 %)

---

## 9. Critères Go/No-Go par milestone (explicites)

**J+45 — Review portes P1–P6** :

| Condition | Action |
|-----------|--------|
| Porte avec **conversion ≥ 1 %** ET **NPS ≥ 30** | Accélère (UX premium, SEO, ads ciblées) |
| Porte avec **conversion ≥ 0.5 %** mais NPS < 30 | Fix UX et re-mesure J+30 |
| Porte avec **conversion < 0.5 %** ET DAU < 20 | **Mode maintenance** (pas archive, pas accélération) — décision finale J+90 |
| Porte avec **conversion < 0.3 %** ET DAU < 5 ET 0 GMV | **Archive** + post-mortem |

**J+45 — Review Zillow MA** :

| Condition | Action |
|-----------|--------|
| ≥ 100 estimations/jour ET confidence moyenne ≥ 75 % | Accélère : ouvre Rabat + Salé + Agadir |
| 30-100 estimations/jour | Maintien pilote 3 villes, optimisation conversion |
| < 30 estimations/jour | Revoir UX + SEO + marketing |

**J+90 — Review macro** :
- Si ≥ 3 portes vertes (conversion ≥ 1 %) → reconduit le plan tel quel pour Q4.
- Si 1-2 portes vertes → focus Q4 sur le mix (top portes + Zillow MA + MRE).
- Si 0 porte verte → réunion d'urgence Comité Délibératif, possibilité de
  refondre la thèse.

---

## 10. Risques + mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **CNDP retoque** la collecte d'estimations | Faible | Élevé | Dossier exhaustif J+90, anonymisation par défaut, hash IP |
| **DGI refuse** la convention API | Moyenne | Moyen | Plan B : continuer le PDF parsing + crowdsourcing observations marché |
| **ANCFCC refuse** la convention B2B | Élevée | Moyen | Plan B : reposer sur OSM + observations + agences urbaines (déjà OK) |
| **Concurrence Zillow/Mubawab** lance même service | Moyenne | Élevé | Avance via Cercles (réseau social) + SIG (vectorisation) + transparence sources |
| **Échec acquisition MRE** Q4 (CAC > LTV) | Moyenne | Élevé | Pilote A/B 3 villes avant scale, partenariats consulats |
| **Bug critique** sur Zillow MA (estimation absurde affichée) | Moyenne | Élevé | Tests sur 1 000 cas avant prod, disclaimer visible, monitoring outlier |
| **Burnout équipe** (3 ETP sur 90 j intense) | Moyenne | Élevé | Sprints 2 semaines, démo bimensuelle, congés bloqués post-J+90 |
| **Loi PICA retardée** ou abandonnée | Élevée | Faible | Pas de dépendance critique, on continue en « plateforme de fait » |

---

## 11. Budget estimatif par quarter

| Poste | Q3 2026 (90j) | Q4 2026 | Q1 2027 | Q2 2027 | Total 12 mois |
|-------|---------------|---------|---------|---------|----------------|
| Dev (3 ETP × salaires + freelances) | 450 000 | 500 000 | 550 000 | 600 000 | 2 100 000 MAD |
| Infra (Railway + Cloudflare + Plausible + Twilio + Resend) | 25 000 | 30 000 | 40 000 | 50 000 | 145 000 MAD |
| Marketing (SEO + ads ciblées + partenariats) | 50 000 | 200 000 | 250 000 | 300 000 | 800 000 MAD |
| Juridique (CNDP + cabinet + OPCI + conventions Maghreb) | 40 000 | 50 000 | 200 000 | 300 000 | 590 000 MAD |
| Institutionnel (déplacements + représentation) | 15 000 | 30 000 | 50 000 | 80 000 | 175 000 MAD |
| Mandataires locaux (commissions Q4+) | 0 | 100 000 | 250 000 | 400 000 | 750 000 MAD |
| Drone + IA pilote (Q1+) | 0 | 0 | 150 000 | 100 000 | 250 000 MAD |
| Imprévu (15 %) | 87 000 | 137 000 | 220 000 | 275 000 | 719 000 MAD |
| **Total trimestre** | **667 000** | **1 047 000** | **1 710 000** | **2 105 000** | **5 529 000 MAD** |

**≈ 5.5 M MAD ≈ 500 k EUR sur 12 mois.**

Sources de financement à activer :
- Cash flow opérationnel (objectif break-even Q1 2027).
- Levée seed 1 M EUR avant fin Q3 2026 (cap table : fondateur 70 %, investisseurs
  20 %, equity team 10 %).
- Subvention(s) Maroc Digital (CDG Invest, MITC) — montant à instruire.

---

## 12. Signature & gouvernance

Ce document est validé par :
- **Fondateur** : Yassine Attarassi (CITURBAREA) — 27 mai 2026.
- **Comité Délibératif** : revue mensuelle, validation des Go/No-Go.

**Revue suivante** : 30 juin 2026 (J+30, après livrable #1 instrumentation
activée + livrable #2 Zillow MA en bêta).

**Versioning** : ce document évolue. Tout changement majeur de cap (abandon
d'une porte, abandon Visa foncier) doit être tracé en v1.x avec procès-verbal
du Comité Délibératif.

---

_Document interne CITURBAREA — confidentiel — ne pas diffuser hors équipe
fondatrice et investisseurs sous NDA._

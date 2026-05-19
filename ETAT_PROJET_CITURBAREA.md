# État du projet CITURBAREA

> Document de référence vivant — mis à jour à chaque session pour ne pas perdre le fil.
> **Dernière mise à jour : 2026-05-17**

---

## Les 3 projets dans ce dépôt

Le monorepo contient **trois produits distincts**. Ne pas les confondre.

| # | Produit | Description | Domaine | Statut global |
|---|---------|-------------|---------|---------------|
| 1 | **Cercles** | Réseau social pro BTP (architectes, BET, labos…) | `cercles.citurbarea.com` | 🟢 En consolidation |
| 2 | **P1–P6** | Portail dossiers / devis / contrats / Stripe | `citurbarea.com` (landing) | 🟡 En pause |
| 3 | **Killswitch** | Forteresse sécurité (2 clés USB + recovery) | infra | ⏸ Planifié (Sprint K) |

**Règle de travail** : on finit un jalon avant d'ouvrir le suivant. Jalon en cours = **Consolidation Cercles**.

---

## CERCLES — inventaire des fonctionnalités

Légende : 🟢 vérifié OK · 🟡 déployé mais non vérifié · 🔴 cassé · ⚪ pas commencé

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Landing publique `cercles.citurbarea.com` | 🟢 | Vérifié 2026-05-18 ; logo CERCLES → landing, CTAs auth-aware |
| Inscription publique 4 steps (sans invitation) | 🟢 | Vérifié 2026-05-18 : 2 comptes créés OK, visibles backoffice |
| Login pro | 🟢 | Vérifié 2026-05-18 : login backoffice OK |
| Mot de passe oublié (code email + SMS) | 🟡 | `/mot-de-passe-oublie` |
| Sidebar Cercles (liste, Mon profil, logout) | 🟡 | |
| Feed / liste des cercles | 🟢 | Vérifié 2026-05-18 : cercles s'affichent, fil OK |
| Détail cercle (Discussions / Salles vidéo / Membres) | 🟡 | |
| Posts : créer, liker (toggle), commenter, partager | 🟢 | Like vérifié 2026-05-18 (DB PostUpvote confirmée) |
| Embed YouTube / Facebook dans les posts | 🟢 | Vérifié 2026-05-18 : fix /live/ + embed dans le fil. NB : la vidéo doit autoriser l'intégration côté YouTube |
| Upload photos / vidéos sur posts | 🟡 | |
| Onglet Membres (visible non-membres si PUBLIC/MEMBERS) | 🟡 | |
| Fiche profil pro complète | 🟡 | `/cercles/profile/:id` |
| Messagerie directe 1-to-1 (style LinkedIn) | 🟢 | Vérifié 2026-05-18 : envoi+réception+réponse, DB confirmée |
| Annuaire pro (filtres métier/région/spécialité) | 🟡 | `/cercles/annuaire` |
| Création de cercle | 🟡 | `/cercles/nouveau` |
| Visioconférence (LiveKit + Jitsi) | 🟡 | salles vidéo |
| Adhésions SNASP / ANJAUM (1000 MAD/an) | 🟡 | |
| Zoom interface +30% (accessibilité) | 🟡 | |
| Backoffice "Inscrits Cercles" (`/cc/inscrits`) | 🟢 | Vérifié 2026-05-18 : 19 inscrits affichés, stats OK |
| Filtrage sécurité : `/cc/*` `/admin/*` bloqués sur sous-domaine public | 🟢 | Vérifié : accès backoffice uniquement via URL Railway |

**→ Objectif du jalon en cours : passer tous les 🟡 en 🟢 (vérifiés) ou 🔴 (à corriger).**

---

## Infrastructure

| Élément | Détail |
|---------|--------|
| API | Railway service `citurb` — `citurb-production.up.railway.app` |
| Web | Railway service `citurb-web` — domaine public `citurbarea.com` ; `www` + `cercles.citurbarea.com` redirigent dessus ; URL interne `citurb-web-production.up.railway.app` (backoffice) |
| DB | PostgreSQL Railway — public via `roundhouse.proxy.rlwy.net:31019` |
| Email | Resend (HTTP API) |
| SMS / OTP | Twilio Verify |
| DNS | Cloudflare (zone `citurbarea.com`) |
| Deploy web | **manuel** : `railway up --service citurb-web --detach` (auto-deploy cassé) |
| Deploy API | auto sur push si `apps/api/dist/**` modifié + commité |

---

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| OWNER (backoffice) | `architectattarassi@gmail.com` | _(changé via reset password — voir avec Yassine)_ |
| Démo architecte 1 — Amine El Fassi | `demo.archi1@citurbarea.test` | `DemoArchi2026!` |
| Démo architecte 2 — Salma Berrada | `demo.archi2@citurbarea.test` | `DemoArchi2026!` |
| Démo architecte 3 — Youssef Lahlou | `demo.archi3@citurbarea.test` | `DemoArchi2026!` |

> ⚠️ Identifiants démo **vérifiés en base le 2026-05-17** (bcrypt confirmé).
> Les anciens identifiants `*.citurbarea.demo` / `Test1234!` étaient erronés.

Cercle de démo : `/cercles/demo-reunion-mai-2026` (PUBLIC, 5 membres, 4 posts)

---

## En attente / prochaines étapes

- **Consolidation Cercles** — quasi terminée (reste : membres, profil, annuaire, visio, mdp oublié)
- **Séparation feed général / posts de cercle** — ✅ FAIT (Sprint M, 2026-05-18) :
  - Posts généraux (`cercleId` null) : fil public, page `/post/:id` sans login, SEO
  - Posts de cercle : réservés aux pros connectés / membres
- **Marketplace BTP** (épic — e-commerce complet, panier+commande) :
  - Phase 1 — Catalogue : ✅ refondu en modèle RÉFÉRENTIEL (2026-05-18) :
    - `MarketProduct` = catalogue maître ; `SupplierOffer` = offre fournisseur
    - 197 matériaux, 12 corps de métier (`/cercles/marketplace`)
    - Codes CITURBAREA : matériau `CIT-XX-NNN` (XX=corps métier), fournisseur
      `CIT-FRN-NNNNN`, référence offre = combo. Script : assign via DB.
    - Identité fournisseur masquée tant que `ProProfile.supplierContractSignedAt` null
    - Fournisseur gère ses offres : `/cercles/mes-offres`
  - Photos : ✅ vraies photos Pixabay par famille (téléchargées + hébergées).
    Écran admin `/cercles/marketplace/photos` : remplacer / re-piocher par famille.
  - **EXPANSION MATÉRIAUTHÈQUE À FAIRE** (nouveau message, contexte frais — OBLIGATOIRE,
    une réécriture de seed de cette taille ne doit PAS être coupée à mi-chemin) :
    - Objectif : référentiel le plus complet possible (~600-900 types de matériaux ;
      « 2000 » = padding, viser la qualité : tous les matériaux réels d'une droguerie/
      fournisseur BTP marocain, couvrant les 12 corps de métier en profondeur)
    - Méthode : seed `apps/api/scripts/seed-referentiel.ts` — utiliser une approche
      GÉNÉRATIVE (matériaux de base × variantes : diamètres, dimensions, finitions)
      pour atteindre le volume sans saisie manuelle de chaque ligne
    - Prix : fourchettes marché Maroc 2026 (sources : francobat.ma, lechantier.ma,
      tachrone.ma, archiplan.ma). Ajuster marbre/import vers le haut (marbre local
      350-800, import Carrare 800-2500 DH/m²).
    - Après expansion : ré-attribuer les codes CIT-XX-NNN (script per corps de métier,
      tri famille+nom), puis relancer `/api/marketplace/admin/populate-photos` pour
      les nouvelles familles.
    - Schéma stable : `MarketProduct` (citCode, corpsMetier, famille, name, slug,
      unit, description, indicativePriceMin/Max, photo, active).
  - Phase 2 — Panier · Phase 3 — Commande+statuts · Phase 4 — Paiement
    (online / dépôt chèque / Cash Plus / Wafa Cash) — à venir
- **Killswitch** (Sprint K) — bloqué sur réception de 3 YubiKeys (à commander)
- **Domaine principal `citurbarea.com`** — ✅ FAIT (2026-05-19, vérifié) : échange des
  domaines, gratuit (pas d'upgrade Railway).
  - `citurbarea.com` = domaine custom Railway (`9esjllrj.up.railway.app`, DNS only) →
    sert l'app directement → landing générale à `/`
  - `cercles.citurbarea.com` → Page Rule 301 → `citurbarea.com/cercles`
  - `www.citurbarea.com` → Page Rule 301 → `citurbarea.com`
  - Route `/cercles` = `CerclesHome` : landing publique Cercles si déconnecté,
    fil d'actualité si connecté.
  - `/cc/*` et `/admin/*` bloqués sur tous les hôtes publics (`PublicHostBlock`) —
    backoffice accessible uniquement via `citurb-web-production.up.railway.app`.
- **Porte P6 → Cercles** — ✅ FAIT (2026-05-19, commit `dffe77d`) : bannière d'accès
  à `cercles.citurbarea.com` dans l'écran « type » de la 6ème porte.
- **admin.citurbarea.com** — bloqué sur upgrade Railway Hobby (limite custom domain)
- **P1–P6** — en pause

---

## Risques connus

- Déploiements manuels, aucun test automatisé, pas de CI
- Auto-deploy `citurb-web` cassé → `railway up` obligatoire
- Push GitHub intermittent (DNS local instable)
- Killswitch : avec 1 seule clé USB = point unique de défaillance (3 YubiKeys requises)

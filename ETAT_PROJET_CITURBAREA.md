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
| Web | Railway service `citurb-web` — `citurb-web-production.up.railway.app` + `cercles.citurbarea.com` |
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
  - Phase 1 — Catalogue & portfolio : ✅ FAIT (2026-05-18) — modèle `SupplierProduct`,
    CRUD vitrine `/cercles/ma-vitrine`, marketplace `/cercles/marketplace`, storefront
    `/cercles/storefront/:id`, fiche produit, upload photos portfolio
  - Phase 2 — Panier · Phase 3 — Commande+statuts · Phase 4 — Paiement+litiges (à venir)
- **Killswitch** (Sprint K) — bloqué sur réception de 3 YubiKeys (à commander)
- **admin.citurbarea.com** — bloqué sur upgrade Railway Hobby (limite custom domain)
- **P1–P6** — en pause

---

## Risques connus

- Déploiements manuels, aucun test automatisé, pas de CI
- Auto-deploy `citurb-web` cassé → `railway up` obligatoire
- Push GitHub intermittent (DNS local instable)
- Killswitch : avec 1 seule clé USB = point unique de défaillance (3 YubiKeys requises)

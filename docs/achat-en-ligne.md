# Achat de matériaux en ligne — architecture et conditions de lancement

Matériauthèque publique : `citurbarea.com/materiaux`. Ce document décrit ce qui est **en ligne** (phase 1, gratuite), ce qui est **prêt mais désactivé** (phase 2, commande et paiement) et **ce qu'il manque** pour l'activer. Il est aligné sur `docs/strategie/modele-economique.md` (rangs 6 « Commission RFQ / marketplace » et 7 « Négoce en propre », section c.3 juridique).

## 1. Phases

| Phase | Statut | Ce que fait le client | Ce que gagne la société (HSE DECO) |
|---|---|---|---|
| **1. Demande de prix (RFQ)** | **En ligne** | Panier multi-matériaux (quantités, unités de vente, ville) → une demande gratuite, sans engagement | Rien sur le client. Le fournisseur paie l'abonnement Cercles et, à partir de la phase 2 du modèle économique, une **commission de 3 à 5 % (modèle : 3,5 %)** sur les commandes issues des demandes, facturée chaque mois au fournisseur |
| **2. Commande + paiement en ligne** | Écrans « bientôt disponible », drapeau désactivé | Commande ferme, paiement en ligne, suivi de livraison | Même commission, prélevée automatiquement (paiement scindé chez un établissement de paiement agréé) |
| **3. Négoce en propre** | Hors périmètre du code actuel | Achète à la société | Marge de négoce (second œuvre d'abord), à partir de M18 selon le modèle économique |

## 2. Phase 1 — en ligne

- **Prix publics** : `domain/materiaux/reference.ts` — une seule source de vérité. Prix du moteur de chiffrage (`chiffrage/referentiel.ts`) quand le matériau y figure avec une source (A, B ou C), sinon prix du catalogue CIT (`materiaux/catalogue.ts`). Les hypothèses (fiabilité H) ne sont jamais publiées.
- **Prix fournisseurs** : `GET /api/prix/materiaux` (`functions/api/prix/materiaux.ts`) — médiane des fiches **approuvées** de fournisseurs **approuvés** qui livrent la région, publiée **seulement à partir de 3 fournisseurs distincts** (sinon aucun prix fournisseur n'est révélé : confidentialité et loi 104-12 — indices agrégés et anonymisés). Mises à jour manuelles du back-office (`PrixReferenceManuel`) prises en compte.
- **Demande de prix** : le panier (`features/materiaux/PanierDemande.tsx`) envoie **un lead** via `/api/lead-funnel/capture` : porte `P6`, source `MATERIAUX`, détail dans `meta.wizard.demandePrix` (lignes, quantités converties en unité de référence, ville, région, estimation HT, nombre de fournisseurs de la région). Visible dans `/cc/leads` (suivi commercial) et `/cc/materiaux` (vue détaillée). Alerte e-mail avec le détail des lignes.
- **Coordonnées des fournisseurs jamais exposées** : CITURBAREA relaie. Sans fournisseur inscrit dans la région, la demande est quand même enregistrée et le visiteur voit l'invitation « Vous êtes fournisseur ? Inscrivez-vous » (`/cercles/inscription`).
- **Signalement d'un prix** : lead source `MATERIAUX_SIGNALEMENT`, vérifié par l'équipe (`/cc/materiaux` → Prix signalés).

Aucune table nouvelle n'est nécessaire pour la phase 1 (table `Lead` existante). La mise à jour manuelle des prix demande `docs/prix/sql/prix-reference-manuel.sql`.

## 3. Phase 2 — prête, désactivée

**Drapeau** : `VITE_ACHAT_EN_LIGNE=on` (Cloudflare Pages → Settings → Variables, puis redéployer). Lu dans `apps/web/src/config/fonctionnalites.ts`. Désactivé : le panier affiche « Commander et payer en ligne — bientôt disponible » ; `/materiaux/commande` montre le récapitulatif et renvoie vers la demande de prix gratuite.

**Modèle de données** : `apps/web/src/domain/materiaux/achat.ts` (types `Commande`, `LigneCommande`, `StatutCommande`, transitions, calcul des totaux et de la commission) ; SQL `docs/prix/sql/achat-en-ligne.sql` (à ne créer qu'au lancement).

### Cycle de vie d'une commande

```
BROUILLON ──► DEVIS_CONFIRME ──► PAIEMENT_EN_COURS ──► PAYEE ──► EN_PREPARATION ──► EXPEDIEE ──► LIVREE ──► CLOTUREE
    │               │                    │                │             │                         │
    └──► ANNULEE ◄──┴────────────────────┘                ├──► REMBOURSEE ◄┘                       └──► LITIGE ──► CLOTUREE | REMBOURSEE
```

- **BROUILLON** : panier converti ; prix de référence indicatifs.
- **DEVIS_CONFIRME** : le fournisseur confirme prix, stock, frais et délai de livraison (réponse à la demande de prix, table `ReponsePrix`).
- **PAYEE** : fonds reçus par le **prestataire de paiement agréé**, jamais sur un compte de la société pour le compte du fournisseur.
- **LIVREE** : bon de livraison signé (photo jointe : `livraison.preuve`).
- **CLOTUREE** : fonds reversés au fournisseur, commission prélevée (paiement scindé).
- Commission = `commissionPct` × total HT des marchandises (hors livraison), figée à la commande. Valeur par défaut : `ParametrePlateforme.commissionPctDefaut` (4 % à l'installation ; le modèle économique retient 3,5 %, fourchette 3-5 %) ; valeur propre au fournisseur : `Fournisseur.commissionPct` (réglable dans `/cc/fournisseurs`).

### Ce qu'il reste à coder au lancement

1. Pages Functions `POST /api/commandes` (depuis une `ReponsePrix` acceptée), `GET /api/commandes/:jeton` (suivi client par lien secret, comme `/rdv/<jeton>`), `PATCH /api/cercles/espace/commandes/:id` (fournisseur : préparation, expédition), `/api/cc/commandes` (back-office, litiges).
2. Intégration du prestataire : création de la session de paiement, **webhook signé** (`PAYEE`), remboursement ; aucun numéro de carte ne transite par CITURBAREA.
3. Notifications (e-mail / WhatsApp) à chaque changement de statut.
4. Facturation : facture du fournisseur au client ; facture de commission de HSE DECO au fournisseur.

## 4. Ce qu'il faut réunir avant d'activer (hors code)

| Sujet | Décision / action | Référence |
|---|---|---|
| **Entité** | HSE DECO (SARL) facture abonnements et commissions ; le cabinet d'architecte ne facture que ses honoraires | modèle économique, mise à jour du 13/10/2026 |
| **Contrat fournisseur** | Contrat de référencement + mandat de commission (3-5 %) + clause anti-contournement proportionnée, sans exclusivité ; engagement sur les délais et la qualité | modèle économique c.3 ; loi 104-12 |
| **Compte marchand** | TPE virtuel **CMI** ou **NAPS** au nom de la société (cartes marocaines et étrangères pour les MRE). Stripe n'est pas le socle au Maroc | modèle économique (paiement en ligne) |
| **Fonds de tiers** | Ne pas détenir l'argent des fournisseurs : soit le client paie le fournisseur directement et la commission est facturée chaque mois (phase 1 du modèle), soit un **établissement de paiement agréé BAM** avec paiement scindé (marketplace) | modèle économique c.3 |
| **Séquestre** | Pas de cadre « séquestre marketplace » identifié : conservation des fonds jusqu'à la livraison uniquement via l'établissement de paiement agréé (ou compte séquestre bancaire pour les gros montants) | modèle économique c.3 |
| **CGV** | CGV vente à distance (loi 31-08 : identification du vendeur, rétractation 7 jours pour les consommateurs, remboursement sous 15 jours), CGV pros, conditions de livraison et de retour | loi 31-08 |
| **TVA** | Prix affichés HT et TTC (20 %) ; trancher le régime HT/TTC des négoces (point ouvert) avant d'encaisser | référentiel.ts `regimeFiscal` |
| **Données personnelles** | Déclaration CNDP des traitements commandes et livraisons | loi 09-08 |
| **Logistique** | Livraison par le fournisseur (frais dans le devis) ; preuve de livraison ; procédure de litige | — |

## 5. Garde-fous déjà en place

- Aucun prix sans source (test `materiautheque.test.ts`) ; fiabilité A/B/C affichée ; hypothèses jamais publiées.
- Médiane fournisseurs publiée à partir de 3 fournisseurs distincts seulement ; fiches périmées (> 120 jours ou validité dépassée) exclues.
- Données structurées **Dataset**, jamais `Product`/`Offer` : CITURBAREA n'est pas vendeur tant que la phase 2 n'est pas active.
- Pas de `CREATE TABLE` dans les Functions : tables absentes → réponse dégradée propre.

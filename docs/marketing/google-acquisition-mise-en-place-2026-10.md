# Google : référencement, mesure du trafic et conversions — mise en place

*12 octobre 2026. Le code est prêt. Il reste à créer les comptes Google et à coller leurs identifiants dans Cloudflare.*

## Ce que le site fait déjà (sans rien configurer)

- **Provenance de chaque visiteur** (`apps/web/src/lib/attribution.ts`) :
  - canaux reconnus : Google Ads, Google recherche, YouTube, Bing, Facebook, Instagram, TikTok, WhatsApp, assistants IA, autres sites, direct ;
  - le **gclid** (identifiant de clic Google Ads) est gardé 90 jours.
- **Chaque lead porte son canal** (colonne `utm` de la table Lead) :
  - dans le back-office, fiche du lead → ligne « Canal » (campagne, mot-clé, « clic Google Ads ✓ ») ;
  - dans le back-office, Leads → panneau « Visiteurs », tableau **Canal d'acquisition** : visiteurs, formulaires commencés, leads, taux visiteur → lead, leads qualifiés.
- **Mesure maison** (table FunnelEvent, sans cookie tiers) : pages vues, formulaires commencés ou abandonnés, pays.
- **Référencement** :
  - robots.txt et 7 sitemaps en ligne (vérifiés le 12/10/2026) ;
  - données structurées (Organization, WebSite, VideoObject, pages /chiffrage et terrains) ;
  - noindex sur admin.citurbarea.com et *.pages.dev.

## Étape 1 — Faire reconnaître le site par Google (15 min)

1. Ouvrir https://search.google.com/search-console → **Ajouter une propriété** → **Domaine** → `citurbarea.com`.
2. Google donne un enregistrement **TXT**. Le copier.
3. Ouvrir Cloudflare → `citurbarea.com` → **DNS** → **Add record**. Type `TXT`, nom `@`, valeur = le texte copié. Enregistrer, puis cliquer **Valider** dans Search Console.
   - *Variante sans DNS* : propriété « Préfixe d'URL », méthode « Balise HTML ». Copier seulement la valeur `content="…"` dans la variable Cloudflare `GOOGLE_SITE_VERIFICATION` (étape 4). La balise est servie sans recompilation.
4. Search Console → **Sitemaps**. Soumettre un par un :
   - `sitemap.xml`
   - `sitemap-services.xml`
   - `sitemap-portes.xml`
   - `sitemap-villes.xml`
   - `sitemap-guides.xml`
   - `sitemap-hubs.xml`
   - `sitemap-terrains.xml`
5. **Inspection d'URL** → demander l'indexation de `https://citurbarea.com/`, `/chiffrage` et `/p4/terrains`.
6. Ouvrir https://www.bing.com/webmasters → **Importer depuis Google Search Console**. Cela couvre aussi Bing, Yahoo, DuckDuckGo et ChatGPT Search.
   - *Variante* : la variable `BING_SITE_VERIFICATION`.
7. Créer la **fiche Google Business Profile** (« Architecte », adresse du cabinet, site citurbarea.com, numéro WhatsApp). C'est elle qui apparaît sur Maps et dans « architecte Kénitra ».

## Étape 2 — Mesurer le trafic (10 min)

1. **Tout de suite, sans cookie** : Cloudflare → Workers & Pages → `citurbarea` → **Metrics** → **Web Analytics** → Enable.
2. Créer **Google Analytics 4** sur https://analytics.google.com :
   - Créer → compte « CITURBAREA » → propriété « citurbarea.com », fuseau Maroc, devise MAD ;
   - flux **Web** `https://citurbarea.com` ;
   - copier l'**ID de mesure** `G-XXXXXXXXXX`.
3. Dans GA4 → Admin → Événements, marquer **`generate_lead`** comme **événement clé**. C'est envoyé automatiquement à chaque lead, toutes portes confondues.

## Étape 3 — Google Ads : le vrai canal d'acquisition (20 min)

1. Créer le compte sur https://ads.google.com en **mode expert**. Ne pas créer de campagne dans l'assistant.
2. Objectifs → Conversions → **Nouvelle action de conversion** → **Site web** → saisie manuelle :
   - **« Lead formulaire »** :
     - catégorie « Envoyer un formulaire pour prospects », action **Principale** ;
     - comptabilisation « Une » ;
     - valeur : *hypothèse* 300 MAD, ajustable une fois connu le taux de signature ;
     - activer les **conversions améliorées** (méthode « Balise Google »).
   - **« Contact WhatsApp »** : catégorie « Contact », action **Secondaire**.
   - **« Dépôt de terrain »** (facultatif) : action **Secondaire**.
   - Pour chaque action, Google affiche `send_to: 'AW-123456789/AbCdEf…'` :
     - la partie `AW-…` est l'**ID Ads** ;
     - la partie après `/` est le **libellé**.
3. Objectifs → Conversions → **Importer** → « Importation de clics » → créer deux actions :
   - **« Lead qualifié »** (Principale) ;
   - **« Client signé »** (Principale, valeur = honoraires réels).
   - Les noms doivent être **exactement** ceux-là.
4. Lier GA4 et Google Ads : GA4 → Admin → Associations Google Ads.

## Étape 4 — Coller les identifiants dans Cloudflare puis redéployer

Ouvrir Cloudflare → Workers & Pages → `citurbarea` → Settings → **Variables and secrets** (Production) :

| Variable | Valeur | Rôle |
|---|---|---|
| `VITE_GA4_ID` | `G-XXXXXXXXXX` | Trafic, sources, pages |
| `VITE_GADS_ID` | `AW-123456789` | Balise Google Ads |
| `VITE_GADS_LEAD` | libellé « Lead formulaire » | Conversion principale |
| `VITE_GADS_WHATSAPP` | libellé « Contact WhatsApp » | Conversion secondaire |
| `VITE_GADS_TERRAIN` | libellé « Dépôt de terrain » | Facultatif |
| `GOOGLE_SITE_VERIFICATION` | jeton (si pas de DNS) | Search Console |
| `BING_SITE_VERIFICATION` | jeton (si pas d'import) | Bing |

**Important :**
- les variables `VITE_…` sont lues **à la compilation**. Il faut donc relancer un déploiement : Deployments → … → Retry deployment, ou un nouveau push ;
- ne **pas** renseigner aussi `VITE_GTM_ID` avec GA4 configuré dans GTM, sinon le trafic est compté deux fois.

## Étape 5 — Chaque semaine : dire à Google quels leads sont de vrais clients

1. Dans le back-office, passer chaque lead au bon statut : **Qualifié**, puis **Gagné** à la signature.
2. Leads → panneau Visiteurs → cliquer **Export conversions Google Ads (CSV)**.
3. Dans Google Ads → Conversions → Importer → **Importer un fichier**, choisir le CSV. Le fichier ne contient que gclid et dates, aucune donnée personnelle.

Pourquoi c'est décisif : sans cet import, Google optimise sur « formulaires envoyés », curieux compris. Avec l'import, il apprend quels mots-clés et quelles audiences donnent des **clients signés**. Après environ 30 leads qualifiés, passer la campagne en enchères « Maximiser les conversions » avec l'action « Lead qualifié ».

## Consentement (déjà en place)

- **Google Consent Mode v2**, mode avancé.
- **Visiteurs UE, Royaume-Uni, Suisse** : tout est refusé jusqu'à leur accord. Google modélise alors les conversions manquantes.
- **Maroc et reste du monde** : accordé par défaut. Le bandeau permet de refuser.
- Le bandeau n'apparaît **que si** un identifiant Google ou Meta est configuré.
- **Conversions améliorées** : e-mail et téléphone hachés SHA-256 **dans le navigateur**, seulement après accord. La page `/confidentialite.html` est mise à jour, avec un bouton « Modifier mon choix ».

## Lecture des résultats

| Question | Où regarder |
|---|---|
| Google connaît-il mes pages ? | Search Console → Pages (indexées / exclues) |
| Sur quels mots me trouve-t-on ? | Search Console → Performances → Requêtes |
| Combien de visiteurs, d'où ? | GA4 → Acquisition, ou Cloudflare Web Analytics |
| Quel canal donne des leads ? | Back-office → Leads → Canal d'acquisition |
| Combien coûte un lead / un client ? | Google Ads → Conversions (Lead formulaire / Client signé) |

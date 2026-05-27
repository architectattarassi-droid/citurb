# INTEGRATION — Module Permis de Construire (Tome 2)

Module wizard 5 étapes pour préparer un dossier PC complet prêt à soumettre
à la mairie (ou via Rokhas).

---

## 1. Wiring backend — `apps/api/src/app.module.ts`

Ajouter l'import et l'enregistrement dans `imports`:

```ts
import { PermisConstruireModule } from "./modules/permis-construire/permis-construire.module";

@Module({
  imports: [
    // … modules existants
    PermisConstruireModule,
  ],
})
export class AppModule {}
```

Position recommandée : juste après `SousPhaseModule` dans le bloc "Non-tome
modules" — le module est en Tome 2 mais expose un préfixe REST autonome.

---

## 2. MutationGate — `apps/api/src/common/guards/mutation-gate.guard.ts`

Ajouter dans le tableau `allow`:

```ts
"/api/permis-construire",   // Wizard PC (Tome 2) — mutations JWT-gated
```

Position : aux côtés de `/api/pv-chantier` et `/api/pv-commission`.

---

## 3. Routes front — `apps/web/src/tomes/tome1/router/routes.tsx`

Ajouter l'import et la route :

```tsx
import PcWizardPage from "../../../features/permis-construire/PcWizardPage";

// Dans la liste des routes :
{
  path: "/permis-construire/:dossierId",
  element: <PcWizardPage />,
},
```

(JWT requis pour les mutations — la route reste accessible sans login en
lecture seule, le wizard affichera une erreur si non authentifié au moment
de la première mutation).

---

## 4. i18n — `apps/web/src/i18n/i18n.tsx`

Clés sous le préfixe `pc.*` (à ajouter dans le `DICT`) :

```ts
"pc.title":             { fr: "Permis de construire", ar: "رخصة البناء", en: "Building permit" },
"pc.step.identification": { fr: "Identification", ar: "تعريف المشروع", en: "Identification" },
"pc.step.pieces":       { fr: "Pièces", ar: "الوثائق", en: "Documents" },
"pc.step.formulaires":  { fr: "Formulaires", ar: "النماذج", en: "Forms" },
"pc.step.review":       { fr: "Vérification", ar: "المراجعة", en: "Review" },
"pc.step.soumission":   { fr: "Soumission", ar: "الإيداع", en: "Submission" },
"pc.cta.next":          { fr: "Suivant", ar: "التالي", en: "Next" },
"pc.cta.prev":          { fr: "Précédent", ar: "السابق", en: "Previous" },
"pc.upload":            { fr: "Téléverser", ar: "تحميل", en: "Upload" },
"pc.replace":           { fr: "Remplacer", ar: "استبدال", en: "Replace" },
"pc.master.compile":    { fr: "Compiler le PDF master", ar: "تجميع الملف الرئيسي", en: "Compile master PDF" },
"pc.submit.self":       { fr: "Je soumets moi-même", ar: "أقوم بالإيداع بنفسي", en: "I submit it myself" },
"pc.submit.rokhas":     { fr: "Soumettre via Rokhas", ar: "الإيداع عبر روخص", en: "Submit via Rokhas" },
"pc.submit.mandated":   { fr: "Mandater un architecte CITURBAREA", ar: "تكليف مهندس معماري", en: "Mandate a CITURBAREA architect" },
```

Les composants actuels utilisent du texte FR inline (mobile-first, sans
dépendance i18n) — la transposition aux clés ci-dessus peut être faite plus
tard sans casser le wizard.

---

## 5. Dépendances

**Backend** : aucune nouvelle dépendance npm requise.
- `crypto` (natif Node) → hash SHA-256
- `fs/promises` + `path` (natif Node) → stockage fichiers
- Prisma déjà présent (utilise `Dossier.payload` JSON, pas de migration)

**PDF** : **Pas de Puppeteer** — stratégie HTML imprimable.
- Le master et les formulaires sont produits en HTML A4 stylé `@media print`.
- L'utilisateur fait **Fichier → Imprimer → Enregistrer en PDF** depuis son navigateur.
- Migration future vers Puppeteer-core ou Playwright PDF possible sans
  changer l'API publique (juste remplacer la sortie `text/html` par
  `application/pdf` dans le controller).

**Frontend** : aucune nouvelle dépendance. Réutilise `apiFetch` du Tome 4.

---

## 6. Variables d'environnement

Optionnel :

```env
# Racine disque pour les fichiers uploadés (défaut: apps/api/storage/permis-construire)
PC_STORAGE_ROOT=/data/permis-construire
```

---

## 7. Vérification post-intégration

```bash
# 1. Build API
npm --prefix apps/api run build

# 2. Build Web
npm --prefix apps/web run build

# 3. Smoke endpoints (avec JWT valide)
curl -X POST http://localhost:4000/api/permis-construire/dossier/<ID>/init \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"projectType":"VILLA","commune":"Casablanca","surfaceTerrainM2":500}'

curl http://localhost:4000/api/permis-construire/dossier/<ID>
```

---

## 8. Structure stockage disque

```
apps/api/storage/permis-construire/
└── <dossierId>/
    ├── pieces/
    │   ├── DEMANDE_OFFICIELLE_<ts>_<name>.pdf
    │   └── CIN_MO_<ts>_<name>.jpg
    ├── formulaires/
    │   ├── DEMANDE_AUTORISATION.html
    │   └── ENGAGEMENT_ARCHITECTE.html
    ├── master/
    │   ├── master.html
    │   └── attestation.html
    └── attestation/
        └── attestation_<reference>.html
```

---

## 9. Référentiel pièces

`apps/api/data/permis-construire/pieces-requises.json`

- `commonPieces` : 11 pièces standards (tous projets)
- `byProjectType` : 8 types projet × pièces additionnelles
- `communeOverrides` : Casablanca, Rabat, Marrakech (extensible)

Editable manuellement par l'équipe métier — rechargé au prochain restart API
(cache lazy).

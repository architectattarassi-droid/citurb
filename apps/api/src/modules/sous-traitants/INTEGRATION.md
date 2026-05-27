# Module Sous-Traitants — Intégration (Tome 3 / P3 MOD délégué)

## Statut MVP

**Pas de modèle Prisma** au MVP. Stockage `JSON in Dossier.payload.sousTraitants[]`.

Pattern identique à `pv-chantier` : la migration future ne change pas l'API.

## Périmètre fonctionnel

Le chef de chantier (P3 MOD délégué) et le maître d'ouvrage peuvent :

1. **Assigner** un sous-traitant à un lot TPHI (1-25)
2. **Contractualiser** (génération + signature contrat loi 32-99)
3. **Suivre** les situations travaux (avancement + photos géolocalisées)
4. **Payer** par escrow déclenché à la validation chef chantier
5. **Évaluer** post-mission (4 dimensions × 5 étoiles → score L7 P6)
6. **Auditer** la conformité loi 32-99 (déclaration, agrément, contrat)

## Intégration AppModule

Ajouter dans `apps/api/src/app.module.ts` :

```ts
import { SousTraitantsModule } from "./modules/sous-traitants/sous-traitants.module";

@Module({
  imports: [
    // … existant
    SousTraitantsModule,
  ],
})
export class AppModule {}
```

## Intégration Tome 3

L'import logique est `tome3` (déclaré via `@Tome("tome3")` sur le controller).
Module physique inscrit sous `apps/api/src/modules/` (cohérent avec
`sous-phase`, `messagerie`, etc.).

Si une future agrégation veut le pousser dans le scope `Tome3Module`, ajouter
dans `apps/api/src/tomes/tome-3/tome-3.module.ts` :

```ts
import { SousTraitantsModule } from "../../modules/sous-traitants/sous-traitants.module";

@Module({
  imports: [P3Module, SousTraitantsModule],
  exports: [Tome3Service, P3Module, SousTraitantsModule],
})
export class Tome3Module {}
```

## MutationGate (allow-list)

Ajouter dans `apps/api/src/common/guards/mutation-gate.guard.ts` (tableau `allow`) :

```ts
"/api/sous-traitants", // Sous-traitants P3 (Tome 3) — assign + contrat + situations + évaluations
```

## Endpoints (mount `/api/sous-traitants`)

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/catalog/lots` | Référentiel LOTS TPHI 1-25 |
| GET | `/dossier/:dossierId` | Liste sous-traitants assignés |
| POST | `/dossier/:dossierId/assign` | Assigne `{lotCode, supplierUserId, montantHt, conditions}` |
| GET | `/:assignmentId` | Détail assignation |
| POST | `/:assignmentId/contrat` | Génère contrat loi 32-99 (HTML imprimable) |
| POST | `/:assignmentId/contrat/sign` | Signature électronique `{dataUrl}` (base64) |
| POST | `/:assignmentId/situation` | Sous-traitant déclare `{pctAvancement, photos[]}` |
| POST | `/:assignmentId/situation/:sitId/valider` | Chef chantier valide → trigger paiement |
| POST | `/:assignmentId/situation/:sitId/rejeter` | Chef chantier rejette `{motif}` |
| POST | `/:assignmentId/evaluation` | Notation `{qualite, delai, communication, relation, commentaire}` |
| GET | `/:assignmentId/historique` | Timeline (assignation, contrat, situations, paiements, éval) |
| GET | `/dossier/:dossierId/audit-loi-32-99` | Audit conformité loi 32-99 |

## Routes front

Ajouter dans `apps/web/src/tomes/tome1/router/routes.tsx` (children PrivateLayout) :

```tsx
import SousTraitantsPage from "../../../features/sous-traitants/SousTraitantsPage";

{ path: "/chantier/:dossierId/sous-traitants", element: <SousTraitantsPage /> },
```

## Clés i18n `st.*`

À ajouter dans `apps/web/src/i18n/i18n.tsx` (DICT) :

```ts
"st.title":              { fr: "Sous-traitants", ar: "المقاولون من الباطن", en: "Subcontractors" },
"st.assign":             { fr: "Assigner",       ar: "تعيين",              en: "Assign" },
"st.lot":                { fr: "Lot",            ar: "الصنف",              en: "Lot" },
"st.cabinet":            { fr: "Cabinet",        ar: "الشركة",             en: "Firm" },
"st.amount":             { fr: "Montant HT",     ar: "المبلغ بدون ضريبة",  en: "Amount excl. VAT" },
"st.status":             { fr: "Statut",         ar: "الحالة",             en: "Status" },
"st.contract":           { fr: "Contrat",        ar: "العقد",              en: "Contract" },
"st.contract.generate":  { fr: "Générer contrat",ar: "إنشاء العقد",        en: "Generate contract" },
"st.contract.sign":      { fr: "Signer",         ar: "توقيع",              en: "Sign" },
"st.situation.declare":  { fr: "Déclarer situation", ar: "تصريح بالحالة", en: "Declare progress" },
"st.situation.validate": { fr: "Valider",        ar: "تأكيد",              en: "Validate" },
"st.situation.reject":   { fr: "Rejeter",        ar: "رفض",                en: "Reject" },
"st.pct":                { fr: "Avancement",     ar: "التقدم",             en: "Progress" },
"st.evaluate":           { fr: "Évaluer",        ar: "تقييم",              en: "Evaluate" },
"st.rating.quality":     { fr: "Qualité",        ar: "الجودة",             en: "Quality" },
"st.rating.delay":       { fr: "Délai",          ar: "المدة",              en: "Delay" },
"st.rating.communication": { fr: "Communication", ar: "التواصل",          en: "Communication" },
"st.rating.relation":    { fr: "Relation",       ar: "العلاقة",            en: "Relationship" },
"st.audit.loi3299":      { fr: "Audit loi 32-99",ar: "تدقيق القانون 32-99",en: "Law 32-99 audit" },
"st.audit.conforme":     { fr: "Conforme",       ar: "مطابق",              en: "Compliant" },
"st.audit.anomalies":    { fr: "Anomalies",      ar: "حالات شاذة",         en: "Anomalies" },
"st.audit.non_conforme": { fr: "Non conforme",   ar: "غير مطابق",          en: "Non-compliant" },
"st.status.PROPOSED":    { fr: "Proposé",        ar: "مقترح",              en: "Proposed" },
"st.status.CONTRACTED":  { fr: "Contracté",      ar: "متعاقد",             en: "Contracted" },
"st.status.IN_PROGRESS": { fr: "En cours",       ar: "قيد التنفيذ",        en: "In progress" },
"st.status.COMPLETED":   { fr: "Terminé",        ar: "منتهي",              en: "Completed" },
"st.status.TERMINATED":  { fr: "Résilié",        ar: "ملغي",               en: "Terminated" },
```

## Conformité loi 32-99

- **Art. 3** : contrat écrit obligatoire — `signContrat` requis avant
  `IN_PROGRESS` (audit `CONTRAT_NON_SIGNE` sinon).
- **Art. 4** : déclaration au MO obligatoire si montant ≥ 250 000 MAD HT
  (audit `ST_UNDECLARED`).
- **Art. 6-7** : paiement échelonné par situation, paiement direct possible
  si MO ne paie pas l'entrepreneur dans 30 jours. Trace via `paymentRef`
  (audit `PAIEMENT_DIRECT_NON_TRACE` si vide).
- **Lots à agrément** : LOT-02, LOT-03, LOT-04, LOT-06, LOT-11, LOT-12,
  LOT-14, LOT-15 (audit `AGREMENT_MISSING` si aucun agrément).

## Probative log

Append-only sur :
- `ST_ASSIGNED` (création assignation)
- `ST_CONTRAT_SIGNED` (signature contrat avec hash)
- `ST_SITUATION_VALIDATED` (validation + paiement)
- `ST_EVALUATED` (notation post-mission + bonus L7 calculé)

Chaque entrée est chaînée SHA-256 (doctrine T@-R-TRACE-001).

## Migration Prisma (future)

```prisma
model SousTraitantAssignment {
  id                String   @id @default(cuid())
  dossierId         String   @index
  lotCode           String
  lotIntitule       String
  lotNumero         Int
  supplierUserId    String?  @index
  supplierCabinet   String
  supplierEmail     String?
  supplierPhone     String?
  supplierClasse    String?
  supplierAgrements String[] @default([])
  montantHt         Float
  tva               Float    @default(20)
  montantTtc        Float
  devise            String   @default("MAD")
  conditions        Json
  contratPdfUrl     String?
  contratHash       String?
  contratSignedAt   DateTime?
  contratSignedBy   String?
  status            String   @default("PROPOSED")
  loi32_99_declared Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdBy         String?
  situations        SousTraitantSituation[]
  evaluation        SousTraitantEvaluation?

  @@index([dossierId, status])
  @@index([supplierUserId, status])
  @@unique([dossierId, lotCode])
}

model SousTraitantSituation {
  id              String  @id @default(cuid())
  assignmentId    String  @index
  declaredAt      DateTime
  declaredBy      String
  pctAvancement   Float
  pctIncrement    Float
  montantPaiement Float
  photos          Json
  commentaire     String?
  validatedAt     DateTime?
  validatedBy     String?
  rejetMotif      String?
  paidAt          DateTime?
  paymentRef      String?
  assignment      SousTraitantAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
}

model SousTraitantEvaluation {
  id            String @id @default(cuid())
  assignmentId  String @unique
  qualite       Float
  delai         Float
  communication Float
  relation      Float
  scoreMoyen    Float
  commentaire   String?
  evaluatedAt   DateTime
  evaluatedBy   String
  assignment    SousTraitantAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
}
```

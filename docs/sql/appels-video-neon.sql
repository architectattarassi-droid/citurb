-- Appels vidéo sur demande (accord de toutes les parties) — tables Neon.
-- À coller dans console.neon.tech → projet citurbarea → branche production →
-- SQL Editor → Run. Idempotent (IF NOT EXISTS) : peut être relancé sans risque.
-- Logique : functions/_lib/appels.ts ; contrat : docs/architecture/contrat-appels-video.md.

CREATE TABLE IF NOT EXISTS "DemandeAppel" (
    "id" TEXT NOT NULL,
    -- dossier | chantier | reunion | cercles | fournisseur | rdv
    "contexte" TEXT NOT NULL,
    "objetId" TEXT NOT NULL,
    -- Identité stable du demandeur : admin:cabinet, frn:<id>, usr:<id>, membre:<id>, rdv:<id>, vis:<empreinte>
    "demandeurCle" TEXT NOT NULL,
    -- EN_ATTENTE | CONFIRMEE | REFUSEE | ANNULEE | EXPIREE | TERMINEE
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    -- Rempli seulement à la confirmation (tous d'accord sur ce créneau), instant UTC.
    "creneauRetenu" TIMESTAMPTZ(3),
    "expireLe" TIMESTAMPTZ(3) NOT NULL,
    -- Clés des participants (listes « mes appels », débit anti-harcèlement).
    "cles" TEXT[] NOT NULL DEFAULT '{}',
    -- Empreintes SHA-256 des liens personnels : les liens ne sont jamais stockés.
    "jetons" TEXT[] NOT NULL DEFAULT '{}',
    -- Demande complète : participants (statut, créneaux acceptés, coordonnées réservées au back-office),
    -- créneaux proposés, message (coordonnées masquées), salle (créée à la confirmation), historique horodaté.
    "donnees" JSONB NOT NULL,
    -- Écriture optimiste : deux réponses simultanées ne s'écrasent pas.
    "version" INTEGER NOT NULL DEFAULT 1,
    "rappelEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeAppel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DemandeAppel_demandeur_idx" ON "DemandeAppel"("demandeurCle", "createdAt");
CREATE INDEX IF NOT EXISTS "DemandeAppel_statut_idx" ON "DemandeAppel"("statut", "creneauRetenu");
CREATE INDEX IF NOT EXISTS "DemandeAppel_cles_idx" ON "DemandeAppel" USING GIN ("cles");
CREATE INDEX IF NOT EXISTS "DemandeAppel_jetons_idx" ON "DemandeAppel" USING GIN ("jetons");

-- « Ne plus recevoir de demandes de cette personne » (posé par le destinataire).
CREATE TABLE IF NOT EXISTS "BlocageAppel" (
    "destinataireCle" TEXT NOT NULL,
    "demandeurCle" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlocageAppel_pkey" PRIMARY KEY ("destinataireCle", "demandeurCle")
);

-- Vérification (doit renvoyer deux lignes) :
SELECT table_name FROM information_schema.tables WHERE table_name IN ('DemandeAppel', 'BlocageAppel');

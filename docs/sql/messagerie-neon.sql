-- Messagerie de la plateforme (tout passe par CITURBAREA) — tables Neon.
-- PRÉREQUIS : docs/sql/appels-video-neon.sql (table "BlocageAppel", partagée :
-- bloquer une personne bloque ses messages ET ses demandes d'appel).
-- À coller dans console.neon.tech → projet citurbarea → branche production →
-- SQL Editor → Run. Idempotent (IF NOT EXISTS).
-- Logique : functions/_lib/messagerie.ts ; contrat : docs/architecture/contrat-messagerie.md.

CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    -- dossier | chantier | reunion | cercles | fournisseur | rdv
    "contexte" TEXT NOT NULL,
    "objetId" TEXT NOT NULL,
    -- OUVERTE | FERMEE | SIGNALEE
    "statut" TEXT NOT NULL DEFAULT 'OUVERTE',
    -- contexte|objetId|clés triées : un seul fil ouvert par groupe de personnes et par sujet
    "empreinte" TEXT NOT NULL,
    "createurCle" TEXT NOT NULL,
    -- Clés des participants (boîtes de réception) et empreintes SHA-256 des liens personnels
    "cles" TEXT[] NOT NULL DEFAULT '{}',
    "jetons" TEXT[] NOT NULL DEFAULT '{}',
    -- Fil complet : participants (coordonnées réservées au back-office et aux notifications), lu jusqu'à, signalements
    "donnees" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "dernierMessageLe" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Conversation_empreinte_idx" ON "Conversation"("empreinte");
CREATE INDEX IF NOT EXISTS "Conversation_createur_idx" ON "Conversation"("createurCle", "createdAt");
CREATE INDEX IF NOT EXISTS "Conversation_statut_idx" ON "Conversation"("statut", "dernierMessageLe");
CREATE INDEX IF NOT EXISTS "Conversation_cles_idx" ON "Conversation" USING GIN ("cles");
CREATE INDEX IF NOT EXISTS "Conversation_jetons_idx" ON "Conversation" USING GIN ("jetons");

CREATE TABLE IF NOT EXISTS "MessageConversation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    -- Participant auteur, ou « systeme » (étapes d'un appel vidéo)
    "auteurId" TEXT NOT NULL,
    "auteurCle" TEXT NOT NULL,
    -- TEXTE | APPEL | SYSTEME
    "type" TEXT NOT NULL DEFAULT 'TEXTE',
    -- Texte déjà masqué (e-mails, numéros, liens, messageries, pseudos)
    "texte" TEXT NOT NULL DEFAULT '',
    "masque" BOOLEAN NOT NULL DEFAULT false,
    -- APPEL : appelId, evenement, creneau, dureeMin, participants ; documents (étape 2) : références
    "meta" JSONB NOT NULL DEFAULT '{}',
    -- Retiré par la modération (jamais supprimé)
    "modere" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageConversation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MessageConversation_conversation_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "MessageConversation_fil_idx" ON "MessageConversation"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "MessageConversation_auteur_idx" ON "MessageConversation"("auteurCle", "createdAt");

-- Vérification (doit renvoyer trois lignes, BlocageAppel compris) :
SELECT table_name FROM information_schema.tables WHERE table_name IN ('Conversation', 'MessageConversation', 'BlocageAppel');

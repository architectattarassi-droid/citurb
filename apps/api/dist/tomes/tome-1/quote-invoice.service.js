"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteInvoiceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../tome-at/kernel/prisma/prisma.service");
let QuoteInvoiceService = class QuoteInvoiceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ─────────────────────────────────────────────────────────────
    //  Document numbering — séquentiel par type et par année
    // ─────────────────────────────────────────────────────────────
    async getOrAssignNumero(dossierId, type) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id: dossierId }, select: { payload: true },
        });
        const payload = dossier.payload && typeof dossier.payload === "object" ? { ...dossier.payload } : {};
        const key = type === "QUOTE" ? "quoteRef" : "invoiceRef";
        if (payload[key])
            return payload[key];
        const year = new Date().getFullYear();
        const prefix = type === "QUOTE" ? "DEV" : "FAC";
        // Compte les dossiers ayant déjà un quoteRef/invoiceRef pour cette année
        const allDossiers = await this.prisma.dossier.findMany({
            select: { payload: true },
        });
        const yearPrefix = `${prefix}-${year}-`;
        let max = 0;
        for (const d of allDossiers) {
            const ref = d.payload?.[key];
            if (typeof ref === "string" && ref.startsWith(yearPrefix)) {
                const n = parseInt(ref.slice(yearPrefix.length), 10);
                if (Number.isFinite(n) && n > max)
                    max = n;
            }
        }
        const next = `${yearPrefix}${String(max + 1).padStart(4, "0")}`;
        payload[key] = next;
        await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });
        return next;
    }
    // ─────────────────────────────────────────────────────────────
    //  HTML rendering
    // ─────────────────────────────────────────────────────────────
    async renderHtml(dossierId, params) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id: dossierId },
        });
        const numero = params.documentNumero || (await this.getOrAssignNumero(dossierId, params.type));
        const emisLe = params.emisLe || new Date();
        const echeance = params.echeanceLe || this.defaultEcheance(emisLe, params.type);
        const payload = dossier.payload || {};
        const brief = payload.brief || {};
        const quote = brief.quoteSnapshot || payload.quoteSnapshot || {};
        const lignes = this.buildLignes(dossier.porteType ?? "P2", brief, quote);
        const tvaPct = Number(process.env.CIT_TVA_PERCENT ?? 20);
        let totalHT = lignes.reduce((s, l) => s + l.totalHT, 0);
        // Si quote contient déjà un total HT, on le respecte (au cas où arrondi/ratio spéciaux)
        if (typeof quote?.honoraires?.totalHT === "number")
            totalHT = quote.honoraires.totalHT;
        else if (typeof quote?.amounts?.totalHT === "number")
            totalHT = quote.amounts.totalHT;
        const tva = Math.round(totalHT * (tvaPct / 100));
        const totalTTC = totalHT + tva;
        const atelier = {
            nom: process.env.ATELIER_NOM || "CITURBAREA",
            raisonSociale: process.env.ATELIER_RAISON_SOCIALE || "Atelier d'architecture CITURBAREA",
            ice: process.env.ATELIER_ICE || "—",
            rc: process.env.ATELIER_RC || "—",
            if: process.env.ATELIER_IF || "—",
            patente: process.env.ATELIER_PATENTE || "—",
            cnss: process.env.ATELIER_CNSS || "—",
            adresse: process.env.ATELIER_ADRESSE || "Maroc",
            tel: process.env.ATELIER_TEL || "—",
            email: process.env.ATELIER_EMAIL || "contact@citurbarea.ma",
            iban: process.env.ATELIER_IBAN || "—",
            banque: process.env.ATELIER_BANQUE || "—",
            ...(params.atelier || {}),
        };
        return this.shell({
            type: params.type,
            numero,
            emisLe,
            echeance,
            atelier,
            dossier,
            lignes,
            totalHT,
            tva,
            tvaPct,
            totalTTC,
            paiementStatut: params.paiementStatut,
            paiementMethode: params.paiementMethode,
            paiementRef: params.paiementRef,
            notes: params.notes,
        });
    }
    /**
     * Passe 2 — Rend en HTML imprimable une row Devis PERSISTÉE (model Devis),
     * par opposition à renderHtml() qui rend depuis payload.quoteSnapshot.
     * Réutilise le même template premium (shell). Lignes = devis.lignes JSON.
     */
    async renderDevisRowHtml(devisId) {
        const devis = await this.prisma.devis.findUniqueOrThrow({
            where: { id: devisId },
            include: { dossier: true },
        });
        const rawLignes = Array.isArray(devis.lignes) ? devis.lignes : [];
        const lignes = rawLignes.map((l) => {
            const quantite = Number(l?.quantite ?? 1);
            const prixUnitaire = Number(l?.prixUnitaire ?? 0);
            return {
                designation: String(l?.designation ?? "Prestation"),
                quantite,
                unite: String(l?.unite ?? "U"),
                prixUnitaire,
                totalHT: quantite * prixUnitaire,
            };
        });
        const atelier = {
            nom: process.env.ATELIER_NOM || "CITURBAREA",
            raisonSociale: process.env.ATELIER_RAISON_SOCIALE || "Atelier d'architecture CITURBAREA",
            ice: process.env.ATELIER_ICE || "—",
            rc: process.env.ATELIER_RC || "—",
            if: process.env.ATELIER_IF || "—",
            patente: process.env.ATELIER_PATENTE || "—",
            cnss: process.env.ATELIER_CNSS || "—",
            adresse: process.env.ATELIER_ADRESSE || "Maroc",
            tel: process.env.ATELIER_TEL || "—",
            email: process.env.ATELIER_EMAIL || "contact@citurbarea.ma",
            iban: process.env.ATELIER_IBAN || "—",
            banque: process.env.ATELIER_BANQUE || "—",
        };
        const emisLe = devis.dateEmission ?? new Date();
        // Devis autonome : pas de dossier → coordonnées client depuis clientInfo
        // (mêmes clés que les champs Dossier lus par shell()).
        const client = devis.dossier ?? (devis.clientInfo ?? {});
        return this.shell({
            type: "QUOTE",
            numero: devis.numero,
            emisLe,
            echeance: devis.dateValidite ?? this.defaultEcheance(emisLe, "QUOTE"),
            atelier,
            dossier: client,
            lignes,
            totalHT: devis.montantHT,
            tva: devis.montantTTC - devis.montantHT,
            tvaPct: devis.tva,
            totalTTC: devis.montantTTC,
        });
    }
    /**
     * Chaque devis "libre" crée un DOSSIER BROUILLON en phase 0 « devis »
     * (status DRAFT, phase '00_DEVIS'), puis y attache le devis. Le dossier porte
     * les coordonnées client (clientInfo) ; il apparaît dans la liste dossiers
     * comme brouillon et pourra être promu en vrai dossier ensuite.
     */
    async createDevisLibre(emetteurId, input) {
        const lignes = Array.isArray(input.lignes) ? input.lignes : [];
        const ht = lignes.reduce((s, l) => s + (Number(l?.quantite) || 0) * (Number(l?.prixUnitaire) || 0), 0);
        const tva = input.tva ?? 20;
        const ci = input.clientInfo ?? {};
        // 1. Dossier brouillon — phase 0 « devis »
        const dossier = await this.prisma.dossier.create({
            data: {
                ownerId: emetteurId,
                title: input.titre || `Devis — ${ci.raisonSociale || ci.clientNom || "client"}`,
                status: "DRAFT",
                phase: "00_DEVIS",
                porteType: input.porteType || "P1",
                raisonSociale: ci.raisonSociale ?? null,
                clientNom: ci.clientNom ?? null,
                representant: ci.representant ?? null,
                ice: ci.ice ?? null,
                rc: ci.rc ?? null,
                clientTel: ci.clientTel ?? null,
                clientEmail: ci.clientEmail ?? null,
                commune: ci.commune ?? null,
                address: ci.address ?? null,
                payload: { devisDraft: true },
            },
        });
        // 2. Devis attaché au dossier brouillon
        const numero = `DEV-${dossier.id.slice(-6).toUpperCase()}-001`;
        const devis = await this.prisma.devis.create({
            data: {
                dossierId: dossier.id,
                clientInfo: input.clientInfo ?? null,
                phaseRef: "00_DEVIS",
                numero,
                titre: input.titre,
                lignes,
                montantHT: ht,
                tva,
                montantTTC: ht * (1 + tva / 100),
                conditions: input.conditions ?? null,
                emetteurId,
            },
        });
        return { ...devis, dossier };
    }
    /** Liste les devis "libres" = ceux dont le dossier est un brouillon phase 0 devis. */
    async listDevisLibre() {
        return this.prisma.devis.findMany({
            where: { dossier: { phase: "00_DEVIS" } },
            orderBy: { createdAt: "desc" },
            include: { dossier: { select: { id: true, status: true, phase: true } } },
        });
    }
    // ─────────────────────────────────────────────────────────────
    //  Construction des lignes selon la porte
    // ─────────────────────────────────────────────────────────────
    buildLignes(porteType, brief, quote) {
        const honoraires = quote?.honoraires || {};
        const meta = quote?.meta || {};
        const base = quote?.base || {};
        switch (String(porteType).toUpperCase()) {
            case "P1": {
                const pack = quote?.pack || brief?.packId || "—";
                const surface = brief?.surfacePlancherM2 || meta.surfacePlancherM2 || base?.surfacePlancherM2 || 0;
                const totalHT = Number(honoraires.totalHT ?? quote?.amounts?.totalHT ?? 0);
                return [{
                        designation: `Pack ${pack} — Conception architecturale (P1)\nSurface plancher ${surface} m²`,
                        quantite: 1, unite: "Forfait",
                        prixUnitaire: totalHT, totalHT,
                    }];
            }
            case "P2": {
                const section = brief?.sectionP2 || "—";
                const cat = brief?.categoryLabel || brief?.categoryCode || "—";
                const surface = brief?.surfacePlancherM2 || 0;
                const surfaceTerrainHa = brief?.surfaceTerrainHa;
                const totalHT = Number(honoraires.totalHT ?? quote?.amounts?.totalHT ?? 0);
                const designation = section === "LOT"
                    ? `Honoraires Lotissement — ${cat}\nSurface terrain ${surfaceTerrainHa} ha`
                    : `Honoraires CNOA — Section ${section} · ${cat}\nSurface plancher ${surface} m²`;
                return [{ designation, quantite: 1, unite: "Forfait", prixUnitaire: totalHT, totalHT }];
            }
            case "P3": {
                const section = brief?.section || "—";
                const cat = brief?.categoryLabel || brief?.categoryCode || "—";
                const surface = brief?.surfacePlancherM2 || 0;
                const corps = (brief?.corpsMetiers || []).length;
                const totalHT = Number(honoraires.totalHT ?? quote?.amounts?.totalHT ?? 0);
                return [{
                        designation: `MOD — Maîtrise d'Ouvrage Déléguée (10% du coût de réalisation)\nSection ${section} · ${cat} · ${surface} m² · ${corps} corps de métier coordonnés`,
                        quantite: 1, unite: "Forfait", prixUnitaire: totalHT, totalHT,
                    }];
            }
            case "P4": {
                const pack = brief?.packLabel || brief?.pack || "—";
                const titre = brief?.titreFoncierNum || "—";
                const prixVente = brief?.prixVenteFoncierDH || 0;
                const totalHT = Number(honoraires.totalHT ?? quote?.amounts?.totalHT ?? 0);
                return [{
                        designation: `Analyse foncière — Pack ${pack}\nTitre foncier ${titre} · prix vente cible ${prixVente.toLocaleString("fr-MA")} DH`,
                        quantite: 1, unite: "Forfait", prixUnitaire: totalHT, totalHT,
                    }];
            }
            case "P5": {
                const reportLabel = brief?.reportLabel || brief?.reportType || "—";
                const slot = brief?.surfaceSlot || "—";
                const delai = brief?.delayMode || "—";
                const totalHT = Number(honoraires.totalHT ?? quote?.amounts?.totalHT ?? 0);
                return [{
                        designation: `Rapport ${reportLabel}\nTranche surface ${slot} · délai ${delai}`,
                        quantite: 1, unite: "Forfait", prixUnitaire: totalHT, totalHT,
                    }];
            }
            case "P6": {
                const p6Type = brief?.p6Type || "—";
                const totalHT = Number(honoraires.totalHT ?? quote?.amounts?.totalHT ?? 0);
                return [{
                        designation: `Adhésion réseau prestataires CITURBAREA — ${p6Type}\nFrais d'enregistrement et qualification`,
                        quantite: 1, unite: "Forfait", prixUnitaire: totalHT, totalHT,
                    }];
            }
            default: {
                const totalHT = Number(honoraires.totalHT ?? quote?.amounts?.totalHT ?? 0);
                return [{ designation: "Prestation CITURBAREA", quantite: 1, unite: "Forfait", prixUnitaire: totalHT, totalHT }];
            }
        }
    }
    defaultEcheance(emisLe, type) {
        const d = new Date(emisLe);
        // Devis : valable 30 jours · Facture : 30 jours d'échéance
        d.setDate(d.getDate() + 30);
        return d;
    }
    // ─────────────────────────────────────────────────────────────
    //  Template HTML (atelier premium ivoire/navy/or)
    // ─────────────────────────────────────────────────────────────
    shell(d) {
        const isQuote = d.type === "QUOTE";
        const docLabel = isQuote ? "DEVIS" : "FACTURE";
        const fmtDate = (date) => date.toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" });
        const fmtMAD = (n) => n.toLocaleString("fr-MA") + " DH";
        const clientLabel = d.dossier.raisonSociale || d.dossier.clientNom || "Client";
        const clientLines = [];
        if (d.dossier.raisonSociale)
            clientLines.push(`<strong>${esc(d.dossier.raisonSociale)}</strong>`);
        if (d.dossier.clientNom)
            clientLines.push(esc(d.dossier.clientNom));
        if (d.dossier.representant)
            clientLines.push(`Représentant : ${esc(d.dossier.representant)}`);
        if (d.dossier.address || d.dossier.commune)
            clientLines.push(esc([d.dossier.address, d.dossier.commune].filter(Boolean).join(" — ")));
        if (d.dossier.ice)
            clientLines.push(`ICE : ${esc(d.dossier.ice)}`);
        if (d.dossier.rc)
            clientLines.push(`RC : ${esc(d.dossier.rc)}`);
        if (d.dossier.clientTel)
            clientLines.push(`Tél : ${esc(d.dossier.clientTel)}`);
        if (d.dossier.clientEmail)
            clientLines.push(`Email : ${esc(d.dossier.clientEmail)}`);
        const stamp = !isQuote && d.paiementStatut
            ? `<div class="stamp ${d.paiementStatut === "PAYEE" ? "stamp-paid" : "stamp-unpaid"}">${d.paiementStatut === "PAYEE" ? "PAYÉE" : d.paiementStatut === "PARTIELLE" ? "PARTIELLE" : "À RÉGLER"}</div>`
            : "";
        const watermark = isQuote ? `<div class="watermark">DEVIS</div>` : "";
        return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>${docLabel} ${esc(d.numero)} — CITURBAREA</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif; color: #1A1F2E; background: #FAF7F2; font-size: 12.5px; line-height: 1.5; }
  .doc { max-width: 820px; margin: 0 auto; padding: 32px 36px; background: #FFFFFF; box-shadow: 0 4px 16px rgba(15,42,74,0.05); position: relative; overflow: hidden; }
  .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-22deg); font-family: 'Playfair Display', Georgia, serif; font-size: 180px; font-weight: 700; color: rgba(176, 141, 87, 0.07); pointer-events: none; letter-spacing: 0.08em; z-index: 0; }
  .stamp { position: absolute; top: 90px; right: 36px; transform: rotate(8deg); padding: 8px 28px; border: 4px double currentColor; font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; letter-spacing: 0.10em; }
  .stamp-paid { color: #6B7F5C; }
  .stamp-unpaid { color: #B8633F; }

  header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 2px solid #0F2A4A; position: relative; z-index: 1; }
  .brand { display: flex; flex-direction: column; gap: 2px; }
  .brand-name { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; color: #0F2A4A; letter-spacing: -0.02em; line-height: 1; }
  .brand-tag { font-size: 10px; color: #B08D57; letter-spacing: 0.20em; text-transform: uppercase; font-weight: 600; margin-top: 4px; }
  .brand-meta { font-size: 10.5px; color: #5C6373; margin-top: 10px; line-height: 1.55; }

  .doc-meta { text-align: right; }
  .doc-type { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; color: #0F2A4A; letter-spacing: 0.04em; line-height: 1; }
  .doc-numero { font-family: 'Inter', monospace; font-size: 16px; color: #B08D57; margin-top: 8px; letter-spacing: 0.04em; font-weight: 600; }
  .doc-date { font-size: 11px; color: #5C6373; margin-top: 6px; font-style: italic; }

  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 26px 0 20px; position: relative; z-index: 1; }
  .party { padding: 16px 18px; background: #FAF7F2; border-left: 3px solid #B08D57; border-radius: 0 6px 6px 0; }
  .party-eyebrow { font-size: 9.5px; color: #B08D57; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
  .party-body { font-size: 12px; color: #1A1F2E; line-height: 1.65; }
  .party-body strong { font-size: 13px; color: #0F2A4A; }

  table.lignes { width: 100%; border-collapse: collapse; margin: 18px 0 6px; position: relative; z-index: 1; }
  table.lignes th { font-family: 'Playfair Display', serif; font-size: 10.5px; color: #0F2A4A; text-transform: uppercase; letter-spacing: 0.16em; padding: 10px 12px; text-align: left; border-bottom: 2px solid #0F2A4A; }
  table.lignes th.num { text-align: right; }
  table.lignes td { padding: 14px 12px; border-bottom: 1px solid #E8E2D5; vertical-align: top; }
  table.lignes td.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.lignes .desc { font-size: 12.5px; color: #1A1F2E; }
  table.lignes .desc-small { font-size: 11px; color: #5C6373; margin-top: 3px; white-space: pre-line; }

  .totals { margin-left: auto; width: 280px; margin-top: 14px; position: relative; z-index: 1; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12.5px; }
  .totals .row.sub { border-bottom: 1px dotted #E8E2D5; }
  .totals .row.total { border-top: 2px solid #0F2A4A; padding-top: 10px; margin-top: 8px; font-family: 'Playfair Display', serif; font-size: 18px; color: #0F2A4A; font-weight: 600; }

  .legal { margin-top: 30px; padding-top: 18px; border-top: 1px solid #E8E2D5; font-size: 10.5px; color: #5C6373; line-height: 1.6; position: relative; z-index: 1; }
  .legal strong { color: #1A1F2E; }
  .legal .row { padding: 3px 0; }

  .signatures { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; position: relative; z-index: 1; }
  .sig-box { padding: 14px 16px; border: 1px dashed #B08D57; border-radius: 4px; min-height: 110px; }
  .sig-eyebrow { font-size: 9.5px; color: #B08D57; letter-spacing: 0.20em; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
  .sig-name { font-family: 'Playfair Display', serif; font-size: 13px; color: #0F2A4A; }

  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E8E2D5; font-size: 9.5px; color: #8B91A1; text-align: center; letter-spacing: 0.04em; line-height: 1.5; }

  @media print {
    body { background: #FFFFFF; }
    .doc { box-shadow: none; padding: 0; max-width: 100%; }
    .no-print { display: none !important; }
  }
  .toolbar { position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; z-index: 10; }
  .toolbar button { padding: 8px 14px; background: #0F2A4A; color: #FAF7F2; border: 0; border-radius: 4px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; letter-spacing: 0.04em; }
</style>
</head>
<body>
<div class="toolbar no-print">
  <button onclick="window.print()">🖨 Imprimer</button>
</div>
<div class="doc">
  ${watermark}
  ${stamp}

  <header>
    <div class="brand">
      <div class="brand-name">${esc(d.atelier.raisonSociale || d.atelier.nom || "CITURBAREA")}</div>
      <div class="brand-tag">Atelier d'architecture & d'urbanisme</div>
      <div class="brand-meta">
        ${d.atelier.adresse ? esc(d.atelier.adresse) + "<br/>" : ""}
        ${d.atelier.tel ? "Tél : " + esc(d.atelier.tel) + " · " : ""}${d.atelier.email ? esc(d.atelier.email) : ""}<br/>
        ICE : ${esc(d.atelier.ice || "—")} · RC : ${esc(d.atelier.rc || "—")} · IF : ${esc(d.atelier.if || "—")}
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-type">${docLabel}</div>
      <div class="doc-numero">N° ${esc(d.numero)}</div>
      <div class="doc-date">Émis le ${fmtDate(d.emisLe)}</div>
      <div class="doc-date">${isQuote ? "Valable jusqu'au" : "Échéance"} ${fmtDate(d.echeance)}</div>
    </div>
  </header>

  <section class="parties">
    <div class="party">
      <div class="party-eyebrow">Émetteur</div>
      <div class="party-body">
        <strong>${esc(d.atelier.raisonSociale || d.atelier.nom || "CITURBAREA")}</strong><br/>
        ${d.atelier.adresse ? esc(d.atelier.adresse) + "<br/>" : ""}
        ICE ${esc(d.atelier.ice || "—")} · RC ${esc(d.atelier.rc || "—")}<br/>
        Patente ${esc(d.atelier.patente || "—")} · CNSS ${esc(d.atelier.cnss || "—")}
      </div>
    </div>
    <div class="party">
      <div class="party-eyebrow">${isQuote ? "Adressé à" : "Facturé à"}</div>
      <div class="party-body">
        ${clientLines.join("<br/>")}
      </div>
    </div>
  </section>

  <table class="lignes">
    <thead>
      <tr>
        <th style="width: 60%;">Désignation</th>
        <th class="num" style="width: 8%;">Qté</th>
        <th style="width: 12%;">Unité</th>
        <th class="num" style="width: 10%;">PU HT</th>
        <th class="num" style="width: 12%;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${d.lignes.map(l => {
            const [head, ...rest] = l.designation.split("\n");
            const sub = rest.length ? `<div class="desc-small">${esc(rest.join("\n"))}</div>` : "";
            return `<tr>
          <td><div class="desc">${esc(head)}</div>${sub}</td>
          <td class="num">${l.quantite}</td>
          <td>${esc(l.unite)}</td>
          <td class="num">${fmtMAD(l.prixUnitaire)}</td>
          <td class="num">${fmtMAD(l.totalHT)}</td>
        </tr>`;
        }).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="row sub"><span>Total HT</span><span>${fmtMAD(d.totalHT)}</span></div>
    <div class="row sub"><span>TVA ${d.tvaPct}%</span><span>${fmtMAD(d.tva)}</span></div>
    <div class="row total"><span>Total TTC</span><span>${fmtMAD(d.totalTTC)}</span></div>
  </div>

  <section class="legal">
    ${isQuote ? `
      <div class="row"><strong>Conditions :</strong> ce devis est valable 30 jours à compter de la date d'émission. Sa signature vaut bon de commande.</div>
      <div class="row"><strong>Modalités de règlement :</strong> 40 % à la signature, 30 % à validation APD, 30 % à dépôt autorisations.</div>
      <div class="row"><strong>Paiement :</strong> par virement sur compte ${esc(d.atelier.banque || "—")} · IBAN ${esc(d.atelier.iban || "—")}, ou via la plateforme CITURBAREA (Stripe sécurisé).</div>
    ` : `
      <div class="row"><strong>Modalités de règlement :</strong> par virement sur compte ${esc(d.atelier.banque || "—")} · IBAN ${esc(d.atelier.iban || "—")}, ou via la plateforme CITURBAREA.</div>
      ${d.paiementMethode ? `<div class="row"><strong>Méthode :</strong> ${esc(d.paiementMethode)}</div>` : ""}
      ${d.paiementRef ? `<div class="row"><strong>Référence :</strong> <code>${esc(d.paiementRef)}</code></div>` : ""}
      <div class="row"><strong>Pénalités de retard :</strong> en cas de défaut de paiement à l'échéance, des pénalités à 3 fois le taux légal seront appliquées (loi 49-15).</div>
    `}
    ${d.notes ? `<div class="row" style="margin-top:8px;"><strong>Note :</strong> ${esc(d.notes)}</div>` : ""}
  </section>

  ${isQuote ? `
    <section class="signatures">
      <div class="sig-box">
        <div class="sig-eyebrow">L'atelier</div>
        <div class="sig-name">${esc(d.atelier.nom || "CITURBAREA")}</div>
        <div style="font-size:11px; color:#5C6373; margin-top:8px; font-style:italic;">Cachet et signature</div>
      </div>
      <div class="sig-box">
        <div class="sig-eyebrow">Le client</div>
        <div class="sig-name">${esc(clientLabel)}</div>
        <div style="font-size:11px; color:#5C6373; margin-top:8px; font-style:italic;">« Bon pour accord » + signature</div>
      </div>
    </section>
  ` : ""}

  <footer>
    ${esc(d.atelier.raisonSociale || d.atelier.nom || "CITURBAREA")} ·
    ICE ${esc(d.atelier.ice || "—")} · RC ${esc(d.atelier.rc || "—")} ·
    Document généré automatiquement par la plateforme CITURBAREA
  </footer>
</div>
</body>
</html>`;
    }
};
exports.QuoteInvoiceService = QuoteInvoiceService;
exports.QuoteInvoiceService = QuoteInvoiceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuoteInvoiceService);
function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c] || c);
}

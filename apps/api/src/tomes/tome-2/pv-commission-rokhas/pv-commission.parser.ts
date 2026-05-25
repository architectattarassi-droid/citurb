/**
 * Tome 2 — PV Commission Rokhas — Parser
 *
 * Extracteur PDF → JSON structuré.
 *
 * Stratégie :
 *  1. Si `pdf-parse` est installé, on l'utilise pour extraire le texte brut.
 *  2. Sinon, fallback heuristique : on lit le PDF binaire et on essaie
 *     d'extraire les chaînes ASCII/Latin imprimables (extracteur naïf,
 *     suffisant pour les PDFs Rokhas qui contiennent souvent une couche
 *     texte non-compressée).
 *  3. Le texte extrait est ensuite passé dans une batterie de regex
 *     spécifiques au format des PVs Rokhas.
 *
 * Si l'extraction texte échoue (PDF scanné sans OCR), on retourne une
 * structure vide avec `parsingConfidence: 0`. L'UI bascule alors en
 * mode "édition manuelle" pour saisie humaine.
 */
import { Injectable, Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import type {
  DecisionCommission,
  ParsedPv,
  PvMotifRefus,
  PvReserveInput,
  ReserveSeverite,
} from "./pv-commission.types";

const PARSER_VERSION = "rokhas-pv-parser/1.0.0";

@Injectable()
export class PvCommissionParser {
  private readonly logger = new Logger(PvCommissionParser.name);

  /**
   * Parse un PDF stocké sur disque en JSON structuré.
   */
  async parseFile(filePath: string): Promise<ParsedPv> {
    let text = "";
    try {
      text = await this.extractText(filePath);
    } catch (e: any) {
      this.logger.warn(`[Parser] extractText failed: ${e?.message}`);
      text = "";
    }

    if (!text || text.trim().length < 50) {
      // PDF probablement scanné → fallback "édition manuelle"
      return this.emptyParsed("");
    }

    return this.parseText(text);
  }

  /**
   * Parse une chaîne de texte (utile pour saisie manuelle / tests).
   */
  parseText(text: string): ParsedPv {
    const clean = this.normalizeText(text);

    const decision = this.detectDecision(clean);
    const dateCommission = this.extractDateCommission(clean);
    const communeName = this.extractCommune(clean);
    const rokhasReference = this.extractRokhasRef(clean);
    const numDossier = this.extractNumDossier(clean);
    const presents = this.extractPresents(clean);
    const motifsRefus = decision === "DEFAVORABLE" ? this.extractMotifsRefus(clean) : [];
    const reserves = this.extractReserves(clean);
    const delaiLegalReponseDays = this.detectDelaiLegal(clean);

    const confidence = this.computeConfidence({
      hasDecision: decision !== null,
      hasDate: !!dateCommission,
      hasCommune: !!communeName,
      hasReserves: reserves.length > 0,
      textLen: clean.length,
    });

    return {
      rokhasReference,
      numDossier,
      dateCommission,
      communeName,
      presents,
      decision: decision ?? "AJOURNE",
      motifsRefus,
      reserves,
      delaiLegalReponseDays,
      rawText: text.slice(0, 10000), // limite stockage
      parserVersion: PARSER_VERSION,
      parsingConfidence: confidence,
    };
  }

  // ── EXTRACTION TEXTE ──────────────────────────────────────────────────────

  private async extractText(filePath: string): Promise<string> {
    // 1) Essai pdf-parse
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require("pdf-parse");
      const buf = await fs.readFile(filePath);
      const result = await pdfParse(buf);
      if (result?.text) return String(result.text);
    } catch {
      // pdf-parse non installé → fallback
    }

    // 2) Fallback heuristique : strings imprimables depuis le binaire
    const buf = await fs.readFile(filePath);
    return this.naivePdfStrings(buf);
  }

  /**
   * Extracteur naïf : récupère les chaînes ASCII/Latin de longueur >= 4
   * du PDF binaire. Marche sur les PDFs non compressés (couche texte
   * directement lisible). N'a pas vocation à remplacer un vrai OCR.
   */
  private naivePdfStrings(buf: Buffer): string {
    const out: string[] = [];
    let current = "";
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      // ASCII imprimable + tab/newline + Latin1 0xA0-0xFF
      if ((b >= 0x20 && b <= 0x7e) || b === 0x09 || b === 0x0a || (b >= 0xa0 && b <= 0xff)) {
        current += String.fromCharCode(b);
      } else {
        if (current.length >= 4) out.push(current);
        current = "";
      }
    }
    if (current.length >= 4) out.push(current);
    return out.join("\n");
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, ""); // strip accents pour matcher "réserve"/"reserve"
  }

  // ── HEURISTIQUES MÉTIER ───────────────────────────────────────────────────

  private detectDecision(text: string): DecisionCommission | null {
    if (/\bdefavorable\b/i.test(text) || /\brefus[ée]?\b/i.test(text)) return "DEFAVORABLE";
    if (/favorable\s+(?:avec|sous)\s+reserves?/i.test(text)) return "FAVORABLE_AVEC_RESERVES";
    if (/\breserves?\s+n[°o]\s*1\b/i.test(text) && /favorable/i.test(text)) return "FAVORABLE_AVEC_RESERVES";
    if (/\bajourn[ée]?\b/i.test(text) || /report[ée]?\s+(?:a|à)\s+la\s+prochaine/i.test(text)) return "AJOURNE";
    if (/\bfavorable\b/i.test(text)) return "FAVORABLE";
    return null;
  }

  private extractDateCommission(text: string): string | null {
    // Format DD/MM/YYYY ou DD-MM-YYYY
    const re = /(?:date\s+de\s+(?:la\s+)?commission|reunion[a-z]*\s+du|tenue\s+le)\s*[:\-]?\s*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i;
    const m = text.match(re);
    if (m) {
      const [, d, mo, y] = m;
      const year = y.length === 2 ? `20${y}` : y;
      return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    // Recherche large d'une date plausible si rien trouvé
    const any = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/);
    if (any) {
      const [, d, mo, y] = any;
      return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return null;
  }

  private extractCommune(text: string): string | undefined {
    const m = text.match(/commune\s+(?:de|d')\s+([a-z\- ]{3,40})/i);
    if (m) return m[1].trim().replace(/\s+/g, " ");
    return undefined;
  }

  private extractRokhasRef(text: string): string | undefined {
    const m =
      text.match(/(?:ref(?:erence)?|reference\s+rokhas)\s*[:\-]?\s*([a-z0-9\-\/]{4,30})/i) ||
      text.match(/\brokhas\s*[:\-]?\s*([a-z0-9\-\/]{4,30})/i);
    return m?.[1];
  }

  private extractNumDossier(text: string): string | undefined {
    const m = text.match(/(?:n[°o]\s*(?:de\s+)?dossier|dossier\s+n[°o])\s*[:\-]?\s*([a-z0-9\-\/]{3,30})/i);
    return m?.[1];
  }

  private extractPresents(text: string): string[] {
    // Bloc "Membres présents :" ... jusqu'à blank line ou prochaine section
    const m = text.match(/membres?\s+presents?\s*[:\-]?\s*([^\n]{10,500})/i);
    if (!m) return [];
    return m[1]
      .split(/[,;]\s*|\s+-\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.length < 80)
      .slice(0, 20);
  }

  private extractMotifsRefus(text: string): PvMotifRefus[] {
    const out: PvMotifRefus[] = [];
    const re = /motif\s*n?\s*[°o]?\s*(\d+)\s*[:\-]?\s*([^\n]{10,400})/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const desc = m[2].trim();
      const articleMatch = desc.match(/article\s+([0-9a-z\-\.]{1,20})/i);
      out.push({
        titre: `Motif n°${m[1]}`,
        description: desc.slice(0, 500),
        articleLoi: articleMatch?.[1],
      });
    }
    return out;
  }

  private extractReserves(text: string): PvReserveInput[] {
    const out: PvReserveInput[] = [];
    // Pattern : "réserve n°1 : ..." ou "observation n°1 : ..."
    const re = /(?:reserve|observation)\s*n?\s*[°o]?\s*(\d+)\s*[:\-]?\s*([^\n]{8,400})/gi;
    const seen = new Set<number>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const ordre = Number(m[1]);
      if (seen.has(ordre)) continue;
      seen.add(ordre);
      const desc = m[2].trim();
      const articleMatch = desc.match(/article\s+([0-9a-z\-\.]{1,20})/i);
      out.push({
        ordre,
        titre: `Réserve n°${ordre}`,
        description: desc.slice(0, 500),
        articleLoi: articleMatch?.[1],
        severite: this.guessSeverite(desc),
      });
    }
    return out.sort((a, b) => a.ordre - b.ordre);
  }

  private guessSeverite(desc: string): ReserveSeverite {
    if (/bloqu|imperatif|obligatoirement|sous peine|nullit[ée]/i.test(desc)) return "BLOQUANTE";
    if (/structure|securit[ée]|incendie|stabilit[ée]/i.test(desc)) return "MAJEURE";
    return "MINEURE";
  }

  private detectDelaiLegal(text: string): number {
    // Recherche "délai de N jours" ou "sous N jours"
    const m = text.match(/(?:delai|sous|dans\s+un\s+delai\s+de)\s+(\d{1,3})\s+jours?/i);
    if (m) {
      const d = Number(m[1]);
      if (d > 0 && d <= 365) return d;
    }
    return 60; // standard Rokhas
  }

  private computeConfidence(s: {
    hasDecision: boolean;
    hasDate: boolean;
    hasCommune: boolean;
    hasReserves: boolean;
    textLen: number;
  }): number {
    let score = 0;
    if (s.hasDecision) score += 0.4;
    if (s.hasDate) score += 0.2;
    if (s.hasCommune) score += 0.15;
    if (s.hasReserves) score += 0.15;
    if (s.textLen > 500) score += 0.1;
    return Math.min(1, Number(score.toFixed(2)));
  }

  private emptyParsed(rawText: string): ParsedPv {
    return {
      decision: "AJOURNE",
      motifsRefus: [],
      reserves: [],
      delaiLegalReponseDays: 60,
      rawText,
      parserVersion: PARSER_VERSION,
      parsingConfidence: 0,
      presents: [],
    };
  }
}

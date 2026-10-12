import { describe, expect, it } from "vitest";
import { canalDe } from "./attribution";
import { consentementPrealable, normaliserEmail, normaliserTelephone } from "./marketing";
import { conversionsLead, csvConversions, dateGoogle } from "../../../../functions/api/cc/leads/conversions-google";
import { fusionCanaux } from "../../../../functions/api/cc/funnel";

describe("attribution : canal d'acquisition", () => {
  it("reconnaît Google Ads par le gclid, même sans utm", () => {
    expect(canalDe({ gclid: "abc" })).toBe("google_ads");
    expect(canalDe({ gbraid: "x" })).toBe("google_ads");
    expect(canalDe({ source: "google", medium: "cpc" })).toBe("google_ads");
  });
  it("distingue YouTube payant, YouTube organique et recherche Google", () => {
    expect(canalDe({ gclid: "abc", source: "youtube" })).toBe("youtube");
    expect(canalDe({ referrer: "youtube.com" })).toBe("youtube");
    expect(canalDe({ referrer: "google.co.ma" })).toBe("google_organique");
    expect(canalDe({ referrer: "google.com" })).toBe("google_organique");
  });
  it("réseaux, WhatsApp, IA, direct", () => {
    expect(canalDe({ fbclid: "f" })).toBe("facebook");
    expect(canalDe({ referrer: "l.instagram.com", fbclid: "f" })).toBe("instagram");
    expect(canalDe({ source: "tiktok" })).toBe("tiktok");
    expect(canalDe({ source: "whatsapp" })).toBe("whatsapp");
    expect(canalDe({ referrer: "chatgpt.com" })).toBe("ia");
    expect(canalDe({ referrer: "bing.com" })).toBe("bing");
    expect(canalDe({ referrer: "avito.ma" })).toBe("referent");
    expect(canalDe({})).toBe("direct");
  });
});

describe("conversions améliorées : normalisation Google", () => {
  it("e-mail en minuscules, Gmail sans points", () => {
    expect(normaliserEmail(" Qa.Test@Gmail.com ")).toBe("qatest@gmail.com");
    expect(normaliserEmail("qa-test@example.test")).toBe("qa-test@example.test");
    expect(normaliserEmail("pas-un-email")).toBe("");
  });
  it("téléphone au format E.164", () => {
    expect(normaliserTelephone("06 00 00 00 00")).toBe("+212600000000");
    expect(normaliserTelephone("+212600000000")).toBe("+212600000000");
    expect(normaliserTelephone("0033612345678")).toBe("+33612345678");
  });
  it("consentement préalable en Europe ou pays inconnu, pas au Maroc", () => {
    expect(consentementPrealable("FR")).toBe(true);
    expect(consentementPrealable("GB")).toBe(true);
    expect(consentementPrealable(null)).toBe(true);
    expect(consentementPrealable("MA")).toBe(false);
  });
});

describe("export des conversions hors ligne Google Ads", () => {
  const lead = {
    utm: { canal: "google_ads", gclid: "Cj0KCQ-test" },
    stage: "WON",
    updatedAt: "2026-10-12T10:00:00.000Z",
    events: [
      { kind: "STAGE_CHANGE", at: "2026-10-05T09:00:00.000Z", payload: { to: "QUALIFIED" } },
      { kind: "STAGE_CHANGE", at: "2026-10-10T15:30:00.000Z", payload: { to: "WON" } },
    ],
  };
  it("une ligne par action atteinte, à la date du changement de statut", () => {
    expect(conversionsLead(lead)).toEqual([
      ["Cj0KCQ-test", "Lead qualifié", "2026-10-05 09:00:00+0000", "", "MAD"],
      ["Cj0KCQ-test", "Client signé", "2026-10-10 15:30:00+0000", "", "MAD"],
    ]);
  });
  it("rien sans gclid ; signé sans historique = qualifié + signé", () => {
    expect(conversionsLead({ ...lead, utm: { canal: "direct" } })).toEqual([]);
    const r = conversionsLead({ ...lead, events: [] });
    expect(r.map((x) => x[1]).sort()).toEqual(["Client signé", "Lead qualifié"]);
  });
  it("CSV au modèle Google (en-tête exact)", () => {
    const csv = csvConversions([lead]);
    expect(csv.split("\r\n")[0]).toBe("Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency");
    expect(dateGoogle(new Date("2026-01-02T03:04:05Z"))).toBe("2026-01-02 03:04:05+0000");
  });
});

describe("back-office : visiteurs et leads par canal", () => {
  it("fusionne les deux sources et trie par leads", () => {
    const r = fusionCanaux(
      [{ canal: "direct", sessions: 50, demarres: 5 }, { canal: "google_ads", sessions: 20, demarres: 6 }],
      [{ canal: "google_ads", leads: 4, qualifies: 2, clics_google: 4 }],
    );
    expect(r[0]).toEqual({ canal: "google_ads", sessions: 20, demarres: 6, leads: 4, qualifies: 2, clicsGoogle: 4 });
    expect(r[1].canal).toBe("direct");
  });
});

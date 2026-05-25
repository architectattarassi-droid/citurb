import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiBase, getToken } from "../../../tome4/apiClient";
import { useAuth } from "../../../tome5/AuthProvider";
import MapPicker from "../../../../features/geo/MapPicker";

const P5_PENDING_KEY = "citurbarea:p5:pending_intake:v1";

/**
 * P5Finalize — pont entre la qualification P5 et la création du dossier,
 * + affichage POST-AUTH du panneau zoning urbanistique + référentiels DGI/ANCFCC
 * + fourchette de prix + devis du rapport.
 *
 * DOCTRINE : aucune donnée urbanisme / prix DGI / fourchette ne s'affiche dans
 * P5Home avant la création du compte. Toutes ces informations sont rendues ici
 * après validation email + SMS, conformément à la loi 09-08 (protection des
 * données personnelles) et au pacte de qualité d'expertise CITURBAREA.
 *
 * Symétrique de P2Finalize : un visiteur a rempli la qualification P5 sans
 * être connecté. Le payload est stocké dans localStorage puis il est redirigé
 * vers /creer-compte/client?next=/p5/finalize qui crée son compte avec double
 * validation email + SMS. Une fois loggué, on rejoue l'intake authentifié, on
 * affiche les données protégées, puis on redirige vers son espace dossiers.
 */
export default function P5Finalize() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "submitting" | "done">("loading");
  const [dossierId, setDossierId] = useState<string | null>(null);
  const [payloadState, setPayloadState] = useState<any>(null);

  // POST-AUTH : données urbanisme + prix calculées après création du dossier
  const [autoDetect, setAutoDetect] = useState<any>(null);
  const [dgiCity, setDgiCity] = useState<any>(null);
  const [selectedDgiZone, setSelectedDgiZone] = useState<string>("");
  // Zones DGI géocodées (markers GeoJSON aux centroïdes Nominatim des avenues)
  const [dgiZonesGeo, setDgiZonesGeo] = useState<any>(null);

  // Position GPS courante — initialisée depuis le brief, peut être ajustée
  // visuellement par l'utilisateur sur la carte. Chaque modification re-déclenche
  // l'auto-détection zoning + fourchette de prix.
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const detectAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.isAuthed) {
      navigate("/creer-compte/client?next=/p5/finalize", { replace: true });
      return;
    }
    let raw: string | null = null;
    try { raw = localStorage.getItem(P5_PENDING_KEY); } catch {}
    if (!raw) {
      navigate("/portal", { replace: true });
      return;
    }
    let payload: any = null;
    try { payload = JSON.parse(raw); } catch {}
    if (!payload) {
      try { localStorage.removeItem(P5_PENDING_KEY); } catch {}
      navigate("/p5", { replace: true });
      return;
    }
    payload.clientEmail = auth.email || payload.clientEmail;
    setPayloadState(payload);
    setPhase("submitting");

    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`${apiBase()}/p2/intake`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.message || "Erreur lors de la création du dossier");
        try { localStorage.removeItem(P5_PENDING_KEY); } catch {}
        setDossierId(data.dossierId || null);
        setPhase("done");
      } catch (e: any) {
        setError(e?.message || "Erreur inattendue");
        setPhase("done");
      }
    })();
  }, [auth.loading, auth.isAuthed, auth.email, navigate]);

  // Une fois le dossier créé, on initialise les coords courantes depuis le
  // brief stocké et on charge le catalogue DGI de la ville.
  useEffect(() => {
    if (phase !== "done" || error || !payloadState) return;
    const b = payloadState.brief || {};
    if (b.geoLat != null && b.geoLng != null && Number.isFinite(+b.geoLat) && Number.isFinite(+b.geoLng)) {
      setCurrentCoords({ lat: +b.geoLat, lng: +b.geoLng });
    }
    // Catalogue DGI par ville — 17 villes extraites du PDF officiel DGI 2017
    // (512 zones au total). Pipeline parsing parse-dgi-generic.cjs étendu à
    // toute ville DGI avec convention de codes <PREFIX>-<ARROND>-<N>.
    const c = (payloadState.commune || "").toLowerCase();
    let cityId: string | null = null;
    const cityMatchers: Array<[RegExp, string]> = [
      [/\brabat\b/, "rabat"],
      [/\bcasa(blanca)?\b/, "casablanca"],
      [/\bmarrak[eè]ch\b|\bmarrakesh\b/, "marrakech"],
      [/\btang[ei]r\b/, "tanger"],
      [/\bf[èe]s\b|\bfez\b/, "fes"],
      [/\bagadir\b/, "agadir"],
      [/\bk[eé]nitra\b/, "kenitra"],
      [/\bsal[eé]\b/, "sale"],
      [/\bmekn[eè]s\b/, "meknes"],
      [/\boujda\b/, "oujda"],
      [/\bsettat\b/, "settat"],
      [/\bb[eé]ni\s*mellal\b/, "beni-mellal"],
      [/\bsafi\b/, "safi"],
      [/\bt[eé]touan\b/, "tetouan"],
      [/\bmidelt\b|\ber[\s-]?rich\b/, "midelt"],
      [/\bnador\b/, "nador"],
      [/\bberkane\b/, "berkane"],
    ];
    for (const [re, id] of cityMatchers) { if (re.test(c)) { cityId = id; break; } }
    if (cityId) {
      fetch(`${apiBase()}/api/sig/dgi-zones/${cityId}`)
        .then(r => r.json()).then(d => { if (d?.ok) setDgiCity(d); }).catch(() => {});
      // Zones géocodées (markers GeoJSON) — affiche les emplacements approximatifs
      // des zones DGI sur la carte. Fallback silencieux si pas géocodé pour cette ville.
      fetch(`${apiBase()}/api/sig/dgi-zones-geo/${cityId}.geojson`)
        .then(r => r.ok ? r.json() : null).then(d => { if (d?.features) setDgiZonesGeo(d); }).catch(() => {});
    }
  }, [phase, error, payloadState]);

  // Auto-détection zoning — déclenchée quand les coords ou le brief changent.
  // Si l'utilisateur repositionne le marker sur la carte, on relance la
  // détection immédiatement (avec abort de la requête précédente).
  useEffect(() => {
    if (phase !== "done" || error || !payloadState) return;
    const b = payloadState.brief || {};
    const lat = currentCoords?.lat ?? b.geoLat;
    const lng = currentCoords?.lng ?? b.geoLng;

    const params = new URLSearchParams();
    if (lat != null) params.set("lat", String(lat));
    if (lng != null) params.set("lng", String(lng));
    if (b.region) params.set("region", b.region);
    if (payloadState.commune) params.set("commune", payloadState.commune);
    if (b.adresseBien) params.set("address", b.adresseBien);
    if (b.bienFamily) params.set("bienFamily", b.bienFamily);

    detectAbortRef.current?.abort();
    const ac = new AbortController();
    detectAbortRef.current = ac;
    fetch(`${apiBase()}/api/sig/auto-detect-zone?${params.toString()}`, { signal: ac.signal })
      .then(r => r.json()).then(d => { if (d?.ok) setAutoDetect(d); }).catch(() => {});
  }, [phase, error, payloadState, currentCoords?.lat, currentCoords?.lng]);

  const fmtMAD = (n: number | null | undefined) => {
    if (n == null || !Number.isFinite(Number(n))) return "—";
    return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(Number(n)) + " DH";
  };

  if (phase !== "done") {
    return (
      <div style={S.screen}>
        <div style={S.card}>
          <div style={S.spinner} />
          <h1 style={S.title}>Création de votre dossier P5…</h1>
          <p style={S.sub}>Nous enregistrons votre demande de rapport et préparons votre estimation urbanistique.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.screen}>
        <div style={S.card}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>⚠️</div>
          <h1 style={S.title}>Une erreur est survenue</h1>
          <p style={S.sub}>{error}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18 }}>
            <a href="/p5" style={S.btnDark}>← Reprendre la qualification</a>
            <a href="/portal" style={S.btnGold}>Voir mes dossiers</a>
          </div>
        </div>
      </div>
    );
  }

  // PHASE DONE — affichage post-auth complet (urbanisme + DGI + fourchette)
  const brief = payloadState?.brief || {};
  return (
    <div style={S.wide}>
      <div style={S.container}>
        {/* Confirmation dossier créé */}
        <div style={S.successCard}>
          <div style={{ fontSize: 48 }}>📋</div>
          <h1 style={S.title}>Dossier d'expertise créé</h1>
          <p style={S.sub}>
            Votre demande de <strong>{brief.reportLabel || "rapport"}</strong> est enregistrée.
            Voici votre estimation urbanistique et la fourchette de prix officielle.
          </p>
          {dossierId && (
            <div style={{ fontSize: 12, color: "rgba(11,27,58,0.6)", margin: "10px 0 16px" }}>
              Réf. dossier : {dossierId.slice(0, 12)}…
            </div>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {dossierId && (
              <a href={`/payment/start?dossier=${dossierId}`} style={S.btnGold}>💳 Payer maintenant</a>
            )}
            <a href="/portal" style={S.btnDark}>📁 Mes dossiers</a>
            <a href="/sig" style={{ ...S.btnDark, background: "transparent", border: "1px solid rgba(11,27,58,0.18)", color: "#0B1B3A" }}>🗺 Explorer carte SIG</a>
          </div>
        </div>

        {/* PANNEAU CARTE — validation visuelle de l'emplacement du bien
            Le client peut zoomer/repositionner le marker sur OSM ou imagerie
            satellite ESRI, avec les couches PA AURS (urbanisme) en overlay.
            Chaque repositionnement re-déclenche l'auto-détection zoning + prix. */}
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <div style={S.eyebrow}>Module Localisation · validation visuelle</div>
            <h2 style={S.h2}>🗺 Vérifiez l'emplacement de votre bien sur la carte</h2>
          </div>
          <div style={{ fontSize: 13, color: "rgba(11,27,58,0.72)", lineHeight: 1.6, marginBottom: 14 }}>
            Repositionnez le marker si nécessaire pour valider visuellement la zone d'urbanisme
            et la fourchette de prix. Basemap au choix (OSM / satellite ESRI) et couches
            <strong> PA AURS </strong>(Plan d'Aménagement) en overlay. Chaque déplacement
            recalcule automatiquement le zoning et la fourchette ci-dessous.
          </div>
          <MapPicker
            region={payloadState?.brief?.region || ""}
            province=""
            commune={payloadState?.commune || ""}
            adresse={payloadState?.brief?.adresseBien || ""}
            initialLat={currentCoords?.lat ?? payloadState?.brief?.geoLat}
            initialLng={currentCoords?.lng ?? payloadState?.brief?.geoLng}
            onChange={(c) => { if (c) setCurrentCoords({ lat: c.lat, lng: c.lng }); }}
            height={520}
            showSigLayers={true}
            autoGeocodeAddress
            dgiZonesGeo={dgiZonesGeo}
            selectedDgiZoneCode={selectedDgiZone}
            onDgiZoneClick={(code) => {
              // Click marker DGI sur la carte → active la zone dans le dropdown ci-dessous
              setSelectedDgiZone(code);
              // Scroll vers le détail de la zone (dans le panneau Foncier)
              setTimeout(() => {
                document.getElementById("p5-dgi-zone-detail")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 100);
            }}
          />
          {currentCoords && (
            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(11,27,58,0.65)", fontFamily: "ui-monospace, monospace" }}>
              📍 Position courante : <strong>{currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</strong>
            </div>
          )}
        </div>

        {/* PANNEAU URBANISME — auto-détection zoning depuis PA AURS */}
        {autoDetect && (
          <div style={S.panel}>
            <div style={S.panelHeader}>
              <div style={S.eyebrow}>Module Urbanisme · Plan d'Aménagement</div>
              <h2 style={S.h2}>🏗 Détection automatique du zonage</h2>
            </div>
            <div style={S.detectBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {autoDetect.detected?.source === "aurs_point_in_polygon" && (
                  <span style={{ ...S.badge, background: "rgba(34,197,94,0.15)", color: "#166534" }}>PA AURS</span>
                )}
                {autoDetect.detected?.source === "commune_mapping" && (
                  <span style={{ ...S.badge, background: "rgba(245,158,11,0.15)", color: "#92400e" }}>Mapping commune</span>
                )}
                {autoDetect.detected?.arrondissement && (
                  <strong>Arrondissement : {autoDetect.detected.arrondissement}</strong>
                )}
              </div>
              <div style={S.kvGrid}>
                {autoDetect.detected?.prefecture && (<div><strong>Préfecture :</strong> {autoDetect.detected.prefecture}</div>)}
                {autoDetect.detected?.pa && (<div><strong>PA :</strong> {autoDetect.detected.pa}</div>)}
                {autoDetect.detected?.zoning?.zone && (<div><strong>Zone réglem. :</strong> <code>{autoDetect.detected.zoning.zone}</code></div>)}
                {autoDetect.detected?.zoning?.cos != null && (<div><strong>COS :</strong> {autoDetect.detected.zoning.cos}</div>)}
                {autoDetect.detected?.zoning?.hauteurMax != null && (<div><strong>Hauteur max :</strong> {autoDetect.detected.zoning.hauteurMax} m</div>)}
              </div>
              {autoDetect.detected?.zoning?.definition && (
                <details style={{ marginTop: 10 }}>
                  <summary style={S.summary}>Voir la définition réglementaire de la zone {autoDetect.detected.zoning.zone}</summary>
                  <div style={S.defBox}>{autoDetect.detected.zoning.definition}</div>
                </details>
              )}
              {autoDetect.suggested?.suggestedBienFamily && (
                <div style={S.familySug}>
                  🏗 <strong>Vocation urbanistique :</strong> {autoDetect.suggested.suggestedBienFamily.replace("_", " ").toLowerCase()}
                  {autoDetect.suggested.suggestedBienFamilyReason && (
                    <span style={{ display: "block", fontSize: 11.5, fontStyle: "italic", marginTop: 3 }}>
                      {autoDetect.suggested.suggestedBienFamilyReason}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Fourchette mise en valeur */}
            <div style={S.priceBox}>
              <div style={S.eyebrow}>Fourchette estimée — {(autoDetect.suggested?.bienFamily || "VILLA").toLowerCase().replace("_", " ")}</div>
              <div style={S.priceBig}>
                {fmtMAD(autoDetect.suggested?.priceRangeMinMAD).replace(" DH", "")} – {fmtMAD(autoDetect.suggested?.priceRangeMaxMAD)}/m²
              </div>
              <div style={S.priceSub}>
                Tier : <strong>{autoDetect.suggested?.zoneTier}</strong>
                {autoDetect.suggested?.familyMultiplier !== 1.0 && (
                  <span> · multiplicateur destination ×{autoDetect.suggested.familyMultiplier}</span>
                )}
              </div>
            </div>

            <details style={{ marginTop: 12 }}>
              <summary style={S.summary}>Voir le raisonnement de la détection ({autoDetect.suggested?.reasoning?.length || 0} étapes)</summary>
              <ol style={S.reasoning}>
                {(autoDetect.suggested?.reasoning || []).map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ol>
            </details>

            {/* Sources officielles citées */}
            {(autoDetect.sources?.pa || autoDetect.sources?.dgi || (autoDetect.sources?.agences || []).length > 0) && (
              <div style={S.sources}>
                <strong>📚 Sources officielles :</strong>{" "}
                {autoDetect.sources?.pa && <span>{autoDetect.sources.pa.name} · </span>}
                {autoDetect.sources?.dgi?.fiches?.[0] && (
                  <a href={autoDetect.sources.dgi.fiches[0].url} target="_blank" rel="noopener noreferrer" style={S.link}>
                    Référentiel DGI {autoDetect.sources.dgi.name}
                  </a>
                )}
                {autoDetect.sources?.agences?.[0] && (
                  <> · <a href={autoDetect.sources.agences[0].geoportail} target="_blank" rel="noopener noreferrer" style={S.link}>{autoDetect.sources.agences[0].code} géoportail</a></>
                )}
              </div>
            )}
          </div>
        )}

        {/* PANNEAU FONCIER — référentiel DGI réel par zone (49 zones Rabat) */}
        {dgiCity && (
          <div style={S.panel}>
            <div style={S.panelHeader}>
              <div style={S.eyebrow}>Module Foncier · Référentiel DGI officiel</div>
              <h2 style={S.h2}>📜 Zones DGI {dgiCity._meta.ville} ({dgiCity.zones.length} zones)</h2>
            </div>
            <label style={S.label}>Sélectionnez la zone correspondante à votre bien</label>
            <select value={selectedDgiZone} onChange={(e) => setSelectedDgiZone(e.target.value)} style={S.select}>
              <option value="">— Choisir une zone DGI —</option>
              {dgiCity.arrondissements.map((arr: any) => {
                const arrZones = dgiCity.zones.filter((z: any) => z.arrondissement === arr.nom);
                if (arrZones.length === 0) return null;
                return (
                  <optgroup key={arr.code} label={`Arrondissement ${arr.nom}`}>
                    {arrZones.map((z: any) => (
                      <option key={z.code} value={z.code}>
                        {z.code} — {z.nomCommun || (z.avenues && z.avenues[0]) || z.arrondissement}
                        {z.prix[0]?.pt ? ` · terrain ${z.prix[0].pt.toLocaleString("fr-FR")} DH/m²` : ""}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {selectedDgiZone && (() => {
              const z = dgiCity.zones.find((x: any) => x.code === selectedDgiZone);
              if (!z) return null;
              const ptValues = z.prix.filter((p: any) => p.pt).map((p: any) => p.pt);
              const pcValues = z.prix.filter((p: any) => p.pc).map((p: any) => p.pc);
              const ptMin = ptValues.length ? Math.min(...ptValues) : null;
              const ptMax = ptValues.length ? Math.max(...ptValues) : null;
              const pcMin = pcValues.length ? Math.min(...pcValues) : null;
              const pcMax = pcValues.length ? Math.max(...pcValues) : null;
              // Prix marché 2026 (enrichi par enrichWithMarketCorrection backend)
              const marketMinValues = z.prix.filter((p: any) => p.marketMinPt).map((p: any) => p.marketMinPt);
              const marketMaxValues = z.prix.filter((p: any) => p.marketMaxPt).map((p: any) => p.marketMaxPt);
              const marketMin = marketMinValues.length ? Math.min(...marketMinValues) : null;
              const marketMax = marketMaxValues.length ? Math.max(...marketMaxValues) : null;
              // Zone géocodée (pour bouton "voir sur carte")
              const geoFeature = dgiZonesGeo?.features?.find((f: any) => f.properties?.code === selectedDgiZone);
              return (
                <div style={S.dgiDetail} id="p5-dgi-zone-detail">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                    <div style={{ fontWeight: 800, color: "#1e40af" }}>📜 Zone {z.code} — {z.nomCommun || z.arrondissement}</div>
                    {geoFeature ? (
                      <button
                        type="button"
                        onClick={() => {
                          // Recentre la carte sur la zone (le useEffect du MapPicker
                          // s'occupe du flyTo + agrandissement du cercle)
                          document.querySelector('.maplibregl-canvas, canvas')?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        style={{ padding: "6px 12px", background: "#1e40af", color: "#fff", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        📍 Voir sur la carte
                      </button>
                    ) : (
                      <span style={{ padding: "4px 10px", background: "rgba(11,27,58,0.06)", color: "rgba(11,27,58,0.55)", borderRadius: 4, fontSize: 11, fontStyle: "italic" }}>
                        Zone non géocodée
                      </span>
                    )}
                  </div>
                  {z.delimitations && (
                    <div style={{ fontSize: 12, color: "rgba(11,27,58,0.72)", fontStyle: "italic", marginBottom: 10 }}>
                      <strong>Délimitations :</strong> {z.delimitations}
                    </div>
                  )}
                  {/* PRIX DGI 2017 = référence administrative */}
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#1e40af", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 }}>
                    🏛 Référence administrative DGI 2017
                  </div>
                  <div style={S.dgiPriceGrid}>
                    {ptMin != null && (
                      <div style={S.dgiPriceCard}>
                        <div style={S.dgiPriceLabel}>Terrain DGI 2017</div>
                        <div style={S.dgiPriceValue}>
                          {ptMin === ptMax ? ptMin.toLocaleString("fr-FR") : `${ptMin.toLocaleString("fr-FR")} – ${ptMax!.toLocaleString("fr-FR")}`} DH/m²
                        </div>
                      </div>
                    )}
                    {pcMin != null && (
                      <div style={S.dgiPriceCard}>
                        <div style={S.dgiPriceLabel}>Construction DGI 2017</div>
                        <div style={S.dgiPriceValue}>
                          {pcMin === pcMax ? pcMin.toLocaleString("fr-FR") : `${pcMin.toLocaleString("fr-FR")} – ${pcMax!.toLocaleString("fr-FR")}`} DH/m²
                        </div>
                      </div>
                    )}
                  </div>
                  {/* ESTIMATION MARCHÉ 2026 = reprojection IPAI BAM + facteur marché */}
                  {marketMin != null && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", textTransform: "uppercase" as const, letterSpacing: "0.05em", margin: "12px 0 6px" }}>
                        📈 Estimation marché 2026 (IPAI BAM × facteur marché)
                      </div>
                      <div style={{ ...S.dgiPriceGrid }}>
                        <div style={{ ...S.dgiPriceCard, borderColor: "rgba(34,197,94,0.40)", background: "rgba(34,197,94,0.04)" }}>
                          <div style={{ ...S.dgiPriceLabel, color: "#166534" }}>Fourchette marché terrain</div>
                          <div style={{ ...S.dgiPriceValue, color: "#0B1B3A" }}>
                            {marketMin.toLocaleString("fr-FR")} – {marketMax!.toLocaleString("fr-FR")} DH/m²
                          </div>
                          <div style={{ fontSize: 10.5, color: "rgba(11,27,58,0.55)", marginTop: 3, fontStyle: "italic" }}>
                            DGI 2017 × IPAI BAM (~+5%/8a) × facteur marché 1,3-1,7
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(11,27,58,0.62)", marginTop: 6, lineHeight: 1.55 }}>
                        ⓘ Le marché réel se situe systématiquement <strong>30 à 70 % au-dessus</strong> du référentiel DGI (qui sert au calcul des droits d'enregistrement, sous-évalué volontairement). Cette fourchette est une estimation indicative ; le rapport d'expertise CITURBAREA finalise la valeur après visite + comparables transactions Yakeey/Agenz/Mubawab/notaires.
                      </div>
                    </>
                  )}
                  <details>
                    <summary style={S.summary}>Voir le tableau complet ({z.prix.length} lignes)</summary>
                    <div style={{ overflowX: "auto" }}>
                      <table style={S.table}>
                        <thead><tr><th>Type</th><th>État</th><th>Superficie</th><th>PT</th><th>PC</th></tr></thead>
                        <tbody>
                          {z.prix.map((p: any, i: number) => (
                            <tr key={i}>
                              <td>{p.type}</td>
                              <td>{p.etat || "—"}</td>
                              <td style={{ fontSize: 11 }}>{p.superficie || "—"}</td>
                              <td style={{ textAlign: "right", fontFamily: "monospace" }}>{p.pt || p.prixUnique || "—"}</td>
                              <td style={{ textAlign: "right", fontFamily: "monospace" }}>{p.pc || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                  <div style={S.disclaimer}>
                    ⚠ <strong>Prix DGI = référence administrative</strong> (calcul droits d'enregistrement) qui
                    sous-estime le marché réel de 30 à 70 %. Source :{" "}
                    <a href={dgiCity._meta.sourceUrl} target="_blank" rel="noopener noreferrer" style={S.link}>
                      {dgiCity._meta.source}
                    </a>. Le rapport d'expertise CITURBAREA donne la valeur marché réelle après croisement
                    avec ANCFCC + comparables transactions + visite terrain.
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* CTA bas de page */}
        <div style={S.bottomCta}>
          <div style={{ fontSize: 14, color: "rgba(11,27,58,0.75)", lineHeight: 1.6, marginBottom: 12 }}>
            Votre dossier est désormais identifié dans votre espace. L'équipe vous recontacte
            sous 24 h avec le <strong>devis ferme</strong> et le <strong>lien de paiement sécurisé</strong>.
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {dossierId && (
              <a href={`/payment/start?dossier=${dossierId}`} style={S.btnGold}>💳 Payer maintenant</a>
            )}
            <a href="/portal" style={S.btnDark}>📁 Mes dossiers</a>
          </div>
        </div>
      </div>
    </div>
  );
}

const NAVY = "#0B1B3A";
const GOLD = "#C9A227";

const S: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    padding: "40px 20px",
    background: "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), linear-gradient(180deg, #fff, #f8f4ea)",
  },
  wide: {
    minHeight: "100vh",
    padding: "32px 20px",
    background: "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), linear-gradient(180deg, #fff, #f8f4ea)",
  },
  container: { maxWidth: 920, margin: "0 auto" },
  card: {
    width: "100%", maxWidth: 540, padding: 40, textAlign: "center",
    background: "rgba(255,255,255,0.96)", border: "1px solid rgba(201,162,39,0.25)",
    borderRadius: 20, boxShadow: "0 20px 60px rgba(11,27,58,0.12)",
  },
  successCard: {
    background: "#fff", padding: 32, textAlign: "center",
    border: "1px solid rgba(201,162,39,0.30)", borderRadius: 16,
    boxShadow: "0 14px 42px rgba(11,27,58,0.10)", marginBottom: 24,
  },
  panel: {
    background: "#fff", padding: 24,
    border: "1px solid rgba(11,27,58,0.10)", borderRadius: 14,
    boxShadow: "0 8px 24px rgba(11,27,58,0.06)", marginBottom: 22,
  },
  panelHeader: { marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(11,27,58,0.08)" },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", color: "#C9A227", textTransform: "uppercase", marginBottom: 4 },
  h2: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, color: NAVY, margin: 0 },
  detectBox: { background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.20)", borderLeft: "4px solid #22c55e", borderRadius: 10, padding: "14px 16px", marginBottom: 14 },
  badge: { fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.04em" },
  kvGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, fontSize: 13 },
  summary: { cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "rgba(11,27,58,0.70)" },
  defBox: { marginTop: 6, fontSize: 12, color: "rgba(11,27,58,0.78)", lineHeight: 1.55, padding: "8px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 6 },
  familySug: { marginTop: 10, padding: "10px 14px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.25)", borderLeft: "4px solid #3b82f6", borderRadius: 10, fontSize: 13 },
  priceBox: { background: "linear-gradient(135deg, rgba(201,162,39,0.10), rgba(232,216,166,0.10))", border: "1px solid rgba(201,162,39,0.30)", borderRadius: 12, padding: "14px 18px", marginBottom: 12 },
  priceBig: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 28, fontWeight: 800, color: NAVY, lineHeight: 1.1 },
  priceSub: { fontSize: 12, color: "rgba(11,27,58,0.65)", marginTop: 4 },
  reasoning: { marginTop: 6, paddingLeft: 22, fontSize: 12, color: "rgba(11,27,58,0.75)", lineHeight: 1.65 },
  sources: { marginTop: 12, paddingTop: 10, borderTop: "1px dashed rgba(11,27,58,0.15)", fontSize: 12, color: "rgba(11,27,58,0.72)" },
  label: { display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "rgba(11,27,58,0.75)", marginBottom: 6 },
  select: { width: "100%", padding: "10px 12px", border: "1px solid rgba(11,27,58,0.20)", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fff", color: NAVY },
  dgiDetail: { marginTop: 14, padding: "14px 16px", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.20)", borderLeft: "4px solid #3b82f6", borderRadius: 10 },
  dgiPriceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 10 },
  dgiPriceCard: { background: "#fff", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(11,27,58,0.10)" },
  dgiPriceLabel: { fontSize: 10.5, fontWeight: 800, color: "#1e40af", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  dgiPriceValue: { fontSize: 18, fontWeight: 800, color: NAVY, marginTop: 4 },
  table: { width: "100%", marginTop: 8, fontSize: 12, borderCollapse: "collapse" as const },
  disclaimer: { marginTop: 12, paddingTop: 10, borderTop: "1px dashed rgba(11,27,58,0.15)", fontSize: 11.5, color: "rgba(11,27,58,0.68)", lineHeight: 1.55 },
  bottomCta: {
    background: "#fff", padding: 22, textAlign: "center" as const,
    border: "1px solid rgba(201,162,39,0.30)", borderRadius: 14,
    boxShadow: "0 8px 24px rgba(11,27,58,0.06)",
  },
  spinner: {
    width: 44, height: 44, borderRadius: "50%",
    border: "4px solid rgba(201,162,39,0.2)", borderTopColor: GOLD,
    margin: "0 auto 18px", animation: "p5spin 1s linear infinite",
  },
  title: { fontFamily: '"Playfair Display", serif', fontSize: 26, fontWeight: 700, color: NAVY, margin: "0 0 10px" },
  sub: { fontSize: 14.5, color: "rgba(11,27,58,0.75)", margin: 0, lineHeight: 1.6 },
  btnGold: {
    background: "linear-gradient(135deg, #C9A227, #E6C75B)",
    color: "#fff", padding: "12px 22px", borderRadius: 8,
    fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block",
  },
  btnDark: {
    background: NAVY, color: "#fff", padding: "12px 22px", borderRadius: 8,
    fontWeight: 600, fontSize: 14, textDecoration: "none", display: "inline-block",
  },
  link: { color: NAVY, fontWeight: 700, textDecoration: "underline" as const },
};

if (typeof document !== "undefined" && !document.getElementById("p5-finalize-style")) {
  const s = document.createElement("style");
  s.id = "p5-finalize-style";
  s.textContent = `@keyframes p5spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
    table th, table td { padding: 4px 8px; border-bottom: 1px dashed rgba(11,27,58,0.08); }
    table th { background: rgba(11,27,58,0.05); text-align: left; font-weight: 700; }`;
  document.head.appendChild(s);
}

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import proj4 from "proj4";
import { apiBase } from "../../tomes/tome4/apiClient";

/**
 * Couches SIG disponibles via notre proxy /api/sig/... — proviennent des
 * portails institutionnels (ArcGIS AURS pour le PA Rabat-Salé v1).
 * Toujours servies depuis NOTRE origine (aucune redirection).
 */
type SigLayerDef = {
  source: string; layer: string;
  label: string; geomType: "polygon" | "line" | "point";
  color: string; description?: string;
};
const SIG_LAYERS: SigLayerDef[] = [
  // Découpage administratif national
  { source: "maroc-admin", layer: "0", label: "Régions Maroc (14)",        geomType: "polygon", color: "#0B1B3A", description: "12 régions + 2 régions du Sahara (HCP, réforme 2015)" },
  { source: "maroc-admin", layer: "1", label: "Provinces Maroc (77)",      geomType: "polygon", color: "#C9A227", description: "Provinces et préfectures avec population" },
  { source: "maroc-admin", layer: "2", label: "Communes Maroc (1 505)",    geomType: "polygon", color: "#16a34a", description: "Toutes les communes du Royaume" },
  // PA Rabat-Salé (AURS)
  { source: "aurs", layer: "10", label: "Limite du PA (Rabat-Salé)",   geomType: "polygon", color: "#0B1B3A", description: "Périmètre du Plan d'Aménagement" },
  { source: "aurs", layer: "28", label: "Lotissements (Rabat-Salé)",   geomType: "polygon", color: "#f59e0b", description: "Lotissements existants et projetés" },
  { source: "aurs", layer: "32", label: "Zonage réglementaire (Rabat-Salé)", geomType: "polygon", color: "#3b82f6", description: "Urbain, industriel, équipements…" },
  { source: "aurs", layer: "31", label: "Secteurs urbains (Rabat-Salé)", geomType: "polygon", color: "#8b5cf6" },
  { source: "aurs", layer: "1",  label: "Zones non aedificandi (Rabat-Salé)", geomType: "polygon", color: "#ef4444", description: "Zones non constructibles" },
  { source: "aurs", layer: "25", label: "Espaces verts (Rabat-Salé)",  geomType: "polygon", color: "#22c55e" },
  { source: "aurs", layer: "23", label: "Équipements publics (Rabat-Salé)", geomType: "polygon", color: "#a855f7" },
  { source: "aurs", layer: "27", label: "Voiries projetées (Rabat-Salé)", geomType: "line",    color: "#dc2626" },
];
const layerKey = (l: SigLayerDef) => `${l.source}-${l.layer}`;

/**
 * MapPicker — SIG intégré (100 % chez nous, aucune redirection externe).
 *
 * Stack :
 *  - MapLibre GL JS (fork open-source de Mapbox GL, 0 quota)
 *  - Tuiles OSM (gratuites, sans clé)
 *  - Geocoding Nominatim OSM (gratuit, 1 req/sec)
 *  - proj4 pour conversion Lambert Maroc ↔ WGS84
 *
 * Trois modes de localisation :
 *  1. ADRESSE — geocoding de l'adresse complète (commune + adresse)
 *  2. LAMBERT — saisie X/Y en Lambert Maroc (4 zones : Nord, Sud, Sahara Nord, Sahara Sud)
 *  3. CARTE   — pose manuelle d'un repère par clic ou drag du marqueur
 */

// Définitions des 4 projections Lambert Maroc (proj4)
// Sources : EPSG (https://epsg.io/26191, /26192, /26194, /26195)
proj4.defs("EPSG:26191", "+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=-5.4 +k_0=0.999625769 +x_0=500000 +y_0=300000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs +type=crs"); // Lambert Nord Maroc
proj4.defs("EPSG:26192", "+proj=lcc +lat_1=29.7 +lat_0=29.7 +lon_0=-5.4 +k_0=0.999615596 +x_0=500000 +y_0=300000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs +type=crs"); // Lambert Sud Maroc
proj4.defs("EPSG:26194", "+proj=lcc +lat_1=26.1 +lat_0=26.1 +lon_0=-5.4 +k_0=0.999616304 +x_0=1200000 +y_0=400000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs +type=crs"); // Lambert Sahara Nord
proj4.defs("EPSG:26195", "+proj=lcc +lat_1=22.5 +lat_0=22.5 +lon_0=-5.4 +k_0=0.999616437 +x_0=1500000 +y_0=400000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs +type=crs"); // Lambert Sahara Sud

type Props = {
  region?: string; province?: string; commune?: string; adresse?: string;
  initialLat?: number; initialLng?: number;
  onChange?: (coords: { lat: number; lng: number; source: "adresse" | "lambert" | "carte" } | null) => void;
  height?: number;
  /**
   * Affiche ou non le panneau « Couches SIG » (PA, lotissements, zonage…).
   * Réservé au post-login (espace client + backoffice) — pas accessible avant
   * création de compte sur les wizards P1/P2/P5.
   */
  showSigLayers?: boolean;
};

type Mode = "adresse" | "lambert" | "carte";
type LambertZone = "EPSG:26191" | "EPSG:26192" | "EPSG:26194" | "EPSG:26195";

const LAMBERT_ZONES: { code: LambertZone; label: string; example: string }[] = [
  { code: "EPSG:26191", label: "Lambert Nord Maroc (Tanger, Rabat, Casa, Fès, Meknès)", example: "X = 350 000  /  Y = 380 000" },
  { code: "EPSG:26192", label: "Lambert Sud Maroc (Marrakech, Agadir, Béni Mellal, Safi)", example: "X = 200 000  /  Y = 80 000" },
  { code: "EPSG:26194", label: "Lambert Sahara Nord (Tan-Tan, Layoune nord)",            example: "X = 1 050 000  /  Y = 420 000" },
  { code: "EPSG:26195", label: "Lambert Sahara Sud (Dakhla, Aousserd)",                  example: "X = 1 350 000  /  Y = 300 000" },
];

const DEFAULT_CENTER: [number, number] = [-7.5898, 33.5731]; // Casablanca
const DEFAULT_ZOOM = 5.5;

const OSM_STYLE: any = {
  version: 8,
  sources: {
    "osm": { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" },
  },
  layers: [{ id: "osm-tiles", type: "raster", source: "osm" }],
};

export default function MapPicker({
  region, province, commune, adresse,
  initialLat, initialLng, onChange, height = 360,
  showSigLayers = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [mode, setMode] = useState<Mode>("adresse");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  // Mode Lambert
  const [lambertZone, setLambertZone] = useState<LambertZone>("EPSG:26191");
  const [lambertX, setLambertX] = useState<string>("");
  const [lambertY, setLambertY] = useState<string>("");

  // Couches SIG actives (proxy /api/sig/...) — chargées à la demande
  const [activeSigLayers, setActiveSigLayers] = useState<Record<string, boolean>>({});
  const [sigBusy, setSigBusy] = useState<Record<string, boolean>>({});
  const [sigError, setSigError] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: coords ? [coords.lng, coords.lat] : DEFAULT_CENTER,
      zoom: coords ? 15 : DEFAULT_ZOOM,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    mapRef.current = map;
    if (coords) placeMarker(coords.lat, coords.lng);
    return () => {
      try { map.remove(); } catch {}
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle couche SIG (PA Rabat-Salé etc.) — charge en lazy ────────
  const toggleSigLayer = async (def: SigLayerDef) => {
    const key = layerKey(def);
    const map = mapRef.current;
    if (!map) return;
    const isActive = !!activeSigLayers[key];
    const sourceId = `sig-${key}`;
    const layerId = `sig-${key}-fill`;
    const strokeId = `sig-${key}-stroke`;

    if (isActive) {
      // Retire
      try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
      try { if (map.getLayer(strokeId)) map.removeLayer(strokeId); } catch {}
      try { if (map.getSource(sourceId)) map.removeSource(sourceId); } catch {}
      setActiveSigLayers(s => ({ ...s, [key]: false }));
      return;
    }

    // Active : fetch via notre proxy puis addSource + addLayer
    setSigBusy(b => ({ ...b, [key]: true }));
    setSigError(e => ({ ...e, [key]: "" }));
    try {
      const url = `${apiBase()}/api/sig/${def.source}/${def.layer}.geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geojson = await res.json();
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: "geojson", data: geojson });
      }
      if (def.geomType === "polygon") {
        map.addLayer({
          id: layerId, source: sourceId, type: "fill",
          paint: { "fill-color": def.color, "fill-opacity": 0.25, "fill-outline-color": def.color },
        });
        map.addLayer({
          id: strokeId, source: sourceId, type: "line",
          paint: { "line-color": def.color, "line-width": 1.5, "line-opacity": 0.85 },
        });
      } else if (def.geomType === "line") {
        map.addLayer({
          id: layerId, source: sourceId, type: "line",
          paint: { "line-color": def.color, "line-width": 2.5, "line-opacity": 0.85 },
        });
      } else {
        map.addLayer({
          id: layerId, source: sourceId, type: "circle",
          paint: { "circle-color": def.color, "circle-radius": 5, "circle-opacity": 0.85, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 },
        });
      }
      // Zoom sur la bbox de la couche (si extent dispo dans _meta) — sinon laisse la vue actuelle
      const feats = geojson?.features || [];
      if (feats.length > 0 && !coords) {
        try {
          let xmin = 180, ymin = 90, xmax = -180, ymax = -90;
          const visit = (c: any): void => {
            if (typeof c[0] === "number" && typeof c[1] === "number") {
              if (c[0] < xmin) xmin = c[0]; if (c[0] > xmax) xmax = c[0];
              if (c[1] < ymin) ymin = c[1]; if (c[1] > ymax) ymax = c[1];
            } else if (Array.isArray(c)) {
              c.forEach(visit);
            }
          };
          feats.slice(0, 200).forEach((f: any) => f.geometry?.coordinates && visit(f.geometry.coordinates));
          if (xmin < xmax && ymin < ymax) {
            map.fitBounds([[xmin, ymin], [xmax, ymax]], { padding: 60, maxZoom: 14, duration: 800 });
          }
        } catch {}
      }
      setActiveSigLayers(s => ({ ...s, [key]: true }));
    } catch (e: any) {
      setSigError(er => ({ ...er, [key]: e?.message || "Erreur de chargement" }));
    } finally {
      setSigBusy(b => ({ ...b, [key]: false }));
    }
  };

  const placeMarker = (lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) markerRef.current.remove();
    const el = document.createElement("div");
    el.style.cssText = `
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: linear-gradient(135deg, #C9A227, #E6C75B);
      border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      transform: rotate(-45deg); cursor: grab;
    `;
    const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: "bottom" })
      .setLngLat([lng, lat])
      .addTo(map);
    marker.on("dragend", () => {
      const ll = marker.getLngLat();
      const c = { lat: ll.lat, lng: ll.lng };
      setCoords(c);
      onChange?.({ ...c, source: "carte" });
    });
    markerRef.current = marker;
    map.flyTo({ center: [lng, lat], zoom: 16, speed: 1.4 });
  };

  // ── Mode 1 : ADRESSE → Nominatim ──────────────────────────────────
  const locateFromAddress = async () => {
    setError(null);
    const parts = [adresse, commune, province, region, "Maroc"].filter(Boolean).join(", ");
    if (!parts || !commune) {
      setError("Renseignez au moins la commune pour localiser le bien.");
      return;
    }
    setBusy(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parts)}&format=json&limit=1&countrycodes=ma`;
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setError("Aucun résultat — passez en mode Carte ou Lambert pour pointer le bien manuellement.");
        return;
      }
      const r = data[0];
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      const c = { lat, lng };
      setCoords(c);
      placeMarker(lat, lng);
      onChange?.({ ...c, source: "adresse" });
    } catch (e: any) {
      setError(e?.message || "Erreur de géocodage");
    } finally {
      setBusy(false);
    }
  };

  // ── Mode 2 : LAMBERT MAROC → conversion via proj4 ────────────────
  const locateFromLambert = () => {
    setError(null);
    const x = Number(lambertX), y = Number(lambertY);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x === 0 || y === 0) {
      setError("Saisissez les coordonnées Lambert X et Y (en mètres).");
      return;
    }
    try {
      // proj4(from, to, [x, y]) — Lambert utilise (X = abscisse Est, Y = ordonnée Nord)
      const [lng, lat] = proj4(lambertZone, "EPSG:4326", [x, y]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 20 || lat > 36 || lng < -18 || lng > -1) {
        setError("Coordonnées hors Maroc — vérifiez la zone Lambert sélectionnée.");
        return;
      }
      const c = { lat, lng };
      setCoords(c);
      placeMarker(lat, lng);
      onChange?.({ ...c, source: "lambert" });
    } catch (e: any) {
      setError("Erreur de conversion Lambert → WGS84 : " + (e?.message || "inconnue"));
    }
  };

  // ── Mode 3 : CARTE → click sur la carte (toujours actif) ─────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: maplibregl.MapMouseEvent) => {
      const { lat, lng } = e.lngLat;
      const c = { lat, lng };
      setCoords(c);
      placeMarker(lat, lng);
      onChange?.({ ...c, source: "carte" });
    };
    map.on("click", handler);
    return () => { try { map.off("click", handler); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  // Affichage des coords inverses (WGS84 → Lambert) pour info quand le marker bouge
  const reverseLambert = (() => {
    if (!coords) return null;
    try {
      const [x, y] = proj4("EPSG:4326", lambertZone, [coords.lng, coords.lat]);
      return { x: Math.round(x), y: Math.round(y) };
    } catch { return null; }
  })();

  return (
    <div>
      {/* Onglets des 3 modes */}
      <div style={S.tabs}>
        {([
          { id: "adresse", label: "🏠 Par adresse" },
          { id: "lambert", label: "📐 Coordonnées Lambert" },
          { id: "carte", label: "🗺️ Clic sur la carte" },
        ] as { id: Mode; label: string }[]).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setMode(t.id); setError(null); }}
            style={{ ...S.tab, ...(mode === t.id ? S.tabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panneau du mode actif */}
      {mode === "adresse" && (
        <div style={S.modeBox}>
          <div style={S.modeHint}>
            Localise automatiquement le bien à partir de la commune et de l'adresse
            saisies plus haut (région + province + commune + adresse précise).
          </div>
          <button
            type="button" onClick={locateFromAddress} disabled={busy || !commune}
            style={S.btnGold}
          >
            {busy ? "Localisation…" : "📍 Localiser cette adresse"}
          </button>
        </div>
      )}

      {mode === "lambert" && (
        <div style={S.modeBox}>
          <div style={S.modeHint}>
            Saisie en système géodésique <strong>Lambert Maroc</strong> (référence officielle
            ANCFCC). Indiquez la zone, puis les coordonnées X (abscisse) et Y (ordonnée) en mètres.
          </div>
          <div style={S.lambertGrid}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={S.label}>Zone Lambert</label>
              <select value={lambertZone} onChange={(e) => setLambertZone(e.target.value as LambertZone)} style={S.input}>
                {LAMBERT_ZONES.map(z => (
                  <option key={z.code} value={z.code}>{z.label}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: "rgba(11,27,58,0.6)", marginTop: 4, fontStyle: "italic" }}>
                Exemple : {LAMBERT_ZONES.find(z => z.code === lambertZone)?.example}
              </div>
            </div>
            <div>
              <label style={S.label}>X (mètres) — abscisse Est</label>
              <input type="number" value={lambertX} onChange={(e) => setLambertX(e.target.value)} style={S.input} placeholder="350000" />
            </div>
            <div>
              <label style={S.label}>Y (mètres) — ordonnée Nord</label>
              <input type="number" value={lambertY} onChange={(e) => setLambertY(e.target.value)} style={S.input} placeholder="380000" />
            </div>
          </div>
          <button type="button" onClick={locateFromLambert} disabled={!lambertX || !lambertY} style={{ ...S.btnGold, marginTop: 10 }}>
            📐 Convertir et positionner
          </button>
        </div>
      )}

      {mode === "carte" && (
        <div style={S.modeBox}>
          <div style={S.modeHint}>
            <strong>Cliquez directement sur la carte ci-dessous</strong> pour poser le marqueur,
            puis faites-le glisser pour ajuster. Idéal si vous n'avez ni adresse précise
            ni coordonnées Lambert.
          </div>
        </div>
      )}

      {/* Bandeau coords courantes + conversion inverse Lambert */}
      {coords && (
        <div style={S.coordsBar}>
          <div>
            <strong>WGS84 :</strong> {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </div>
          {reverseLambert && (
            <div>
              <strong>Lambert ({lambertZone.replace("EPSG:", "")}) :</strong>{" "}
              X = {reverseLambert.x.toLocaleString("fr-FR")} · Y = {reverseLambert.y.toLocaleString("fr-FR")}
            </div>
          )}
        </div>
      )}

      {error && <div style={S.errBox}>⚠ {error}</div>}

      {/* Toggle couches SIG officielles (PA, lotissements, zonages…) — réservé post-login */}
      {showSigLayers && (
      <div style={S.sigPanel}>
        <div style={S.sigPanelHeader}>
          <div>
            <div style={S.sigPanelEyebrow}>🗺️ Données officielles · Plans d'Aménagement</div>
            <div style={S.sigPanelTitle}>Couches SIG intégrées (proxy CITURBAREA)</div>
            <div style={S.sigPanelSub}>
              Cliquez sur une couche pour la superposer sur la carte. Données issues des
              géoportails publics marocains (PA homologués, loi 12-90), mises en cache 24 h
              sur nos serveurs — vous ne sortez jamais de citurbarea.com.
            </div>
          </div>
        </div>
        <div style={S.sigLayerGrid}>
          {SIG_LAYERS.map(def => {
            const key = layerKey(def);
            const active = !!activeSigLayers[key];
            const busy = !!sigBusy[key];
            const err = sigError[key];
            return (
              <button
                key={key} type="button"
                onClick={() => toggleSigLayer(def)}
                disabled={busy}
                title={def.description || def.label}
                style={{
                  ...S.sigLayerBtn,
                  ...(active ? S.sigLayerBtnActive : {}),
                  borderLeft: `4px solid ${def.color}`,
                  cursor: busy ? "wait" : "pointer",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 3, background: def.color, flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: "left" }}>
                  {def.label}
                  {err && <span style={{ color: "#b91c1c", display: "block", fontSize: 10.5 }}>{err}</span>}
                </span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  {busy ? "…" : active ? "✓" : "+"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Carte (toujours visible) */}
      <div
        ref={containerRef}
        style={{
          width: "100%", height, marginTop: 12,
          borderRadius: 14, overflow: "hidden",
          border: "1px solid rgba(201,162,39,0.35)",
          boxShadow: "0 12px 36px rgba(11,27,58,0.10)",
        }}
      />
      <div style={{ fontSize: 11, color: "rgba(11,27,58,0.5)", marginTop: 6, fontStyle: "italic", textAlign: "right" }}>
        Fond cartographique : OpenStreetMap · Géocodage : Nominatim · Lambert : proj4 (EPSG:26191/2/4/5)
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  tabs: { display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  tab: {
    padding: "9px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.7)", border: "1px solid rgba(11,27,58,0.18)",
    color: "rgba(11,27,58,0.75)", fontWeight: 600, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit",
  },
  tabActive: {
    background: "linear-gradient(135deg, rgba(201,162,39,0.14), rgba(232,216,166,0.14))",
    border: "2px solid #C9A227", color: "#0B1B3A", fontWeight: 700,
  },
  modeBox: {
    background: "rgba(255,255,255,0.7)", border: "1px solid rgba(201,162,39,0.30)",
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  modeHint: { fontSize: 12.5, color: "rgba(11,27,58,0.75)", lineHeight: 1.55, marginBottom: 12 },
  lambertGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  label: { display: "block", fontSize: 11, fontWeight: 800, color: "rgba(11,27,58,0.75)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 },
  input: {
    width: "100%", padding: "9px 12px", border: "1px solid rgba(201,162,39,0.35)",
    background: "#fff", borderRadius: 10, fontSize: 13, color: "#0B1B3A",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  },
  btnGold: {
    padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(201,162,39,0.45)",
    background: "linear-gradient(135deg, #C9A227, #E6C75B)", color: "#1a1406",
    fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  },
  coordsBar: {
    background: "rgba(11,27,58,0.04)", border: "1px solid rgba(11,27,58,0.10)",
    borderRadius: 10, padding: "10px 14px", marginBottom: 10,
    fontSize: 12.5, color: "rgba(11,27,58,0.85)",
    display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
  },
  errBox: {
    background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.22)",
    color: "#b91c1c", padding: "9px 12px", borderRadius: 10, fontSize: 12.5, marginBottom: 10,
  },
  sigPanel: {
    background: "linear-gradient(135deg, rgba(11,27,58,0.04), rgba(201,162,39,0.06))",
    border: "1px solid rgba(11,27,58,0.18)", borderLeft: "4px solid #0B1B3A",
    borderRadius: 12, padding: 14, marginBottom: 12,
  },
  sigPanelHeader: { marginBottom: 12 },
  sigPanelEyebrow: { fontSize: 10.5, fontWeight: 800, letterSpacing: "0.10em", color: "rgba(11,27,58,0.65)", textTransform: "uppercase", marginBottom: 4 },
  sigPanelTitle: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 16, fontWeight: 700, color: "#0B1B3A", marginBottom: 4 },
  sigPanelSub: { fontSize: 12, color: "rgba(11,27,58,0.7)", lineHeight: 1.55 },
  sigLayerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 },
  sigLayerBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px", borderRadius: 8,
    background: "rgba(255,255,255,0.85)", border: "1px solid rgba(11,27,58,0.15)",
    fontSize: 12, fontWeight: 600, color: "rgba(11,27,58,0.85)",
    fontFamily: "inherit",
  },
  sigLayerBtnActive: {
    background: "linear-gradient(135deg, rgba(201,162,39,0.18), rgba(232,216,166,0.18))",
    border: "2px solid #C9A227", color: "#0B1B3A",
  },
};

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * MapPicker — composant SIG basique pour géoréférencer un bien.
 *
 * Stack : MapLibre GL JS + OSM tuiles publiques + Nominatim OSM pour le geocoding.
 * Coût : 0 € (open source + services free tier). Pas de clé API requise.
 *
 * UX :
 *   - L'utilisateur clique « Localiser sur la carte » → on geocode son
 *     adresse (commune + adresse précise) via Nominatim et on pose un marqueur.
 *   - Le marqueur est draggable → l'utilisateur peut affiner manuellement.
 *   - On remonte les coordonnées (lat/lng) au parent via onChange.
 *
 * Important : Nominatim a une limite à 1 req/sec et exige un User-Agent.
 * On respecte la fair-use policy en débouncant + en envoyant un Referer.
 */

type Props = {
  // Inputs pour le geocoding
  region?: string;
  province?: string;
  commune?: string;
  adresse?: string;
  // Coords initiales (si déjà connues)
  initialLat?: number;
  initialLng?: number;
  // Callback à chaque déplacement / geocoding
  onChange?: (coords: { lat: number; lng: number } | null) => void;
  height?: number;
};

// Centre Maroc par défaut (Casablanca)
const DEFAULT_CENTER: [number, number] = [-7.5898, 33.5731];
const DEFAULT_ZOOM = 5.5;

// Style de tuiles OSM gratuit (sans clé API)
const OSM_STYLE: any = {
  version: 8,
  sources: {
    "osm": {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "osm-tiles", type: "raster", source: "osm" },
  ],
};

export default function MapPicker({
  region, province, commune, adresse,
  initialLat, initialLng,
  onChange,
  height = 320,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  // Init carte au montage
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
    mapRef.current = map;
    if (coords) placeMarker(coords.lat, coords.lng);
    return () => {
      try { map.remove(); } catch {}
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      onChange?.(c);
    });
    markerRef.current = marker;
    map.flyTo({ center: [lng, lat], zoom: 15, speed: 1.4 });
  };

  const locate = async () => {
    setError(null);
    const parts = [adresse, commune, province, region, "Maroc"].filter(Boolean).join(", ");
    if (!parts || !commune) {
      setError("Renseignez au moins la commune pour localiser le bien.");
      return;
    }
    setBusy(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parts)}&format=json&limit=1&countrycodes=ma`;
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          // Nominatim exige un User-Agent identifiable, fourni automatiquement par le navigateur.
        },
      });
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setError("Aucun résultat — ajoutez l'adresse précise ou ajustez le marqueur manuellement.");
        // Centre quand même sur le pays par défaut pour permettre déplacement manuel
        const map = mapRef.current;
        if (map) map.flyTo({ center: DEFAULT_CENTER, zoom: 6 });
        return;
      }
      const r = data[0];
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      const c = { lat, lng };
      setCoords(c);
      placeMarker(lat, lng);
      onChange?.(c);
    } catch (e: any) {
      setError(e?.message || "Erreur de géocodage");
    } finally {
      setBusy(false);
    }
  };

  // Click direct sur la carte = pose / déplace le marqueur
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: maplibregl.MapMouseEvent) => {
      const { lat, lng } = e.lngLat;
      const c = { lat, lng };
      setCoords(c);
      placeMarker(lat, lng);
      onChange?.(c);
    };
    map.on("click", handler);
    return () => { try { map.off("click", handler); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <button
          type="button" onClick={locate} disabled={busy || !commune}
          style={{
            padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(201,162,39,0.45)",
            background: busy ? "#eee" : "linear-gradient(135deg, #C9A227, #E6C75B)",
            color: busy ? "#666" : "#fff", fontWeight: 700, fontSize: 13, cursor: busy ? "wait" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {busy ? "Localisation…" : "📍 Localiser sur la carte"}
        </button>
        {coords && (
          <span style={{ fontSize: 12, color: "rgba(11,27,58,0.7)" }}>
            <strong>Coords :</strong> {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </span>
        )}
        <span style={{ fontSize: 11.5, color: "rgba(11,27,58,0.55)", fontStyle: "italic", marginLeft: "auto" }}>
          Cliquez sur la carte ou faites glisser le marqueur pour affiner
        </span>
      </div>
      {error && (
        <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.22)", color: "#b91c1c", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 10 }}>
          ⚠ {error}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: "100%", height,
          borderRadius: 14, overflow: "hidden",
          border: "1px solid rgba(201,162,39,0.35)",
          boxShadow: "0 12px 36px rgba(11,27,58,0.10)",
        }}
      />
    </div>
  );
}

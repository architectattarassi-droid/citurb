import React, { useEffect, useRef, useState } from "react";

/**
 * FileViewer — visualisation universelle de fichiers
 *
 * Supports:
 *  - PDF        → iframe natif navigateur
 *  - JPG/PNG    → <img>
 *  - IFC        → three.js + web-ifc-three (3D BIM)
 *  - Autres     → bouton de téléchargement uniquement
 */

type Props = {
  url: string;
  fileName: string;
  mimeType?: string;
  height?: number | string;
};

function ext(name: string): string {
  return (name.split(".").pop() || "").toLowerCase();
}

function isImage(mime?: string, e?: string): boolean {
  if (mime?.startsWith("image/")) return true;
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(e || "");
}

function isPDF(mime?: string, e?: string): boolean {
  return mime === "application/pdf" || e === "pdf";
}

function isIFC(mime?: string, e?: string): boolean {
  return e === "ifc" || mime === "application/x-step" || mime === "application/octet-stream" && e === "ifc";
}

function isText(mime?: string, e?: string): boolean {
  if (mime?.startsWith("text/")) return true;
  return ["txt", "md", "csv", "json", "xml", "log"].includes(e || "");
}

export default function FileViewer({ url, fileName, mimeType, height = 600 }: Props) {
  const e = ext(fileName);

  if (isImage(mimeType, e)) {
    return (
      <div style={{ width: "100%", height, background: "#0a0f1a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", border: "1px solid #1e2330", borderRadius: 8 }}>
        <img src={url} alt={fileName} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      </div>
    );
  }

  if (isPDF(mimeType, e)) {
    return (
      <iframe
        src={url}
        title={fileName}
        style={{ width: "100%", height, border: "1px solid #1e2330", borderRadius: 8, background: "#fff" }}
      />
    );
  }

  if (isIFC(mimeType, e)) {
    return <IFCViewer url={url} height={height} />;
  }

  if (isText(mimeType, e)) {
    return <TextViewer url={url} height={height} />;
  }

  return (
    <div style={{ width: "100%", height, background: "#0a0f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", border: "1px solid #1e2330", borderRadius: 8, gap: 12 }}>
      <div style={{ fontSize: 48 }}>📦</div>
      <div style={{ fontSize: 13 }}>Format <b>.{e || "?"}</b> — visualisation non disponible</div>
      <a href={url} download={fileName} style={{ background: "#1d4ed8", color: "#fff", padding: "8px 16px", borderRadius: 6, fontSize: 13, textDecoration: "none" }}>
        ⬇️ Télécharger {fileName}
      </a>
    </div>
  );
}

// ─── Sub-viewer: IFC (3D) ─────────────────────────────────────────────────

function IFCViewer({ url, height }: { url: string; height: number | string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    let animId = 0;
    let renderer: any = null;

    (async () => {
      try {
        if (!containerRef.current) return;

        // Imports dynamiques avec variables pour empêcher Rollup de résoudre statiquement.
        // Modules optionnels — la visu IFC nécessite `three` + `web-ifc-three` installés
        // à la demande. À défaut, on retombe sur un message d'erreur.
        const threeId = "three";
        const orbitId = "three/examples/jsm/controls/OrbitControls.js";
        const ifcId = "web-ifc-three/IFCLoader";
        const THREE: any = await import(threeId).catch(() => null);
        const orbitMod: any = await import(orbitId).catch(() => null);
        const ifcMod: any = await import(ifcId).catch(() => null);
        if (!THREE || !orbitMod || !ifcMod) {
          if (!cancelled) setError("Visualiseur 3D non installé. Pour activer la visu IFC, installer : npm i three web-ifc-three");
          return;
        }

        const container = containerRef.current;
        if (!container) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0f1a);

        const w = container.clientWidth;
        const h = typeof height === "number" ? height : 600;

        const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        camera.position.set(15, 13, 15);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dl = new THREE.DirectionalLight(0xffffff, 0.8);
        dl.position.set(5, 10, 7);
        scene.add(dl);
        scene.add(new THREE.GridHelper(50, 50, 0x334155, 0x1e293b));

        const controls = new orbitMod.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const IFCLoader = ifcMod.IFCLoader;
        const loader = new IFCLoader();
        loader.ifcManager.setWasmPath("https://unpkg.com/web-ifc@0.0.61/");

        const model: any = await loader.loadAsync(url);
        if (cancelled) return;
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3()).length();
        const center = box.getCenter(new THREE.Vector3());
        controls.target.copy(center);
        camera.position.copy(center).add(new THREE.Vector3(size, size * 0.7, size));
        camera.near = size / 100;
        camera.far = size * 100;
        camera.updateProjectionMatrix();
        controls.update();

        const animate = () => {
          if (cancelled) return;
          controls.update();
          renderer.render(scene, camera);
          animId = requestAnimationFrame(animate);
        };
        animate();

        const onResize = () => {
          if (!container || !renderer) return;
          const newW = container.clientWidth;
          renderer.setSize(newW, h);
          camera.aspect = newW / h;
          camera.updateProjectionMatrix();
        };
        window.addEventListener("resize", onResize);

        setStatus("ready");

        return () => {
          window.removeEventListener("resize", onResize);
        };
      } catch (e: any) {
        console.error("[IFCViewer]", e);
        setErrMsg(e?.message || "Erreur chargement IFC");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (animId) cancelAnimationFrame(animId);
      if (renderer) {
        try {
          renderer.dispose();
          if (renderer.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        } catch {}
      }
    };
  }, [url, height]);

  return (
    <div style={{ position: "relative", width: "100%", height, background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 8, overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {status === "loading" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa", fontSize: 13, background: "rgba(10,15,26,0.8)" }}>
          ⏳ Chargement modèle IFC 3D…
        </div>
      )}
      {status === "error" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 13, background: "rgba(10,15,26,0.95)", gap: 8, padding: 20, textAlign: "center" }}>
          <div>⚠️ Impossible de charger le modèle IFC</div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{errMsg}</div>
          <a href={url} download style={{ marginTop: 12, background: "#1d4ed8", color: "#fff", padding: "6px 12px", borderRadius: 4, fontSize: 12, textDecoration: "none" }}>⬇️ Télécharger le fichier IFC</a>
        </div>
      )}
      {status === "ready" && (
        <div style={{ position: "absolute", top: 8, right: 8, fontSize: 10, color: "#94a3b8", background: "rgba(10,15,26,0.7)", padding: "3px 8px", borderRadius: 4 }}>
          🖱️ Clic gauche : rotation · Clic droit : pan · Molette : zoom
        </div>
      )}
    </div>
  );
}

// ─── Sub-viewer: Text ──────────────────────────────────────────────────────

function TextViewer({ url, height }: { url: string; height: number | string }) {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("citurbarea.token") || ""}` } })
      .then(r => r.text())
      .then(setText)
      .catch(() => setText("Erreur chargement"))
      .finally(() => setLoading(false));
  }, [url]);

  return (
    <pre style={{ width: "100%", height, overflow: "auto", background: "#0a0f1a", color: "#e8eaf0", border: "1px solid #1e2330", borderRadius: 8, padding: 12, fontSize: 12, fontFamily: "ui-monospace, monospace", margin: 0 }}>
      {loading ? "Chargement…" : text}
    </pre>
  );
}

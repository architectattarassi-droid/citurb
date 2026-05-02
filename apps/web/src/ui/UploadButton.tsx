import React, { useRef, useState } from "react";

/**
 * UploadButton — Upload de fichier avec barre de progression, vitesse et ETA.
 *
 * Utilise XMLHttpRequest (fetch ne supporte pas onprogress upload).
 * Affiche : % avancement, MB/s, ETA, taille fichier, statut succès/erreur.
 */

type Props = {
  url: string;
  field?: string;                 // nom du champ multipart, défaut "file"
  extraFields?: Record<string, string>;
  headers?: Record<string, string>;
  accept?: string;                 // restrictions navigateur (ex ".ifc,.pdf,.jpg")
  maxSizeMB?: number;
  label?: string;
  disabled?: boolean;
  onComplete: (response: any) => void;
  onError?: (err: Error) => void;
  variant?: "primary" | "compact";
};

type Progress = {
  pct: number;
  loaded: number;
  total: number;
  rateMBs: number;
  etaSec: number;
};

export default function UploadButton({
  url, field = "file", extraFields = {}, headers = {}, accept,
  maxSizeMB = 100, label = "📎 Uploader", disabled, onComplete, onError, variant = "compact",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const isUploading = progress !== null && progress.pct < 100;

  const handleFile = (file: File) => {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${maxSizeMB} MB)`);
      return;
    }
    setFileName(file.name);
    setProgress({ pct: 0, loaded: 0, total: file.size, rateMBs: 0, etaSec: 0 });

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    const fd = new FormData();
    Object.entries(extraFields).forEach(([k, v]) => fd.append(k, v));
    fd.append("nom", file.name);
    fd.append(field, file);

    let lastT = Date.now();
    let lastL = 0;
    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (!e.lengthComputable) return;
      const now = Date.now();
      const dt = (now - lastT) / 1000;
      const dl = e.loaded - lastL;
      const rateMBs = dt > 0.05 ? dl / 1024 / 1024 / dt : 0;
      const remaining = e.total - e.loaded;
      const etaSec = rateMBs > 0 ? remaining / 1024 / 1024 / rateMBs : 0;
      if (dt > 0.2) { lastT = now; lastL = e.loaded; }
      setProgress({
        pct: Math.round((e.loaded / e.total) * 100),
        loaded: e.loaded,
        total: e.total,
        rateMBs,
        etaSec,
      });
    };

    xhr.onload = () => {
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        let resp: any = xhr.responseText;
        try { resp = JSON.parse(xhr.responseText); } catch {}
        setProgress(p => p ? { ...p, pct: 100 } : null);
        setTimeout(() => { setProgress(null); setFileName(""); }, 1200);
        onComplete(resp);
      } else {
        const msg = `HTTP ${xhr.status}: ${xhr.responseText.slice(0, 200)}`;
        setError(msg);
        setProgress(null);
        onError?.(new Error(msg));
      }
    };
    xhr.onerror = () => {
      xhrRef.current = null;
      setError("Erreur réseau pendant l'upload");
      setProgress(null);
    };
    xhr.onabort = () => {
      xhrRef.current = null;
      setError("Upload annulé");
      setProgress(null);
    };

    xhr.open("POST", url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.send(fd);
  };

  const cancel = () => {
    xhrRef.current?.abort();
    if (inputRef.current) inputRef.current.value = "";
  };

  const click = () => {
    if (isUploading) return;
    setError(null);
    inputRef.current?.click();
  };

  if (isUploading && progress) {
    return (
      <div style={progressBoxStyle(variant)}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
          <span style={{ color: "#e8eaf0", fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
          <span style={{ color: "#60a5fa" }}>{progress.pct}%</span>
        </div>
        <div style={{ height: 6, background: "#1e2330", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${progress.pct}%`, height: "100%", background: "linear-gradient(90deg, #1d4ed8, #60a5fa)", transition: "width 0.2s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "#94a3b8" }}>
          <span>{fmtSize(progress.loaded)} / {fmtSize(progress.total)}</span>
          <span>{progress.rateMBs > 0 ? `${progress.rateMBs.toFixed(1)} MB/s` : "…"}</span>
          <span>{progress.etaSec > 0 ? `ETA ${fmtTime(progress.etaSec)}` : "…"}</span>
        </div>
        <button onClick={cancel} style={{ marginTop: 6, background: "#dc2626", color: "#fff", border: 0, padding: "3px 10px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>
          ✕ Annuler
        </button>
      </div>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
        <button onClick={click} disabled={disabled} style={btnStyle(variant)}>{label}</button>
        {error && (
          <div style={{ background: "#3a1a1a", color: "#fca5a5", padding: "4px 8px", borderRadius: 4, fontSize: 10, maxWidth: 260 }}>
            ⚠ {error}
          </div>
        )}
        {progress?.pct === 100 && !error && (
          <div style={{ color: "#22c55e", fontSize: 10 }}>✓ Terminé</div>
        )}
      </div>
    </>
  );
}

function fmtSize(b: number): string {
  if (b < 1024) return `${b}o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}Ko`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)}Mo`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)}Go`;
}

function fmtTime(s: number): string {
  if (s < 60) return `${Math.ceil(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.ceil(s % 60);
  return `${m}m${r.toString().padStart(2, "0")}`;
}

function btnStyle(v: "primary" | "compact"): React.CSSProperties {
  if (v === "primary") {
    return { background: "#1d4ed8", color: "#fff", border: 0, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 };
  }
  return { background: "#1d4ed8", color: "#fff", border: 0, padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 600 };
}

function progressBoxStyle(v: "primary" | "compact"): React.CSSProperties {
  return {
    background: "#0a0f1a",
    border: "1px solid #1d4ed8",
    borderRadius: 6,
    padding: v === "primary" ? "10px 14px" : "7px 10px",
    minWidth: 280,
  };
}

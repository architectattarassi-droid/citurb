import React, { useRef, useState } from "react";
import { apiBase } from "../../tomes/tome4/apiClient";

/**
 * MohafadatiUpload — upload de l'extrait de titre foncier (consultation
 * Mohafadati ANCFCC) ou tout document foncier officiel (certificat de
 * propriété, plan parcellaire).
 *
 * Doctrine : ANCFCC n'a pas d'API publique pour consulter les titres en
 * temps réel. Workaround : le client uploade lui-même son extrait depuis
 * Mohafadati (mohafadati.gov.ma ou app mobile) — on l'archive dans son
 * dossier et l'expert s'y réfère lors du rapport.
 */
type Props = {
  onChange?: (doc: UploadedDoc | null) => void;
};

export type UploadedDoc = {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
};

const MAX_MB = 10;
const ALLOWED = /^(application\/pdf|image\/(jpeg|png|webp|heic))$/i;

export default function MohafadatiUpload({ onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [doc, setDoc] = useState<UploadedDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const upload = async (file: File) => {
    setError(null);
    if (!ALLOWED.test(file.type)) {
      setError("Format non supporté — PDF, JPG, PNG, WEBP ou HEIC.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo) — max ${MAX_MB} Mo.`);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${apiBase()}/p5/documents/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Upload échoué");
      const d: UploadedDoc = { url: data.url, filename: data.filename, size: data.size, mimetype: data.mimetype };
      setDoc(d);
      onChange?.(d);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'envoi du fichier.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    setDoc(null);
    onChange?.(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <div style={S.eyebrow}>📜 Source officielle (optionnel)</div>
          <div style={S.title}>Extrait Mohafadati / titre foncier</div>
          <div style={S.sub}>
            Vous avez consulté votre titre foncier via{" "}
            <a href="https://www.ancfcc.gov.ma/DemandeSuiviTitresPage" target="_blank" rel="noopener noreferrer" style={S.link}>
              Mohafadati
            </a>{" "}? Uploadez le PDF ou la photo — il sera archivé dans votre dossier
            et permettra à l'expert de croiser les références cadastrales lors du rapport.
            PDF, JPG, PNG, WEBP — max {MAX_MB} Mo.
          </div>
        </div>
      </div>

      {!doc ? (
        <div style={S.dropzone}>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <button type="button" onClick={pick} disabled={busy} style={S.btnPick}>
            {busy ? "Envoi en cours…" : "📎 Joindre l'extrait Mohafadati"}
          </button>
          <div style={S.dropzoneHint}>ou faites glisser le fichier ici</div>
        </div>
      ) : (
        <div style={S.uploadedBox}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            <div style={S.fileIcon}>{doc.mimetype.startsWith("image/") ? "🖼️" : "📄"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "#0B1B3A", fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {doc.filename}
              </div>
              <div style={{ fontSize: 12, color: "rgba(11,27,58,0.6)" }}>
                {(doc.size / 1024).toFixed(1)} Ko · archivé dans votre dossier
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={doc.url} target="_blank" rel="noopener noreferrer" style={S.btnView}>Voir</a>
            <button type="button" onClick={remove} style={S.btnRemove}>Retirer</button>
          </div>
        </div>
      )}

      {error && (
        <div style={S.errBox}>⚠ {error}</div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    background: "linear-gradient(135deg, rgba(11,27,58,0.04), rgba(201,162,39,0.06))",
    border: "1px solid rgba(11,27,58,0.18)",
    borderLeft: "4px solid #C9A227",
    borderRadius: 14, padding: 18, margin: "16px 0",
  },
  header: { marginBottom: 14 },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", color: "rgba(11,27,58,0.65)", textTransform: "uppercase", marginBottom: 6 },
  title: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 17, fontWeight: 700, color: "#0B1B3A", marginBottom: 6 },
  sub: { fontSize: 13, color: "rgba(11,27,58,0.75)", lineHeight: 1.55 },
  link: { color: "#C9A227", fontWeight: 600, textDecoration: "underline" },
  dropzone: {
    background: "#fff", border: "2px dashed rgba(201,162,39,0.4)", borderRadius: 12,
    padding: "26px 18px", textAlign: "center",
  },
  btnPick: {
    background: "linear-gradient(135deg, #C9A227, #E6C75B)", color: "#1a1406",
    border: 0, padding: "11px 22px", borderRadius: 10,
    fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  },
  dropzoneHint: { marginTop: 10, fontSize: 12, color: "rgba(11,27,58,0.5)" },
  uploadedBox: {
    background: "#fff", border: "1px solid rgba(11,27,58,0.12)", borderRadius: 12,
    padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
  },
  fileIcon: { fontSize: 26, lineHeight: 1 },
  btnView: {
    padding: "7px 13px", borderRadius: 8, background: "#0B1B3A", color: "#fff",
    fontSize: 12, fontWeight: 700, textDecoration: "none",
  },
  btnRemove: {
    padding: "7px 13px", borderRadius: 8, background: "transparent",
    border: "1px solid rgba(220,38,38,0.4)", color: "#b91c1c",
    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  errBox: {
    marginTop: 10, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.22)",
    color: "#b91c1c", padding: "8px 12px", borderRadius: 8, fontSize: 12.5,
  },
};

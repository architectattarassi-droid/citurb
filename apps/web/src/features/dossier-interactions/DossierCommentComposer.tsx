/**
 * DossierCommentComposer — composer mobile-first sticky bottom.
 *
 * Features :
 *  - textarea auto-grow
 *  - boutons : 📎 fichier, 📷 photo (capture), 🎙 audio (WebAudio MediaRecorder), @mention
 *  - @-mention autocomplete (props.fetchMembers async)
 *  - max 60s pour les notes audio
 *  - visibilité (PUBLIC / INTERNE_OPS pour staff / PRIVATE)
 *  - parentId si réponse à un thread
 */

import React, { useEffect, useRef, useState } from "react";
import { dossierInteractionsApi, DossierInteraction, InteractionVisibility } from "./dossier-interactions.api";

type Member = { id: string; label: string; role?: string };

type Props = {
  dossierId: string;
  parentId?: string | null;
  onParentCleared?: () => void;
  isStaff?: boolean;
  /** Fonction de recherche membres pour @mention. */
  fetchMembers?: (q: string) => Promise<Member[]>;
  onCreated: (item: DossierInteraction) => void;
};

const MAX_AUDIO_MS = 60_000;

export default function DossierCommentComposer(props: Props) {
  const { dossierId, parentId, onParentCleared, isStaff, fetchMembers, onCreated } = props;

  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<InteractionVisibility>("PUBLIC");
  const [mentions, setMentions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // @mention autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Member[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  // Audio recording
  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);
  const recTimerRef = useRef<number | null>(null);

  // Auto-grow
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [text]);

  // Lookup mentions
  useEffect(() => {
    if (mentionQuery == null || !fetchMembers) { setCandidates([]); return; }
    let alive = true;
    fetchMembers(mentionQuery).then((res) => { if (alive) setCandidates(res.slice(0, 6)); }).catch(() => undefined);
    return () => { alive = false; };
  }, [mentionQuery, fetchMembers]);

  function handleText(v: string) {
    setText(v);
    // Détecte un @ courant pour trigger mention search
    const ta = taRef.current;
    const caret = ta?.selectionStart ?? v.length;
    const left = v.slice(0, caret);
    const m = left.match(/(?:^|\s)@(\w*)$/);
    if (m) setMentionQuery(m[1]); else setMentionQuery(null);
  }

  function insertMention(u: Member) {
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? text.length;
    const left = text.slice(0, caret);
    const right = text.slice(caret);
    const replaced = left.replace(/@\w*$/, `@${u.label} `);
    setText(replaced + right);
    setMentions((m) => Array.from(new Set([...m, u.id])));
    setMentionQuery(null);
    setTimeout(() => ta.focus(), 0);
  }

  // ── Audio recording ─────────────────────────────────────────

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Micro non disponible sur ce navigateur."); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: mime });
        setFiles((f) => [...f, file]);
      };
      mediaRef.current = rec;
      rec.start();
      startTsRef.current = Date.now();
      setRecording(true);
      setRecMs(0);
      recTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTsRef.current;
        setRecMs(elapsed);
        if (elapsed >= MAX_AUDIO_MS) stopRecording();
      }, 200);
    } catch (e: any) {
      alert(`Micro refusé : ${e.message}`);
    }
  }
  function stopRecording() {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    setRecording(false);
    mediaRef.current?.stop();
    mediaRef.current = null;
  }

  // ── Submit ─────────────────────────────────────────────────

  async function submit() {
    if (busy) return;
    const content = text.trim();
    if (!content && files.length === 0) return;
    setBusy(true);
    try {
      const item = await dossierInteractionsApi.create(dossierId, {
        contentMD: content,
        mentions,
        files,
        visibility,
        parentId: parentId ?? null,
      });
      onCreated(item);
      setText(""); setFiles([]); setMentions([]); setMentionQuery(null);
      if (parentId && onParentCleared) onParentCleared();
    } catch (e: any) {
      alert(`Échec envoi : ${e.message}`);
    } finally { setBusy(false); }
  }

  function onPickFiles(input: HTMLInputElement) {
    const list = Array.from(input.files || []);
    setFiles((f) => [...f, ...list]);
    input.value = "";
  }

  return (
    <div
      style={{
        position: "sticky", bottom: 0, background: "#FFFFFF",
        borderTop: "1px solid #E5E7EB",
        padding: "10px 10px calc(10px + env(safe-area-inset-bottom, 0px))",
        zIndex: 5,
      }}
    >
      {parentId && (
        <div style={{ background: "#F1F5F9", padding: "6px 10px", borderRadius: 6, marginBottom: 6, fontSize: 12, display: "flex", justifyContent: "space-between" }}>
          <span>↩ Réponse à un message</span>
          <button onClick={onParentCleared} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}>Annuler</button>
        </div>
      )}

      {/* Mention dropdown */}
      {mentionQuery != null && candidates.length > 0 && (
        <div style={{
          background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: 8,
          position: "absolute", bottom: 60, left: 10, right: 10, maxHeight: 180, overflowY: "auto", zIndex: 10,
          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        }}>
          {candidates.map((c) => (
            <button key={c.id} onClick={() => insertMention(c)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "transparent", border: "none", borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}>
              <b>@{c.label}</b> {c.role && <span style={{ color: "#64748B", fontSize: 12 }}>· {c.role}</span>}
            </button>
          ))}
        </div>
      )}

      {/* File chips */}
      {files.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {files.map((f, i) => (
            <span key={i} style={{ background: "#EFF6FF", color: "#1E40AF", padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>
              {f.type.startsWith("audio/") ? "🎙" : f.type.startsWith("image/") ? "🖼" : "📎"} {f.name}
              <button onClick={() => setFiles((all) => all.filter((_, j) => j !== i))}
                style={{ marginLeft: 6, background: "transparent", border: "none", cursor: "pointer", color: "#1E40AF" }}>✕</button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => handleText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
          placeholder={parentId ? "Répondre…" : "Écrire un message, @nom pour mentionner…"}
          rows={1}
          inputMode="text"
          style={{
            flex: 1, resize: "none", padding: "10px 12px", border: "1px solid #CBD5E1", borderRadius: 10,
            font: "inherit", fontSize: 14, outline: "none", minHeight: 44, maxHeight: 200,
          }}
        />
        <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={(e) => onPickFiles(e.currentTarget)} />
        <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => onPickFiles(e.currentTarget)} />
        <button title="Photo" aria-label="Prendre une photo" onClick={() => photoRef.current?.click()} style={iconBtn}>📷</button>
        <button title="Fichier" aria-label="Joindre un fichier" onClick={() => fileRef.current?.click()} style={iconBtn}>📎</button>
        {recording ? (
          <button title="Stop" aria-label="Arrêter l'enregistrement" onClick={stopRecording} style={{ ...iconBtn, background: "#FEE2E2", color: "#B91C1C" }}>
            ■ {Math.ceil((MAX_AUDIO_MS - recMs) / 1000)}s
          </button>
        ) : (
          <button title="Note vocale" aria-label="Enregistrer une note vocale" onClick={startRecording} style={iconBtn}>🎙</button>
        )}
        <button onClick={submit} disabled={busy} aria-label="Envoyer le message" style={{
          background: busy ? "#94A3B8" : "#2563EB", color: "#FFFFFF", border: "none",
          borderRadius: 10, padding: "0 16px", minHeight: 44, fontWeight: 600, fontSize: 14,
          cursor: busy ? "default" : "pointer",
        }}>{busy ? "…" : "Envoyer"}</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, fontSize: 11, color: "#64748B" }}>
        <label>Visibilité :</label>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value as InteractionVisibility)}
          style={{ font: "inherit", padding: 2, border: "1px solid #CBD5E1", borderRadius: 6 }}>
          <option value="PUBLIC">Publique</option>
          {isStaff && <option value="INTERNE_OPS">Interne OPS</option>}
          <option value="PRIVATE">Privée (auteur + mentions)</option>
        </select>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#94A3B8" }}>Ctrl+Entrée pour envoyer</span>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: "#F1F5F9",
  color: "#0F172A",
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  width: 44,
  height: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  cursor: "pointer",
  fontSize: 16,
  WebkitTapHighlightColor: "transparent",
};

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { apiBase } from "../../tomes/tome4/apiClient";

/**
 * CopiloteChantierPage — copilote IA chef de chantier (darija/français).
 * Route /chantier/:dossierId/copilote. Persona Brahim.
 * Input vocal via Web Speech API (fallback texte), réponse contextualisée LLM.
 */
export default function CopiloteChantierPage() {
  const { dossierId = "" } = useParams<{ dossierId: string }>();
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const token = () => { try { return localStorage.getItem("citurbarea.token") || localStorage.getItem("cit:auth:jwt"); } catch { return null; } };

  useEffect(() => {
    if (!dossierId) return;
    fetch(`${apiBase()}/api/chef-copilote/suggestions/${dossierId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json()).then((j) => setSuggestions(j.suggestions || [])).catch(() => {});
  }, [dossierId]);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch(`${apiBase()}/api/chef-copilote/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ dossierId, query: text, queryLang: "darija" }),
      });
      const j = await r.json();
      setMessages((m) => [...m, { role: "bot", text: j.reply || "…" }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Erreur de connexion au copilote." }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("La reconnaissance vocale n'est pas supportée sur ce navigateur."); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = "ar-MA";
    rec.interimResults = false;
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; setInput(t); send(t); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 12px", paddingBottom: "calc(120px + env(safe-area-inset-bottom))", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#5b21b6", margin: "0 0 4px" }}>🤖 Copilote chantier</h1>
      <div style={{ fontSize: 13, color: "rgba(11,27,58,0.6)", marginBottom: 16 }}>Pose ta question en darija ou français — je connais ton chantier.</div>

      {suggestions.length > 0 && messages.length === 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#5b21b6", marginBottom: 8 }}>Actions du jour :</div>
          {suggestions.map((s, i) => (
            <div key={i} style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: "10px 12px", marginBottom: 6, fontSize: 13.5, color: "#0B1B3A" }}>{s}</div>
          ))}
        </div>
      )}

      <div ref={scrollRef} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "85%", padding: "10px 14px", borderRadius: 14, fontSize: 14, lineHeight: 1.5,
            background: m.role === "user" ? "#5b21b6" : "#f3f4f6",
            color: m.role === "user" ? "#fff" : "#0B1B3A", whiteSpace: "pre-wrap",
          }}>{m.text}</div>
        ))}
        {loading && <div style={{ alignSelf: "flex-start", padding: "10px 14px", color: "#9ca3af", fontSize: 14 }}>…</div>}
      </div>

      {/* Composer sticky bottom */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid rgba(11,27,58,0.1)", padding: "12px 12px calc(12px + env(safe-area-inset-bottom))", display: "flex", gap: 8, maxWidth: 640, margin: "0 auto" }}>
        <button onClick={toggleVoice} style={{
          width: 52, height: 52, flexShrink: 0, borderRadius: "50%", border: 0, cursor: "pointer",
          background: listening ? "#dc2626" : "#5b21b6", color: "#fff", fontSize: 22,
          animation: listening ? "pulse 1s infinite" : "none",
        }}>{listening ? "⏺" : "🎤"}</button>
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Smaa3 khouya, ach kayn ?"
          style={{ flex: 1, padding: "0 14px", borderRadius: 26, border: "1px solid rgba(11,27,58,0.2)", fontSize: 15, fontFamily: "inherit", outline: "none" }}
        />
        <button onClick={() => send(input)} disabled={loading} style={{
          width: 52, height: 52, flexShrink: 0, borderRadius: "50%", border: 0, cursor: "pointer",
          background: "#0B1B3A", color: "#fff", fontSize: 20,
        }}>➤</button>
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>
    </div>
  );
}

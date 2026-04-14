import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Dossier } from "../dossier.store";
import { appendChat } from "../dossier.store";
import { generateAgentResponse } from "../../../../../modules/agent/citurbareaAgent";

const boxStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  padding: "16px 18px",
};

export default function AgentChatPanel({ dossier, onChange }: { dossier: Dossier; onChange: (d: Dossier) => void }) {
  const [text, setText] = useState("");
  const msgs = dossier.chat || [];
  const listRef = useRef<HTMLDivElement | null>(null);

  const header = useMemo(() => {
    return {
      title: "Chat dossier (IA)",
      subtitle: "Réservé au déblocage du projet — pas de questions " + "curiosité" + ".",
    };
  }, []);

  useEffect(() => {
    // Doctrine (B5): avoid page/DOM scrollIntoView. Keep scrolling inside the chat list only.
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  const send = () => {
    const v = text.trim();
    if (!v) return;
    let d = appendChat(dossier, "user", v, "project");

    const { reply, classification } = generateAgentResponse(d, v);
    d = appendChat(d, "agent", reply, classification);
    onChange(d);
    setText("");
  };

  return (
    <div style={boxStyle}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>{header.title}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{header.subtitle}</div>
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800 }}>LOCAL · storage-first</div>
      </div>

      <div ref={listRef} style={{
        border: "1px solid #f1f5f9",
        background: "#f8fafc",
        borderRadius: 12,
        padding: 12,
        maxHeight: 260,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        {msgs.length === 0 ? (
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
            Pose une question liée à ton dossier : <b>documents</b>, <b>paiement</b>, <b>autorisation</b>, <b>plans</b>, <b>chantier</b>.
          </div>
        ) : (
          msgs.map(m => (
            <div key={m.id} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%",
              whiteSpace: "pre-wrap",
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "#0f172a",
              background: m.role === "user" ? "#1e3a8a" : "#ffffff",
              border: m.role === "user" ? "1px solid rgba(30,58,138,.35)" : "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "10px 12px",
              boxShadow: m.role === "user" ? "none" : "0 8px 20px rgba(15,23,42,0.06)",
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                color: m.role === "user" ? "rgba(255,255,255,0.85)" : "#94a3b8",
                marginBottom: 4,
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}>
                <span>{m.role === "user" ? "Vous" : "Agent"}</span>
                <span>{new Date(m.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div style={{ color: m.role === "user" ? "#fff" : "#0f172a" }}>{m.message}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") send();
          }}
          placeholder="Décrivez le blocage (1 phrase)…"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            outline: "none",
            fontSize: 13,
          }}
        />
        <button
          onClick={send}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            background: "#1e3a8a",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

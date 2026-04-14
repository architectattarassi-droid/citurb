import React from "react";
import type { P2UiBlock } from "./p2.types";

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        border: "1px solid #e6e6e6",
        borderRadius: 12,
        padding: 14,
        background: "#fff",
      }}
    >
      {title ? <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div> : null}
      {children}
    </section>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid #ddd",
        fontSize: 12,
        background: "#fafafa",
      }}
    >
      {text}
    </span>
  );
}

export default function P2UiBlockRenderer({ block }: { block: P2UiBlock }) {
  switch (block.kind) {
    case "area":
      return (
        <Card title="Areas">
          <div style={{ display: "grid", gap: 8 }}>
            {block.levels.map((l) => (
              <div
                key={l.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "64px 1fr auto",
                  gap: 10,
                  alignItems: "baseline",
                  padding: "8px 10px",
                  border: "1px solid #f0f0f0",
                  borderRadius: 10,
                }}
              >
                <div style={{ fontWeight: 800 }}>{l.key}</div>
                <div style={{ color: "#444" }}>{l.label}</div>
                <div style={{ fontWeight: 700 }}>
                  {Number.isFinite(l.value) ? l.value : "—"} {l.unit}
                </div>
              </div>
            ))}
          </div>
        </Card>
      );

    case "complexity":
      return (
        <Card title="Complexité">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge text={String(block.complexity.tier)} />
            <div style={{ fontWeight: 800 }}>{block.complexity.label}</div>
          </div>
          {block.complexity.details?.length ? (
            <ul style={{ margin: "10px 0 0 18px", color: "#444" }}>
              {block.complexity.details.map((d, idx) => (
                <li key={idx}>{d}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      );

    case "pricing": {
      const p = block.pricing;
      const range =
        typeof p.amount_min === "number" || typeof p.amount_max === "number"
          ? `${p.amount_min ?? "—"} – ${p.amount_max ?? "—"}`
          : null;
      const main = typeof p.amount === "number" ? String(p.amount) : range;
      return (
        <Card title="Pricing">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 800 }}>{p.label ?? "Estimation"}</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{main ? `${main} ${p.currency}` : `— ${p.currency}`}</div>
          </div>

          {p.breakdown?.length ? (
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {p.breakdown.map((b, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", color: "#444" }}>
                  <span>{b.label}</span>
                  <span>{typeof b.amount === "number" ? `${b.amount} ${p.currency}` : "—"}</span>
                </div>
              ))}
            </div>
          ) : null}

          {p.disclaimers?.length ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
              {p.disclaimers.map((d, idx) => (
                <div key={idx}>• {d}</div>
              ))}
            </div>
          ) : null}
        </Card>
      );
    }

    case "vigilance":
      return (
        <Card title="Vigilance">
          <div style={{ display: "grid", gap: 10 }}>
            {block.items.map((v, idx) => (
              <div key={idx} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <Badge text={String(v.level)} />
                  <div style={{ fontWeight: 900 }}>{v.title}</div>
                </div>
                <div style={{ marginTop: 6, color: "#444" }}>{v.message}</div>
                {v.rule_ids?.length ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
                    RuleIds: {v.rule_ids.join(", ")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      );

    case "text":
      return (
        <Card title={block.title}>
          <div style={{ color: "#444" }}>{block.body}</div>
        </Card>
      );

    case "list":
      return (
        <Card title={block.title}>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#444" }}>
            {block.items.map((it, idx) => (
              <li key={idx}>{it}</li>
            ))}
          </ul>
        </Card>
      );

    case "unknown":
    default:
      return (
        <Card title="Bloc inconnu">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "#555" }}>{JSON.stringify(block, null, 2)}</pre>
        </Card>
      );
  }
}

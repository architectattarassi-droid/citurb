/**
 * ProjectCalendarPage — page principale du module calendrier projet.
 *
 * Route : /projet/:dossierId/calendrier
 * Tabs : Gantt | Kanban | Calendar | Liste
 * Mobile-first : swipe horizontal pour changer de vue, tap tâche → bottom sheet
 */

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CpmResult, GanttPayload, PHASE_LABELS, ProjectTask, ProjectTaskStatus,
  projectCalendarApi, STATUS_LABELS,
} from "./project-calendar.api";
import GanttView from "./GanttView";
import KanbanView from "./KanbanView";
import CalendarMonthView from "./CalendarMonthView";
import TaskEditor from "./TaskEditor";
import CriticalPathBanner from "./CriticalPathBanner";

type TabId = "gantt" | "kanban" | "calendar" | "list";

const TABS: { id: TabId; label: string }[] = [
  { id: "gantt", label: "Gantt" },
  { id: "kanban", label: "Kanban" },
  { id: "calendar", label: "Calendrier" },
  { id: "list", label: "Liste" },
];

export default function ProjectCalendarPage() {
  const params = useParams<{ dossierId: string }>();
  const dossierId = params.dossierId ?? "";

  const [tab, setTab] = useState<TabId>("gantt");
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [cpm, setCpm] = useState<CpmResult | null>(null);
  const [gantt, setGantt] = useState<GanttPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; task?: ProjectTask } | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const load = async () => {
    if (!dossierId) return;
    setLoading(true);
    setError(null);
    try {
      const [tRes, cpRes, gRes] = await Promise.all([
        projectCalendarApi.listTasks(dossierId),
        projectCalendarApi.criticalPath(dossierId),
        projectCalendarApi.gantt(dossierId),
      ]);
      setTasks(tRes.tasks);
      setCpm({ criticalPath: cpRes.criticalPath, projectDuration: cpRes.projectDuration, slackPerTask: cpRes.slackPerTask, schedule: cpRes.schedule });
      setGantt({ projectStart: gRes.projectStart, projectEnd: gRes.projectEnd, projectDuration: gRes.projectDuration, bars: gRes.bars, phases: gRes.phases });
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [dossierId]);

  const handleSaveTask = async (patch: Partial<ProjectTask>) => {
    if (editor?.mode === "edit" && editor.task) {
      await projectCalendarApi.patchTask(dossierId, editor.task.id, patch);
    } else {
      await projectCalendarApi.createTask(dossierId, patch);
    }
    await load();
  };

  const handleDeleteTask = async () => {
    if (editor?.mode === "edit" && editor.task) {
      await projectCalendarApi.deleteTask(dossierId, editor.task.id);
      await load();
    }
  };

  const handleStatusChange = async (taskId: string, status: ProjectTaskStatus) => {
    await projectCalendarApi.patchTask(dossierId, taskId, { status });
    await load();
  };

  const initTemplate = async (porte: "P2" | "P3" | "P4" | "P5") => {
    if (tasks.length > 0 && !confirm(`Le planning existe déjà (${tasks.length} tâches). Le remplacer par le template ${porte} ?`)) return;
    await projectCalendarApi.initFromTemplate(dossierId, porte, { resetExisting: true });
    await load();
  };

  const openEditByClick = (taskId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    setEditor({ mode: "edit", task: t });
  };

  const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    setTouchStartX(null);
    if (Math.abs(dx) < 60) return;
    const idx = TABS.findIndex((t) => t.id === tab);
    if (dx < 0 && idx < TABS.length - 1) setTab(TABS[idx + 1].id);
    if (dx > 0 && idx > 0) setTab(TABS[idx - 1].id);
  };

  return (
    <div
      style={{ maxWidth: 1200, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>Calendrier projet</h1>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Dossier {dossierId}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tasks.length === 0 ? (
            <>
              <button onClick={() => initTemplate("P2")} style={btnPrimary}>Initialiser P2</button>
              <button onClick={() => initTemplate("P3")} style={btnSecondary}>Init P3</button>
              <button onClick={() => initTemplate("P4")} style={btnSecondary}>Init P4</button>
              <button onClick={() => initTemplate("P5")} style={btnSecondary}>Init P5</button>
            </>
          ) : (
            <button onClick={() => setEditor({ mode: "create" })} style={btnPrimary}>+ Nouvelle tâche</button>
          )}
        </div>
      </header>

      {loading && <div style={{ padding: 24, color: "#6b7280" }}>Chargement…</div>}
      {error && <div style={{ padding: 16, background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>{error}</div>}

      {!loading && !error && (
        <>
          {tasks.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <CriticalPathBanner
                cpm={cpm}
                tasks={tasks}
                projectStart={gantt?.projectStart ?? null}
                projectEnd={gantt?.projectEnd ?? null}
                onTaskClick={openEditByClick}
              />
            </div>
          )}

          <div style={{
            display: "flex", gap: 4, marginBottom: 12, borderBottom: "1px solid #e5e7eb",
            overflowX: "auto",
          }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  background: "transparent",
                  borderBottom: tab === t.id ? "2px solid #6366f1" : "2px solid transparent",
                  color: tab === t.id ? "#111827" : "#6b7280",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tasks.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", background: "#f9fafb", borderRadius: 12, color: "#6b7280" }}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>Aucune tâche dans le planning</div>
              <div style={{ fontSize: 13 }}>Initialise le planning depuis un template porte (P2, P3, P4, P5) ou crée une tâche manuellement.</div>
            </div>
          ) : (
            <>
              {tab === "gantt" && gantt && (
                <GanttView gantt={gantt} tasks={tasks} onTaskClick={openEditByClick} />
              )}
              {tab === "kanban" && (
                <KanbanView tasks={tasks} onChangeStatus={handleStatusChange} onTaskClick={openEditByClick} />
              )}
              {tab === "calendar" && (
                <CalendarMonthView tasks={tasks} onTaskClick={openEditByClick} />
              )}
              {tab === "list" && (
                <ListView tasks={tasks} cpm={cpm} onTaskClick={openEditByClick} />
              )}
            </>
          )}
        </>
      )}

      {editor && (
        <TaskEditor
          mode={editor.mode}
          initial={editor.task}
          allTasks={tasks}
          onClose={() => setEditor(null)}
          onSave={handleSaveTask}
          onDelete={editor.mode === "edit" ? handleDeleteTask : undefined}
        />
      )}
    </div>
  );
}

function ListView(props: { tasks: ProjectTask[]; cpm: CpmResult | null; onTaskClick: (id: string) => void }) {
  const sorted = useMemo(
    () => [...props.tasks].sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true })),
    [props.tasks],
  );
  return (
    <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 70px 80px 80px",
        background: "#f9fafb", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase",
        letterSpacing: 0.5, gap: 8,
      }}>
        <span>N°</span><span>Titre</span><span>Phase</span><span>Durée</span><span>Slack</span><span>Statut</span><span>%</span>
      </div>
      {sorted.map((t) => {
        const slack = props.cpm?.slackPerTask[t.id] ?? 0;
        const critical = props.cpm?.schedule[t.id]?.isCritical ?? false;
        return (
          <div
            key={t.id}
            onClick={() => props.onTaskClick(t.id)}
            style={{
              display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 70px 80px 80px",
              padding: "10px 12px", fontSize: 13, borderTop: "1px solid #f3f4f6",
              gap: 8, cursor: "pointer", color: "#111827",
              background: critical ? "#fef2f2" : "#fff",
            }}
          >
            <span style={{ fontFamily: "monospace", color: "#6b7280" }}>{t.numero}</span>
            <span>{t.isMilestone && "◆ "}{t.titre}</span>
            <span style={{ fontSize: 11, color: "#4b5563" }}>{PHASE_LABELS[t.phase]}</span>
            <span>{t.durationDays}j</span>
            <span style={{ color: critical ? "#dc2626" : "#16a34a", fontWeight: 600 }}>{slack}j</span>
            <span style={{ fontSize: 11 }}>{STATUS_LABELS[t.status]}</span>
            <span>{t.progressPct}%</span>
          </div>
        );
      })}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "8px 14px", background: "#6366f1", color: "#fff", border: "none",
  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  ...btnPrimary, background: "#fff", color: "#374151", border: "1px solid #d1d5db",
};

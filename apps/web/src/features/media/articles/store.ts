import type { Article, ArticleStatus } from "./types";
import { SEED_ARTICLES } from "./seed";

const LS_KEY = "citurbarea_articles_v1";
const LS_MOD_KEY = "citurbarea_mod_v1";

function nowIso() {
  return new Date().toISOString();
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function isModeratorEnabled(): boolean {
  try {
    return localStorage.getItem(LS_MOD_KEY) === "1";
  } catch {
    return false;
  }
}

export function setModeratorEnabled(on: boolean) {
  try {
    localStorage.setItem(LS_MOD_KEY, on ? "1" : "0");
  } catch {}
}

export function loadAll(): Article[] {
  const stored = safeParse<Article[]>(typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEY) : null, []);
  // First run: initialize from seed
  if (!stored || stored.length === 0) {
    const init = [...SEED_ARTICLES];
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(init));
    } catch {}
    return init;
  }
  return stored;
}

export function saveAll(list: Article[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {}
}

export function listByStatus(status: ArticleStatus): Article[] {
  return loadAll().filter(a => a.status === status).sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||""));
}

export function listPublished(): Article[] {
  return listByStatus("published");
}

export function submitArticle(input: Omit<Article, "id" | "status" | "createdAt">): Article {
  const list = loadAll();
  const id = "u" + Math.random().toString(16).slice(2) + Date.now().toString(16);
  const article: Article = {
    ...input,
    id,
    status: "pending",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  list.unshift(article);
  saveAll(list);
  return article;
}

export function upsertArticle(article: Article): Article {
  const list = loadAll();
  const idx = list.findIndex(a => a.id === article.id);
  const next: Article = { ...article, updatedAt: nowIso() };
  if (idx >= 0) list[idx] = next;
  else list.unshift(next);
  saveAll(list);
  return next;
}

export function setStatus(id: string, status: ArticleStatus) {
  const list = loadAll();
  const idx = list.findIndex(a => a.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], status, updatedAt: nowIso() };
  saveAll(list);
}

export function removeArticle(id: string) {
  const list = loadAll().filter(a => a.id !== id);
  saveAll(list);
}

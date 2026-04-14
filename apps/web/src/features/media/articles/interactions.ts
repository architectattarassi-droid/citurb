import type { Article } from "./types";

export type ArticleComment = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

export type ArticleMeta = {
  likes: number;
  shares: number;
  comments: ArticleComment[];
  liked?: boolean; // session-local like state
};

const LS_KEY = "citurbarea_article_meta_v1";
const LS_LIKED_KEY = "citurbarea_liked_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function loadAll(): Record<string, ArticleMeta> {
  try { return safeParse<Record<string, ArticleMeta>>(localStorage.getItem(LS_KEY), {}); }
  catch { return {}; }
}

function saveAll(map: Record<string, ArticleMeta>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch {}
}

function loadLiked(): Set<string> {
  try { return new Set(safeParse<string[]>(localStorage.getItem(LS_LIKED_KEY), [])); }
  catch { return new Set(); }
}

function saveLiked(set: Set<string>) {
  try { localStorage.setItem(LS_LIKED_KEY, JSON.stringify([...set])); } catch {}
}

function ensureMeta(map: Record<string, ArticleMeta>, articleId: string): ArticleMeta {
  if (!map[articleId]) map[articleId] = { likes: 0, shares: 0, comments: [] };
  return map[articleId];
}

export function getArticleMeta(articleId: string): ArticleMeta {
  const map = loadAll();
  const meta = ensureMeta(map, articleId);
  const liked = loadLiked();
  return { ...meta, liked: liked.has(articleId) };
}

export function toggleLike(articleId: string): ArticleMeta {
  const map = loadAll();
  const meta = ensureMeta(map, articleId);
  const liked = loadLiked();
  if (liked.has(articleId)) {
    liked.delete(articleId);
    meta.likes = Math.max(0, meta.likes - 1);
  } else {
    liked.add(articleId);
    meta.likes += 1;
  }
  saveAll(map);
  saveLiked(liked);
  return { ...meta, liked: liked.has(articleId) };
}

export function addShare(articleId: string): ArticleMeta {
  const map = loadAll();
  const meta = ensureMeta(map, articleId);
  meta.shares += 1;
  saveAll(map);
  const liked = loadLiked();
  return { ...meta, liked: liked.has(articleId) };
}

export function addComment(articleId: string, author: string, text: string): ArticleMeta {
  const map = loadAll();
  const meta = ensureMeta(map, articleId);
  meta.comments.unshift({
    id: `c_${Math.random().toString(36).slice(2)}_${Date.now()}`,
    author: author.trim() || "Membre",
    text: text.trim(),
    createdAt: new Date().toISOString(),
  });
  saveAll(map);
  const liked = loadLiked();
  return { ...meta, liked: liked.has(articleId) };
}

export function seedMetaFromArticles(articles: Article[]) {
  const map = loadAll();
  let changed = false;
  for (const a of articles) {
    if (!map[a.id]) { map[a.id] = { likes: 0, shares: 0, comments: [] }; changed = true; }
  }
  if (changed) saveAll(map);
}

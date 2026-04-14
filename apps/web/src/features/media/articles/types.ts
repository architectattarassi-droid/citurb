export type ArticleStatus = "published" | "pending" | "rejected";

export type ArticleLang = "fr" | "ar" | "en";

export type ArticleCategory =
  | "terrain"
  | "urbanisme"
  | "autorisation"
  | "chantier"
  | "budget"
  | "investissement"
  | "juridique"
  | "autre";

export type Article = {
  id: string;
  title: string;
  lang: ArticleLang;
  category: ArticleCategory;
  tags: string[];
  excerpt: string;
  content: string; // HTML string (rendered safely via dangerouslySetInnerHTML)
  cover?: string; // public URL (e.g. /media/articles/cover-1.jpg)
  status: ArticleStatus;
  authorName?: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
};

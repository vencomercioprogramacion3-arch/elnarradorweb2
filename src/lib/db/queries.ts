import { query, queryOne, execute, parseJsonArray, escapeLike, type Row } from "./mysql";
import { fixLegacyMediaUrls } from "@/lib/legacy-media";

export type Author = {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
};

export type NewsArticle = {
  id: string;
  source: "supabase" | "wordpress";
  title: string;
  summary: string;
  content: string;
  image_url: string;
  category_slug: string;
  category_name: string;
  author_name: string;
  tags: string[];
  published_at: string;
  created_at: string;
  view_count: number;
  is_featured: boolean;
  is_breaking: boolean;
  source_url: string;
  authors?: Author[];
};

function toArticle(row: Row): NewsArticle {
  const article = row as unknown as NewsArticle;
  return {
    ...article,
    image_url: fixLegacyMediaUrls(article.image_url),
    content: fixLegacyMediaUrls(article.content),
    tags: parseJsonArray(row.tags),
  };
}

async function selectNews(where: string, params: unknown[], orderAndLimit: string) {
  const rows = await query(`SELECT * FROM news ${where} ${orderAndLimit}`, params);
  return rows.map(toArticle);
}

export async function getLatestNews(limit = 20, offset = 0) {
  return selectNews("", [limit, offset], "ORDER BY published_at DESC LIMIT ? OFFSET ?");
}

export async function getFeaturedNews() {
  return selectNews("WHERE is_featured = 1", [], "ORDER BY published_at DESC LIMIT 5");
}

export async function getBreakingNews() {
  return selectNews("WHERE is_breaking = 1", [], "ORDER BY published_at DESC LIMIT 3");
}

export async function getNewsByCategory(categorySlug: string, limit = 20) {
  return selectNews("WHERE category_slug = ?", [categorySlug, limit], "ORDER BY published_at DESC LIMIT ?");
}

export async function getNewsById(id: string) {
  const row = await queryOne("SELECT * FROM news WHERE id = ?", [id]);
  // Igual que `.single()` de Supabase: no encontrar la nota es un error
  if (!row) throw new Error(`News not found: ${id}`);
  return toArticle(row);
}

export async function searchNews(searchQuery: string, limit = 20) {
  // La colación utf8mb4_unicode_ci ignora mayúsculas y acentos
  const pattern = `%${escapeLike(searchQuery)}%`;
  return selectNews(
    "WHERE title LIKE ? OR summary LIKE ? OR content LIKE ?",
    [pattern, pattern, pattern, limit],
    "ORDER BY published_at DESC LIMIT ?"
  );
}

export async function getCategories() {
  return query("SELECT * FROM categories ORDER BY sort_order ASC");
}

export async function getMostViewed(limit = 5) {
  return selectNews("", [limit], "ORDER BY view_count DESC LIMIT ?");
}

export async function incrementViewCount(id: string) {
  await execute("UPDATE news SET view_count = view_count + 1 WHERE id = ?", [id]);
}

/* ───── Authors ───── */

export async function getAuthors() {
  return query<Author>("SELECT * FROM authors ORDER BY name ASC");
}

export async function getAuthorsByNewsId(newsId: string) {
  return query<Author>(
    `SELECT a.* FROM news_authors na
     JOIN authors a ON a.id = na.author_id
     WHERE na.news_id = ?`,
    [newsId]
  );
}

export async function getNewsWithAuthors(newsId: string) {
  const article = await getNewsById(newsId);
  const authors = await getAuthorsByNewsId(newsId);
  return { ...article, authors };
}

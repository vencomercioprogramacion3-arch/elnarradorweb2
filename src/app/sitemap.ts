import type { MetadataRoute } from "next";
import { query } from "@/lib/db/mysql";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://elnarradordemexico.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  type Entry = { id: string; published_at: string };

  // Fetch all news articles and magazines; a DB failure only drops them from the sitemap
  const [articles, magazines] = await Promise.all([
    query<Entry>("SELECT id, published_at FROM news ORDER BY published_at DESC").catch(() => [] as Entry[]),
    query<Entry>("SELECT id, published_at FROM magazines ORDER BY published_at DESC").catch(() => [] as Entry[]),
  ]);

  const categories = [
    "mexico", "economia", "cultura", "internacional", "deportes",
    "estilo", "ciencia", "opinion", "sociedad", "tecnologia",
  ];

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/revistas`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/buscar`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((slug) => ({
    url: `${SITE_URL}/${slug}`,
    lastModified: new Date(),
    changeFrequency: "hourly" as const,
    priority: 0.9,
  }));

  const articlePages: MetadataRoute.Sitemap = (articles || []).map((article) => ({
    url: `${SITE_URL}/articulo/${article.id}`,
    lastModified: new Date(article.published_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const magazinePages: MetadataRoute.Sitemap = (magazines || []).map((mag) => ({
    url: `${SITE_URL}/revistas/${mag.id}`,
    lastModified: new Date(mag.published_at),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...articlePages, ...magazinePages];
}

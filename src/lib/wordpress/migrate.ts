import { execute } from "@/lib/db/mysql";

const WP_API = process.env.WORDPRESS_API_URL || "https://elnarradordemexico.com/wp-json/wp/v2";

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

type WPPost = {
  id: number;
  date: string;
  date_gmt?: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  link: string;
  categories: number[];
  tags: number[];
  featured_media: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string }>;
    "wp:term"?: Array<Array<{ id: number; name: string; slug: string }>>;
    author?: Array<{ name: string }>;
  };
};

type WPCategory = {
  id: number;
  name: string;
  slug: string;
  count: number;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

export async function fetchWPCategories(): Promise<WPCategory[]> {
  const res = await fetch(`${WP_API}/categories?per_page=100`);
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
  return res.json();
}

export async function fetchWPPosts(page = 1, perPage = 20): Promise<{ posts: WPPost[]; totalPages: number }> {
  const res = await fetch(
    `${WP_API}/posts?page=${page}&per_page=${perPage}&_embed=1&orderby=date&order=desc`
  );
  if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);

  const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1");
  const posts = await res.json();
  return { posts, totalPages };
}

export async function migrateFromWordPress(options: {
  maxPages?: number;
  dryRun?: boolean;
}) {
  const { maxPages = 1, dryRun = false } = options;

  const results = {
    categoriesMigrated: 0,
    postsMigrated: 0,
    postsSkipped: 0,
    errors: [] as string[],
  };

  // Step 1: Fetch and sync categories
  try {
    const wpCategories = await fetchWPCategories();

    if (!dryRun) {
      for (const cat of wpCategories) {
        try {
          await execute(
            `INSERT INTO categories (id, name, sort_order) VALUES (?, ?, 0)
             ON DUPLICATE KEY UPDATE name = VALUES(name)`,
            [cat.slug, cat.name]
          );
          results.categoriesMigrated++;
        } catch (error) {
          results.errors.push(`Category ${cat.name}: ${errorMessage(error)}`);
        }
      }
    } else {
      results.categoriesMigrated = wpCategories.length;
    }
  } catch (e) {
    results.errors.push(`Categories fetch failed: ${e}`);
  }

  // Step 2: Fetch and migrate posts
  for (let page = 1; page <= maxPages; page++) {
    try {
      const { posts, totalPages } = await fetchWPPosts(page);

      for (const post of posts) {
        const imageUrl =
          post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "";
        const categories = post._embedded?.["wp:term"]?.[0] || [];
        const authorName = post._embedded?.author?.[0]?.name || "Redacción";
        const tags =
          post._embedded?.["wp:term"]?.[1]?.map((t) => t.name) || [];
        const category = categories[0];

        const newsItem = {
          id: `wp-${post.id}`,
          source: "wordpress" as const,
          title: stripHtml(post.title.rendered),
          summary: stripHtml(post.excerpt.rendered).substring(0, 300),
          content: post.content.rendered,
          image_url: imageUrl,
          category_slug: category?.slug || "",
          category_name: category?.name || "",
          author_name: authorName,
          tags,
          published_at: new Date(post.date_gmt ? `${post.date_gmt}Z` : post.date),
          source_url: post.link,
          view_count: 0,
          is_featured: false,
          is_breaking: false,
        };

        if (!dryRun) {
          try {
            await execute(
              `INSERT INTO news
                 (id, source, title, summary, content, image_url, category_slug, category_name,
                  author_name, tags, published_at, source_url, view_count, is_featured, is_breaking, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 title = VALUES(title), summary = VALUES(summary), content = VALUES(content),
                 image_url = VALUES(image_url), category_slug = VALUES(category_slug),
                 category_name = VALUES(category_name), author_name = VALUES(author_name),
                 tags = VALUES(tags), published_at = VALUES(published_at), source_url = VALUES(source_url)`,
              [
                newsItem.id, newsItem.source, newsItem.title, newsItem.summary, newsItem.content,
                newsItem.image_url, newsItem.category_slug, newsItem.category_name, newsItem.author_name,
                JSON.stringify(newsItem.tags), newsItem.published_at, newsItem.source_url,
                newsItem.view_count, newsItem.is_featured, newsItem.is_breaking, new Date(),
              ]
            );
            results.postsMigrated++;
          } catch (error) {
            results.errors.push(
              `Post "${newsItem.title.substring(0, 40)}...": ${errorMessage(error)}`
            );
            results.postsSkipped++;
          }
        } else {
          results.postsMigrated++;
        }
      }

      if (page >= totalPages) break;
    } catch (e) {
      results.errors.push(`Page ${page} fetch failed: ${e}`);
      break;
    }
  }

  return results;
}

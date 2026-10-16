import { query, queryOne } from "./mysql";

export type Magazine = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  pdf_url: string;
  edition: string;
  published_at: string;
  created_at: string;
  is_featured: boolean;
  view_count: number;
  download_count: number;
};

export async function getMagazines(limit = 20) {
  return query<Magazine>("SELECT * FROM magazines ORDER BY published_at DESC LIMIT ?", [limit]);
}

export async function getMagazineById(id: string) {
  const magazine = await queryOne<Magazine>("SELECT * FROM magazines WHERE id = ?", [id]);
  if (!magazine) throw new Error(`Magazine not found: ${id}`);
  return magazine;
}

export async function getFeaturedMagazines() {
  return query<Magazine>(
    "SELECT * FROM magazines WHERE is_featured = 1 ORDER BY published_at DESC LIMIT 3"
  );
}

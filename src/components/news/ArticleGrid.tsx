import type { NewsArticle } from "@/lib/db/queries";
import ArticleCard from "./ArticleCard";

type ArticleGridProps = {
  articles: NewsArticle[];
  columns?: 2 | 3;
};

export default function ArticleGrid({
  articles,
  columns = 3,
}: ArticleGridProps) {
  const gridClass =
    columns === 2
      ? "grid grid-cols-1 md:grid-cols-2 gap-6"
      : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";

  return (
    <div className={gridClass}>
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

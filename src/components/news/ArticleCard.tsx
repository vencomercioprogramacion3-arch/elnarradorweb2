import Link from "next/link";
import Image from "next/image";
import type { NewsArticle } from "@/lib/db/queries";
import CategoryBadge from "./CategoryBadge";

type ArticleCardProps = {
  article: NewsArticle;
  variant?: "default" | "horizontal";
};

export default function ArticleCard({
  article,
  variant = "default",
}: ArticleCardProps) {
  if (variant === "horizontal") {
    return (
      <Link
        href={`/articulo/${article.id}`}
        className="flex gap-4 group cursor-pointer bg-surface rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow duration-300"
      >
        <div className="relative w-48 shrink-0 bg-border">
          {article.image_url ? (
            <Image
              src={article.image_url}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="192px"
            />
          ) : (
            <div className="w-full h-full bg-border" />
          )}
        </div>
        <div className="py-4 pr-4 flex flex-col justify-center">
          <CategoryBadge name={article.category_name} small />
          <h3 className="font-heading text-lg font-semibold text-foreground mt-2 mb-2 line-clamp-2 group-hover:text-gold transition-colors duration-200">
            {article.title}
          </h3>
          <p className="text-muted text-sm line-clamp-2">{article.summary}</p>
          <div className="mt-2 flex items-center gap-3 text-muted-light text-xs">
            <span>{article.author_name}</span>
            <span>
              {new Date(article.published_at).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/articulo/${article.id}`}
      className="group cursor-pointer bg-surface rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow duration-300"
    >
      <div className="relative aspect-video bg-border">
        {article.image_url ? (
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-border flex items-center justify-center">
            <svg
              className="w-12 h-12 text-muted-light"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <CategoryBadge name={article.category_name} small />
        <h3 className="font-heading text-lg font-semibold text-foreground mt-2 mb-2 line-clamp-2 group-hover:text-gold transition-colors duration-200">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-muted text-sm line-clamp-2 mb-3">
            {article.summary}
          </p>
        )}
        <div className="flex items-center justify-between text-muted-light text-xs">
          <span>{article.author_name}</span>
          <span>
            {new Date(article.published_at).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}

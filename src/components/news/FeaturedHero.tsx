import Link from "next/link";
import Image from "next/image";
import type { NewsArticle } from "@/lib/db/queries";
import CategoryBadge from "./CategoryBadge";

type FeaturedHeroProps = {
  article: NewsArticle;
};

export default function FeaturedHero({ article }: FeaturedHeroProps) {
  return (
    <Link
      href={`/articulo/${article.id}`}
      className="relative block h-[400px] md:h-[500px] rounded-lg overflow-hidden group cursor-pointer"
    >
      {article.image_url ? (
        <Image
          src={article.image_url}
          alt={article.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          sizes="(max-width: 768px) 100vw, 66vw"
          priority
        />
      ) : (
        <div className="w-full h-full bg-primary" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <CategoryBadge name={article.category_name} />
        <h2 className="font-heading text-2xl md:text-4xl font-bold text-white mt-3 mb-3 leading-tight line-clamp-3">
          {article.title}
        </h2>
        {article.summary && (
          <p className="text-white/85 text-sm md:text-base line-clamp-2 max-w-2xl">
            {article.summary}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4 text-white/75 text-sm">
          <span>{article.author_name}</span>
          <span>
            {new Date(article.published_at).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}

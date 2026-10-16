import Link from "next/link";
import Image from "next/image";
import type { NewsArticle } from "@/lib/db/queries";

type SidebarProps = {
  title: string;
  articles: NewsArticle[];
};

export default function Sidebar({ title, articles }: SidebarProps) {
  return (
    <aside className="bg-surface rounded-lg p-5 border border-border">
      <h3 className="font-heading text-lg font-bold text-foreground mb-4 pb-3 border-b-2 border-gold">
        {title}
      </h3>
      <div className="space-y-4">
        {articles.map((article, index) => (
          <Link
            key={article.id}
            href={`/articulo/${article.id}`}
            className="flex gap-3 group cursor-pointer"
          >
            <div className="relative w-20 h-20 shrink-0 rounded overflow-hidden bg-border">
              {article.image_url ? (
                <Image
                  src={article.image_url}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="80px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-light text-xs">
                  {index + 1}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gold font-medium uppercase">
                {article.category_name}
              </span>
              <h4 className="text-sm font-medium text-foreground leading-tight mt-1 line-clamp-3 group-hover:text-gold transition-colors duration-200">
                {article.title}
              </h4>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

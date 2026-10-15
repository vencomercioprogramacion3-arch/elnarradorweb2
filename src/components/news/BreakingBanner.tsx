import Link from "next/link";
import type { NewsArticle } from "@/lib/db/queries";

type BreakingBannerProps = {
  articles: NewsArticle[];
};

export default function BreakingBanner({ articles }: BreakingBannerProps) {
  if (articles.length === 0) return null;

  return (
    <div className="bg-accent-red text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-4">
        <span className="shrink-0 bg-white text-accent-red text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider">
          Última hora
        </span>
        <div className="overflow-hidden whitespace-nowrap">
          <div className="inline-flex gap-12 animate-[scroll_30s_linear_infinite]">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/articulo/${article.id}`}
                className="text-sm font-medium hover:underline cursor-pointer"
              >
                {article.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

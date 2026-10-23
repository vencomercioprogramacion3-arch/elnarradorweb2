"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type NewsTickerProps = {
  articles: Array<{
    id: string;
    title: string;
    category_name: string;
  }>;
};

export default function NewsTicker({ articles }: NewsTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (articles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [articles.length]);

  if (articles.length === 0) return null;

  return (
    <div className="bg-[#1C1917] text-white border-b border-gold/30">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-4">
        {/* Badge */}
        <span className="shrink-0 bg-accent-red text-white text-[10px] font-bold px-3 py-1 rounded-sm uppercase tracking-wider animate-pulse">
          En vivo
        </span>

        {/* Ticker with fade transition */}
        <div className="flex-1 overflow-hidden relative h-5">
          {articles.map((article, index) => (
            <Link
              key={article.id}
              href={`/articulo/${article.id}`}
              className={`absolute inset-0 flex items-center text-sm font-medium transition-all duration-700 cursor-pointer hover:text-gold ${
                index === currentIndex
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <span className="text-gold text-xs mr-2 shrink-0">
                {article.category_name}
              </span>
              <span className="truncate">{article.title}</span>
            </Link>
          ))}
        </div>

        {/* Dots indicator */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {articles.slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 cursor-pointer ${
                i === currentIndex % 5 ? "bg-gold" : "bg-white/30"
              }`}
              aria-label={`Noticia ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

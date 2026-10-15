import { searchNews } from "@/lib/db/queries";
import ArticleCard from "@/components/news/ArticleCard";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: Props) {
  const { q } = await searchParams;
  return {
    title: q
      ? `Resultados para "${q}" - El Narrador de México`
      : "Buscar - El Narrador de México",
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const results = q ? await searchNews(q) : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
          Buscar Noticias
        </h1>
        {q && (
          <p className="text-muted">
            {results.length} resultado{results.length !== 1 && "s"} para{" "}
            <span className="text-gold font-medium">&ldquo;{q}&rdquo;</span>
          </p>
        )}
        <div className="h-px bg-border mt-4" />
      </div>

      {!q && (
        <p className="text-center text-muted py-20">
          Escribe en la barra de búsqueda para encontrar noticias.
        </p>
      )}

      {q && results.length === 0 && (
        <div className="text-center py-20">
          <svg
            className="w-16 h-16 text-muted-light mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <p className="text-muted text-lg">
            No se encontraron resultados para &ldquo;{q}&rdquo;
          </p>
          <p className="text-muted-light text-sm mt-2">
            Intenta con otros términos de búsqueda.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              variant="horizontal"
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { getNewsByCategory, getMostViewed } from "@/lib/db/queries";
import ArticleGrid from "@/components/news/ArticleGrid";
import Sidebar from "@/components/layout/Sidebar";
import { notFound } from "next/navigation";

export const revalidate = 300;

const categoryMap: Record<string, string> = {
  mexico: "México",
  economia: "Economía",
  cultura: "Cultura",
  internacional: "Internacional",
  deportes: "Deportes",
  estilo: "Estilo",
  ciencia: "Ciencia",
  opinion: "Opinión",
  sociedad: "Sociedad",
  tecnologia: "Tecnología",
};

type Props = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  const name = categoryMap[category];
  if (!name) return {};
  return {
    title: `${name} - El Narrador de México`,
    description: `Noticias de ${name} en El Narrador de México`,
  };
}

export function generateStaticParams() {
  return Object.keys(categoryMap).map((category) => ({ category }));
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const categoryName = categoryMap[category];

  if (!categoryName) {
    notFound();
  }

  const [articles, mostViewed] = await Promise.all([
    getNewsByCategory(category, 20),
    getMostViewed(5),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Category header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gold rounded-full" />
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            {categoryName}
          </h1>
        </div>
        <div className="h-px bg-border mt-4" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {articles.length > 0 ? (
            <ArticleGrid articles={articles} columns={2} />
          ) : (
            <div className="text-center py-20">
              <p className="text-muted text-lg">
                No hay noticias en esta categoría por el momento.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0">
          <Sidebar title="Más Leídas" articles={mostViewed} />
        </div>
      </div>
    </div>
  );
}

import dynamic from "next/dynamic";
import { Suspense } from "react";
import {
  getLatestNews,
  getFeaturedNews,
  getMostViewed,
} from "@/lib/db/queries";
import { getMagazines } from "@/lib/db/magazines";
import HeroBanner from "@/components/news/HeroBanner";
import FeaturedHero from "@/components/news/FeaturedHero";
import ArticleGrid from "@/components/news/ArticleGrid";
import Sidebar from "@/components/layout/Sidebar";
import VideoSection from "@/components/video/VideoSection";
import AdUnit from "@/components/ads/AdUnit";
import { ADSENSE_SLOTS } from "@/lib/ads/config";

// Dynamic imports — reduce initial JS bundle for below-fold content
const NewsTicker = dynamic(() => import("@/components/news/NewsTicker"));
const EditorialSection = dynamic(() => import("@/components/news/EditorialSection"));
const MagazineShowcase = dynamic(() => import("@/components/magazines/MagazineShowcase"));

export const revalidate = 300;

export default async function HomePage() {
  const [latest, featured, mostViewed, magazines] = await Promise.all([
    getLatestNews(12),
    getFeaturedNews(),
    getMostViewed(5),
    getMagazines(3),
  ]);

  const heroArticle = featured[0] || latest[0];
  const gridArticles = latest.filter((a) => a.id !== heroArticle?.id);
  const firstHalf = gridArticles.slice(0, 6);
  const secondHalf = gridArticles.slice(6);

  return (
    <>
      {/* Brand banner with Mexican landscapes */}
      <HeroBanner />

      {/* Animated news ticker */}
      <NewsTicker articles={latest.slice(0, 8)} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {heroArticle && (
              <section className="mb-10">
                <FeaturedHero article={heroArticle} />
              </section>
            )}

            <section>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Últimas Noticias
                </h2>
                <div className="flex-1 h-px bg-border" />
              </div>
              <ArticleGrid articles={firstHalf} />
            </section>

            {/* Anuncio entre secciones */}
            <AdUnit slot={ADSENSE_SLOTS.home} />

            {/* Editorial B&W section */}
            <EditorialSection />

            {secondHalf.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="font-heading text-2xl font-bold text-foreground">
                    Más Noticias
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <ArticleGrid articles={secondHalf} />
              </section>
            )}

            {/* Últimos videos del canal de YouTube (se oculta si no hay canal configurado) */}
            <Suspense fallback={null}>
              <VideoSection />
            </Suspense>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 shrink-0 space-y-6">
            <Sidebar title="Más Leídas" articles={mostViewed} />
            <MagazineShowcase magazines={magazines} />
            {featured.length > 1 && (
              <Sidebar title="Destacadas" articles={featured.slice(1)} />
            )}
            <AdUnit slot={ADSENSE_SLOTS.sidebar} />
          </aside>
        </div>
      </div>
    </>
  );
}

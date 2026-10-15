import { getMagazines } from "@/lib/db/magazines";
import MagazineCard from "@/components/magazines/MagazineCard";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Revistas - El Narrador de México",
  description:
    "Lee nuestras revistas digitales. Descarga o consulta en línea las publicaciones de El Narrador de México.",
  openGraph: {
    title: "Revistas - El Narrador de México",
    description:
      "Lee nuestras revistas digitales. Descarga o consulta en línea las publicaciones de El Narrador de México.",
    type: "website",
  },
};

export default async function RevistasPage() {
  const magazines = await getMagazines();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gold rounded-full" />
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            Revistas
          </h1>
        </div>
        <p className="text-muted mt-3 max-w-2xl">
          Consulta y descarga nuestras publicaciones digitales. Cada edición
          trae análisis, reportajes y contenido exclusivo.
        </p>
        <div className="h-px bg-border mt-6" />
      </div>

      {/* Magazine Grid */}
      {magazines.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {magazines.map((magazine) => (
            <MagazineCard key={magazine.id} magazine={magazine} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <svg
            className="w-20 h-20 text-muted-light mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
          <p className="text-muted text-lg">
            Próximamente nuevas ediciones de nuestra revista.
          </p>
          <p className="text-muted-light text-sm mt-2">
            Vuelve pronto para consultar nuestras publicaciones.
          </p>
        </div>
      )}
    </div>
  );
}

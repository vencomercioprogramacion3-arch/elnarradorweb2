import { getMagazineById } from "@/lib/db/magazines";
import { notFound } from "next/navigation";
import Link from "next/link";
import ShareButtonsMagazine from "./ShareButtonsMagazine";

export const revalidate = 300;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const magazine = await getMagazineById(id);
    return {
      title: `${magazine.title} - Revistas | El Narrador de México`,
      description:
        magazine.description ||
        `Lee la revista "${magazine.title}" de El Narrador de México`,
      openGraph: {
        title: `${magazine.title} - Revista`,
        description:
          magazine.description ||
          `Lee la revista "${magazine.title}" de El Narrador de México`,
        images: magazine.cover_image_url ? [magazine.cover_image_url] : [],
        type: "article",
      },
    };
  } catch {
    return {};
  }
}

export default async function MagazineViewPage({ params }: Props) {
  const { id } = await params;

  let magazine;
  try {
    magazine = await getMagazineById(id);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link
          href="/"
          className="hover:text-gold transition-colors duration-200 cursor-pointer"
        >
          Inicio
        </Link>
        <span>/</span>
        <Link
          href="/revistas"
          className="hover:text-gold transition-colors duration-200 cursor-pointer"
        >
          Revistas
        </Link>
        <span>/</span>
        <span className="text-muted-light line-clamp-1">{magazine.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
          {magazine.title}
        </h1>
        {magazine.edition && (
          <p className="text-gold font-medium mb-2">{magazine.edition}</p>
        )}
        {magazine.description && (
          <p className="text-muted text-lg max-w-3xl">{magazine.description}</p>
        )}

        <div className="flex items-center flex-wrap gap-4 mt-4">
          <time className="text-sm text-muted-light">
            {new Date(magazine.published_at).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
          <a
            href={magazine.pdf_url}
            download
            className="inline-flex items-center gap-2 bg-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-dark transition-colors duration-200 cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Descargar PDF
          </a>
          <ShareButtonsMagazine title={magazine.title} />
        </div>
        <div className="h-px bg-border mt-6" />
      </div>

      {/* PDF Viewer */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <iframe
          src={`${magazine.pdf_url}#toolbar=1&navpanes=0`}
          className="w-full h-[80vh] min-h-[600px]"
          title={magazine.title}
        />
      </div>
    </div>
  );
}

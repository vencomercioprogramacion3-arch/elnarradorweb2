import Link from "next/link";
import Image from "next/image";
import type { Magazine } from "@/lib/db/magazines";

type MagazineShowcaseProps = {
  magazines: Magazine[];
};

export default function MagazineShowcase({ magazines }: MagazineShowcaseProps) {
  if (magazines.length === 0) return null;

  return (
    <section className="my-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 text-gold"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Nuestras Revistas
          </h2>
          <div className="flex-1 h-px bg-border ml-3" />
        </div>
        <Link
          href="/revistas"
          className="text-sm text-gold hover:text-gold-dark font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap"
        >
          Ver todas &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {magazines.map((magazine) => (
          <Link
            key={magazine.id}
            href={`/revistas/${magazine.id}`}
            className="group cursor-pointer"
          >
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-border border border-border shadow-sm hover:shadow-lg transition-shadow duration-300">
              {magazine.cover_image_url ? (
                <Image
                  src={magazine.cover_image_url}
                  alt={magazine.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gold/20 to-primary/10 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gold/30"
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
                </div>
              )}
              {magazine.is_featured && (
                <div className="absolute top-2 left-2 bg-gold text-white text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase">
                  Nueva
                </div>
              )}
            </div>
            <h3 className="mt-2 text-sm font-medium text-foreground line-clamp-2 group-hover:text-gold transition-colors duration-200">
              {magazine.title}
            </h3>
            {magazine.edition && (
              <p className="text-xs text-muted mt-0.5">{magazine.edition}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

import Link from "next/link";
import Image from "next/image";
import type { Magazine } from "@/lib/db/magazines";

type MagazineCardProps = {
  magazine: Magazine;
};

export default function MagazineCard({ magazine }: MagazineCardProps) {
  return (
    <Link
      href={`/revistas/${magazine.id}`}
      className="group cursor-pointer bg-surface rounded-lg border border-border overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] bg-border">
        {magazine.cover_image_url ? (
          <Image
            src={magazine.cover_image_url}
            alt={magazine.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gold/20 to-primary/10 flex flex-col items-center justify-center p-6">
            <svg
              className="w-16 h-16 text-gold/40 mb-3"
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
            <span className="text-sm text-muted font-heading font-semibold text-center">
              {magazine.title}
            </span>
          </div>
        )}

        {/* Featured badge */}
        {magazine.is_featured && (
          <div className="absolute top-3 left-3 bg-gold text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">
            Destacada
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-heading text-base font-semibold text-foreground line-clamp-2 group-hover:text-gold transition-colors duration-200">
          {magazine.title}
        </h3>
        {magazine.edition && (
          <p className="text-xs text-gold mt-1 font-medium">
            {magazine.edition}
          </p>
        )}
        {magazine.description && (
          <p className="text-sm text-muted mt-2 line-clamp-2">
            {magazine.description}
          </p>
        )}
        <p className="text-xs text-muted-light mt-3">
          {new Date(magazine.published_at).toLocaleDateString("es-MX", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </Link>
  );
}

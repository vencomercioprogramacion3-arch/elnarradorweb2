import Link from "next/link";
import Image from "next/image";

const footerLinks = [
  { name: "Política de Privacidad", href: "/privacidad" },
  { name: "Términos y Condiciones", href: "/terminos" },
  { name: "Código de Ética", href: "/etica" },
  { name: "Contacto", href: "/contacto" },
];

const categories = [
  { name: "México", slug: "mexico" },
  { name: "Economía", slug: "economia" },
  { name: "Cultura", slug: "cultura" },
  { name: "Internacional", slug: "internacional" },
  { name: "Deportes", slug: "deportes" },
  { name: "Tecnología", slug: "tecnologia" },
];

export default function Footer() {
  return (
    <footer className="bg-[#1C1917] text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and description */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/images/El Narrador logo sin fondo.png"
                alt="El Narrador"
                width={40}
                height={40}
                className="rounded-sm"
              />
              <div>
                <h2 className="font-heading text-xl font-bold leading-tight">
                  El Narrador
                </h2>
                <span className="text-xs text-white/75 tracking-widest uppercase">
                  de México
                </span>
              </div>
            </div>
            <p className="text-white/75 text-sm leading-relaxed">
              Tu fuente confiable de noticias de México y el mundo. Periodismo
              comprometido con la verdad.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-heading text-lg font-semibold mb-4 text-gold">
              Secciones
            </h3>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/${cat.slug}`}
                    className="text-white/75 hover:text-gold text-sm transition-colors duration-200 cursor-pointer"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading text-lg font-semibold mb-4 text-gold">
              Contacto
            </h3>
            <div className="space-y-3 text-sm text-white/75">
              <p className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 mt-0.5 text-gold shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
                Álvaro Obregón 452, Zona Centro, Aguascalientes
              </p>
              <p className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-gold shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
                5610973271
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/70 text-sm">
            &copy; {new Date().getFullYear()} El Narrador de México. Todos los
            derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/70 hover:text-gold text-sm transition-colors duration-200 cursor-pointer"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

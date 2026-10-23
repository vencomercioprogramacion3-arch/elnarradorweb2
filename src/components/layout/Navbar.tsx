"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SearchBar from "@/components/ui/SearchBar";
import DarkModeToggle from "@/components/ui/DarkModeToggle";

const categories = [
  { name: "México", slug: "mexico" },
  { name: "Economía", slug: "economia" },
  { name: "Cultura", slug: "cultura" },
  { name: "Internacional", slug: "internacional" },
  { name: "Deportes", slug: "deportes" },
  { name: "Estilo", slug: "estilo" },
  { name: "Ciencia", slug: "ciencia" },
  { name: "Opinión", slug: "opinion" },
  { name: "Sociedad", slug: "sociedad" },
  { name: "Tecnología", slug: "tecnologia" },
  { name: "Revistas", slug: "revistas" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Top bar with logo */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <Image
              src="/images/El Narrador logo sin fondo.png"
              alt="El Narrador"
              width={40}
              height={40}
              className="rounded-sm"
            />
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground leading-tight">
                El Narrador
              </h1>
              <span className="text-xs text-muted tracking-widest uppercase">
                de México
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            <SearchBar />
            <DarkModeToggle />
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 cursor-pointer"
            aria-label="Abrir menú"
          >
            <svg
              className="w-6 h-6 text-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Categories bar */}
      <nav className="bg-[#1C1917] border-b-2 border-gold">
        <div className="max-w-7xl mx-auto px-4">
          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="px-4 py-2.5 text-sm font-medium text-white/90 hover:text-gold whitespace-nowrap transition-colors duration-200 cursor-pointer"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-border shadow-lg">
          <div className="px-4 py-3">
            <SearchBar />
          </div>
          <nav className="px-4 pb-3">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-foreground hover:text-gold transition-colors duration-200 cursor-pointer"
              >
                {cat.name}
              </Link>
            ))}
          </nav>
          <div className="px-4 pb-3">
            <DarkModeToggle />
          </div>
        </div>
      )}
    </header>
  );
}

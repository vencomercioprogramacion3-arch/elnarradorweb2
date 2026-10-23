"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Magazine = {
  id: string;
  title: string;
  description: string;
  edition: string;
  cover_image_url: string;
  pdf_url: string;
  is_featured: boolean;
  published_at: string;
};

type MagazineListResponse = {
  magazines?: Magazine[];
  error?: string;
};

type UpdateResponse = {
  magazine?: Magazine;
  success?: boolean;
  error?: string;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function EditarRevistasPage() {
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [edition, setEdition] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMagazines() {
      try {
        const response = await fetch("/api/admin/revistas", {
          signal: controller.signal,
        });
        const result: MagazineListResponse = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "No se pudo cargar la lista de revistas.");
        }
        setMagazines(result.magazines ?? []);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la lista de revistas."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoadingList(false);
      }
    }

    void loadMagazines();
    return () => controller.abort();
  }, []);

  const filteredMagazines = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return magazines;
    return magazines.filter((magazine) =>
      normalizeSearch(`${magazine.title} ${magazine.edition}`).includes(query)
    );
  }, [magazines, search]);

  function selectMagazine(magazine: Magazine) {
    setSelectedId(magazine.id);
    setTitle(magazine.title);
    setEdition(magazine.edition);
    setDescription(magazine.description ?? "");
    setIsFeatured(Boolean(magazine.is_featured));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const form = event.currentTarget;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData(form);
      const response = await fetch(
        `/api/admin/revistas/${encodeURIComponent(selectedId)}`,
        {
          method: "PATCH",
          body: formData,
          signal: AbortSignal.timeout(120_000),
        }
      );
      const result: UpdateResponse = await response.json();

      if (!response.ok || !result.magazine) {
        throw new Error(result.error ?? "No se pudo guardar la revista.");
      }

      const updatedMagazine = {
        ...result.magazine,
        is_featured: Boolean(result.magazine.is_featured),
      };
      setMagazines((current) =>
        current.map((magazine) =>
          magazine.id === updatedMagazine.id ? updatedMagazine : magazine
        )
      );
      setSuccess(
        "Cambios guardados. La revista conserva el mismo enlace y no se creó una copia."
      );
      const pdfInput = form.querySelector<HTMLInputElement>('input[name="pdfFile"]');
      const coverInput = form.querySelector<HTMLInputElement>('input[name="coverImage"]');
      if (pdfInput) pdfInput.value = "";
      if (coverInput) coverInput.value = "";
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la revista. Inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedMagazine = magazines.find((magazine) => magazine.id === selectedId);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Editar revistas subidas</h1>
        <p className="mt-1 text-gray-600">
          Busca una edición publicada, selecciónala y actualiza sus datos, portada o PDF.
        </p>
      </div>

      <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950">
        <h2 className="font-semibold">Instrucciones para editar una revista</h2>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Busca por el título o la edición, por ejemplo «Cuba» o «Febrero 2026».</li>
          <li>Revisa el título y la edición de la lista antes de pulsar «Editar esta revista».</li>
          <li>Selecciona portada o PDF solo si necesitas reemplazar ese archivo.</li>
          <li>Si dejas un archivo sin seleccionar, se conserva el archivo actual.</li>
          <li>Pulsa «Guardar cambios»; se actualiza esta revista y se conserva su enlace público.</li>
        </ol>
        <p className="mt-3 font-semibold">
          Para crear una edición nueva, usa «Nueva Revista». No uses ese formulario para corregir
          una revista publicada porque crearía otra ficha.
        </p>
      </section>

      {error && (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.5fr)]">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">1. Encuentra la revista</h2>
          <label htmlFor="magazine-search" className="mt-4 block text-sm font-medium text-gray-700">
            Buscar por título o edición
          </label>
          <input
            id="magazine-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej.: Cuba, Febrero 2026"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto">
            {loadingList ? (
              <p className="py-6 text-center text-sm text-gray-500">Cargando revistas...</p>
            ) : filteredMagazines.length > 0 ? (
              filteredMagazines.map((magazine) => (
                <div
                  key={magazine.id}
                  className={`rounded-lg border p-3 ${
                    selectedId === magazine.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <p className="font-medium text-gray-900">{magazine.title}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {magazine.edition || "Sin edición indicada"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Publicada:{" "}
                    {new Date(magazine.published_at).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => selectMagazine(magazine)}
                    className="mt-3 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
                  >
                    {selectedId === magazine.id ? "Seleccionada" : "Editar esta revista"}
                  </button>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-gray-500">
                {magazines.length === 0
                  ? "Todavía no hay revistas publicadas."
                  : "No encontramos revistas con ese título o edición."}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">2. Edita la revista seleccionada</h2>
          {!selectedMagazine ? (
            <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              Primero busca y selecciona una revista de la lista. Así confirmarás que los cambios
              se aplicarán a la edición correcta.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-5">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">Editando esta ficha</p>
                <p className="mt-1 font-semibold text-gray-900">{selectedMagazine.title}</p>
                <p className="text-sm text-gray-600">{selectedMagazine.edition}</p>
                <p className="mt-2 text-xs text-gray-500">
                  Su identificador y enlace público no cambiarán.
                </p>
              </div>

              <div>
                <label htmlFor="magazine-title" className="block text-sm font-semibold text-gray-700">
                  Título de la revista
                </label>
                <input
                  id="magazine-title"
                  name="title"
                  required
                  maxLength={200}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="magazine-edition" className="block text-sm font-semibold text-gray-700">
                  Edición (mes/año o número)
                </label>
                <input
                  id="magazine-edition"
                  name="edition"
                  value={edition}
                  onChange={(event) => setEdition(event.target.value)}
                  placeholder="Ej.: Febrero 2026"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="magazine-description" className="block text-sm font-semibold text-gray-700">
                  Descripción
                </label>
                <textarea
                  id="magazine-description"
                  name="description"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-1 w-full resize-y rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={isFeatured}
                  onChange={(event) => setIsFeatured(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-800">Revista destacada</span>
                  <span className="block text-xs text-gray-500">
                    Activa para mostrar la etiqueta de destacada en el sitio.
                  </span>
                </span>
              </label>

              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800">Portada actual</h3>
                {selectedMagazine.cover_image_url ? (
                  <Image
                    src={selectedMagazine.cover_image_url}
                    alt={`Portada actual de ${selectedMagazine.title}`}
                    width={480}
                    height={640}
                    unoptimized
                    className="mt-3 max-h-64 max-w-full rounded border border-gray-200 object-contain"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-500">Esta revista no tiene portada guardada.</p>
                )}
                <label htmlFor="magazine-cover" className="mt-4 block text-sm font-medium text-gray-700">
                  Reemplazar portada (opcional; máximo 8 MB)
                </label>
                <input
                  id="magazine-cover"
                  name="coverImage"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Déjalo vacío para conservar la portada actual.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800">PDF actual</h3>
                <a
                  href={`/api/revistas/${encodeURIComponent(selectedMagazine.id)}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-blue-700 underline"
                >
                  Abrir el PDF guardado actualmente
                </a>
                <label htmlFor="magazine-pdf" className="mt-4 block text-sm font-medium text-gray-700">
                  Reemplazar PDF (opcional; máximo 50 MB)
                </label>
                <input
                  id="magazine-pdf"
                  name="pdfFile"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Déjalo vacío para conservar el PDF actual. Si el PDF está mostrando un error,
                  selecciona aquí el archivo correcto.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando cambios..." : "Guardar cambios de esta revista"}
              </button>
            </form>
          )}
        </section>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        ¿Necesitas publicar otra edición?{" "}
        <Link href="/admin/revistas/nueva" className="font-medium text-blue-700 underline">
          Ir a Nueva Revista
        </Link>
      </p>
    </div>
  );
}

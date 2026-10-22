"use client";

import { useEffect, useState } from "react";

type MagazinePdfViewerProps = {
  id: string;
  title: string;
};

export default function MagazinePdfViewer({ id, title }: MagazinePdfViewerProps) {
  const [status, setStatus] = useState<"checking" | "ready" | "missing" | "error">(
    "checking"
  );
  const pdfUrl = `/api/revistas/${encodeURIComponent(id)}/pdf`;

  useEffect(() => {
    const controller = new AbortController();

    async function checkPdf() {
      try {
        const response = await fetch(pdfUrl, {
          headers: { Range: "bytes=0-0" },
          signal: controller.signal,
        });
        await response.body?.cancel();

        if (response.ok) {
          setStatus("ready");
        } else if (response.status === 404) {
          setStatus("missing");
        } else {
          setStatus("error");
        }
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }

    void checkPdf();
    return () => controller.abort();
  }, [pdfUrl]);

  if (status === "checking") {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-border bg-surface text-muted">
        Verificando disponibilidad del PDF...
      </div>
    );
  }

  if (status === "missing" || status === "error") {
    return (
      <div
        role="status"
        className="rounded-lg border border-border bg-surface px-6 py-12 text-center"
      >
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {status === "missing"
            ? "El PDF de esta revista no está disponible"
            : "No se pudo cargar el PDF"}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          {status === "missing"
            ? "El archivo ya no se encuentra en el almacenamiento. Un administrador debe volver a cargar el PDF de esta edición."
            : "No fue posible conectar con el almacenamiento. Intenta recargar la página en unos minutos."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <a
          href={`${pdfUrl}?download=1`}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-gold-dark"
        >
          Descargar PDF
        </a>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <iframe
          src={`${pdfUrl}#toolbar=1&navpanes=0`}
          className="h-[80vh] min-h-[600px] w-full"
          title={title}
        />
      </div>
    </div>
  );
}

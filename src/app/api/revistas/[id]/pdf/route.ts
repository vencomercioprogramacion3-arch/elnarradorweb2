import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db/mysql";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

const STORAGE_PATHS = [
  {
    hostname: "media.elnarradordemexico.com",
    pathname: "/uploads/magazines/",
  },
  {
    hostname: "fewwvcrfhdgnpfjyadev.supabase.co",
    pathname: "/storage/v1/object/public/media/magazines/",
  },
];

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getPdfHeaders(source: Headers, disposition: "inline" | "attachment") {
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `${disposition}; filename="revista.pdf"`,
    "Content-Security-Policy": "frame-ancestors 'self'",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=3600",
  });

  for (const name of ["accept-ranges", "content-length", "content-range", "etag", "last-modified"]) {
    const value = source.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const magazine = await queryOne<{ pdf_url: string }>(
    "SELECT pdf_url FROM magazines WHERE id = ?",
    [id]
  );

  if (!magazine) return errorResponse("No se encontró esta revista.", 404);

  let pdfUrl: URL;
  try {
    pdfUrl = new URL(magazine.pdf_url);
  } catch {
    return errorResponse("La dirección del PDF no es válida.", 502);
  }

  const isAllowedStorage = STORAGE_PATHS.some(
    (storage) =>
      pdfUrl.protocol === "https:" &&
      pdfUrl.hostname === storage.hostname &&
      !pdfUrl.username &&
      !pdfUrl.password &&
      !pdfUrl.port &&
      pdfUrl.pathname.startsWith(storage.pathname)
  );
  if (!isAllowedStorage) {
    return errorResponse("El PDF de esta revista no está en un almacenamiento compatible.", 502);
  }

  const range = request.headers.get("range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
    return errorResponse("El rango solicitado para el PDF no es válido.", 416);
  }

  const headers = new Headers();
  if (range) headers.set("Range", range);

  let upstream: Response;
  try {
    upstream = await fetch(pdfUrl, {
      headers,
      redirect: "manual",
    });
  } catch (error) {
    console.error("GET /api/revistas/[id]/pdf could not reach storage:", error);
    return errorResponse("No se pudo conectar con el almacenamiento del PDF.", 502);
  }

  if (upstream.status === 404) {
    return errorResponse("El PDF de esta revista ya no está disponible en el almacenamiento.", 404);
  }

  if (upstream.status !== 200 && upstream.status !== 206) {
    if (upstream.status === 400) {
      const storageError = (await upstream.json().catch(() => null)) as
        | { statusCode?: string; code?: string }
        | null;
      if (storageError?.statusCode === "404" || storageError?.code === "NoSuchKey") {
        return errorResponse(
          "El PDF de esta revista ya no está disponible en el almacenamiento.",
          404
        );
      }
    }

    console.error("GET /api/revistas/[id]/pdf received storage status:", upstream.status);
    return errorResponse("El almacenamiento no pudo entregar el PDF.", 502);
  }

  if (!upstream.headers.get("content-type")?.toLowerCase().startsWith("application/pdf")) {
    console.error("GET /api/revistas/[id]/pdf received a non-PDF response.");
    return errorResponse("El almacenamiento no entregó un archivo PDF válido.", 502);
  }

  const disposition = new URL(request.url).searchParams.get("download") === "1"
    ? "attachment"
    : "inline";

  return new Response(upstream.body, {
    status: upstream.status,
    headers: getPdfHeaders(upstream.headers, disposition),
  });
}

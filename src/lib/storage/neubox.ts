/**
 * Subida y eliminación de imágenes y PDFs en el hosting de Neubox.
 *
 * Cloudflare no puede escribir en las carpetas del hosting, así que el panel
 * envía el archivo a `neubox/media/upload.php` (copiado en Neubox), que lo
 * guarda y devuelve su URL pública. La petición va firmada con una clave
 * compartida (NEUBOX_UPLOAD_KEY) que solo conocen el servidor y el PHP.
 */

export type UploadFolder = "news" | "magazines";

const UPLOAD_TIMEOUT_MS = 60_000;

export type DeleteMagazineFilesResult = {
  deleted: string[];
  warnings: string[];
  failed: boolean;
};

function getMagazineAssetUrl(url: string, uploadEndpoint: URL): boolean {
  let assetUrl: URL;
  try {
    assetUrl = new URL(url);
  } catch {
    return false;
  }

  const uploadDirectory = uploadEndpoint.pathname.slice(
    0,
    uploadEndpoint.pathname.lastIndexOf("/") + 1
  );
  return (
    assetUrl.protocol === "https:" &&
    assetUrl.origin === uploadEndpoint.origin &&
    !assetUrl.username &&
    !assetUrl.password &&
    !assetUrl.port &&
    !assetUrl.search &&
    !assetUrl.hash &&
    assetUrl.pathname.startsWith(`${uploadDirectory}uploads/magazines/`) &&
    /^[a-z0-9][a-z0-9._-]{0,180}\.(jpg|jpeg|png|webp|gif|avif|pdf)$/i.test(
      assetUrl.pathname.slice(`${uploadDirectory}uploads/magazines/`.length)
    )
  );
}

export async function deleteMagazineFiles(
  urls: string[]
): Promise<DeleteMagazineFilesResult> {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  if (uniqueUrls.length === 0) return { deleted: [], warnings: [], failed: false };

  const endpoint = process.env.NEUBOX_UPLOAD_URL;
  const key = process.env.NEUBOX_UPLOAD_KEY;
  if (!endpoint || !key) {
    return {
      deleted: [],
      warnings: [
        "Falta configurar NEUBOX_UPLOAD_URL o NEUBOX_UPLOAD_KEY; no se eliminaron los archivos.",
      ],
      failed: true,
    };
  }

  let uploadEndpoint: URL;
  try {
    uploadEndpoint = new URL(endpoint);
  } catch {
    return {
      deleted: [],
      warnings: ["NEUBOX_UPLOAD_URL no es válida; no se eliminaron los archivos."],
      failed: true,
    };
  }
  if (
    uploadEndpoint.protocol !== "https:" ||
    uploadEndpoint.username ||
    uploadEndpoint.password ||
    uploadEndpoint.search ||
    uploadEndpoint.hash ||
    !uploadEndpoint.pathname.endsWith("/upload.php")
  ) {
    return {
      deleted: [],
      warnings: ["NEUBOX_UPLOAD_URL debe ser una URL HTTPS que termine en /upload.php."],
      failed: true,
    };
  }

  const warnings: string[] = [];
  const neuboxUrls = uniqueUrls.filter((url) => getMagazineAssetUrl(url, uploadEndpoint));
  if (neuboxUrls.length !== uniqueUrls.length) {
    warnings.push(
      "Algunos archivos están fuera del hosting de Neubox y no se eliminaron automáticamente."
    );
  }
  if (neuboxUrls.length === 0) return { deleted: [], warnings, failed: false };

  const body = new FormData();
  body.set("action", "delete");
  body.set("folder", "magazines");
  body.set("urls", JSON.stringify(neuboxUrls));

  let response: Response;
  try {
    response = await fetch(uploadEndpoint, {
      method: "POST",
      headers: { "X-Upload-Key": key },
      body,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    warnings.push(
      error instanceof Error && error.name === "TimeoutError"
        ? "Neubox tardó más de 60 segundos en responder; no se confirmó el borrado de archivos."
        : `No se pudo conectar con Neubox para borrar los archivos: ${error instanceof Error ? error.message : String(error)}`
    );
    return { deleted: [], warnings, failed: true };
  }

  const result = (await response.json().catch(() => null)) as
    | { deleted?: string[]; error?: string; errors?: string[] }
    | null;
  if (!response.ok || !result || !Array.isArray(result.deleted)) {
    warnings.push(
      ...(result?.errors?.length
        ? result.errors
        : [
            result?.error ??
              `Neubox respondió ${response.status}; no se confirmó el borrado de archivos.`,
          ])
    );
    return { deleted: [], warnings, failed: true };
  }

  const deleted = result.deleted.filter((url) => neuboxUrls.includes(url));
  if (deleted.length !== neuboxUrls.length) {
    warnings.push(
      ...(result.errors?.length
        ? result.errors
        : ["Neubox no confirmó la eliminación de todos los archivos."])
    );
  }
  return {
    deleted,
    warnings,
    failed: deleted.length !== neuboxUrls.length,
  };
}

export async function uploadToNeubox(
  file: File,
  folder: UploadFolder,
  fileName: string
): Promise<{ url: string } | { error: string }> {
  const endpoint = process.env.NEUBOX_UPLOAD_URL;
  const key = process.env.NEUBOX_UPLOAD_KEY;
  if (!endpoint || !key) {
    return { error: "Faltan NEUBOX_UPLOAD_URL o NEUBOX_UPLOAD_KEY en la configuración del servidor." };
  }

  const body = new FormData();
  body.set("folder", folder);
  body.set("name", fileName);
  body.set("file", file, fileName);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "X-Upload-Key": key },
      body,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { error: "Neubox tardó más de 60 segundos en responder. Revisa el servicio y vuelve a intentarlo." };
    }
    return { error: `No se pudo conectar con Neubox: ${err instanceof Error ? err.message : String(err)}` };
  }

  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) {
    return { error: data?.error || `Neubox respondió ${res.status}` };
  }
  return { url: data.url };
}

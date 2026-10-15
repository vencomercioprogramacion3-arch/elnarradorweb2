/**
 * Subida de imágenes y PDFs al hosting de Neubox.
 *
 * Cloudflare no puede escribir en las carpetas del hosting, así que el panel
 * envía el archivo a `neubox/media/upload.php` (copiado en Neubox), que lo
 * guarda y devuelve su URL pública. La petición va firmada con una clave
 * compartida (NEUBOX_UPLOAD_KEY) que solo conocen el servidor y el PHP.
 */

export type UploadFolder = "news" | "magazines";

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
    res = await fetch(endpoint, { method: "POST", headers: { "X-Upload-Key": key }, body });
  } catch (err) {
    return { error: `No se pudo conectar con Neubox: ${err instanceof Error ? err.message : String(err)}` };
  }

  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) {
    return { error: data?.error || `Neubox respondió ${res.status}` };
  }
  return { url: data.url };
}

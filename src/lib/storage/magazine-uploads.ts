import { uploadToNeubox } from "@/lib/storage/neubox";

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/x-png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

type MagazineAsset = "cover" | "pdf";

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getImageExtension(file: File): string | null {
  const mime = file.type.toLowerCase();
  if (mime in ALLOWED_IMAGE_TYPES) return ALLOWED_IMAGE_TYPES[mime];

  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpg";
  if (name.endsWith(".png")) return "png";
  if (name.endsWith(".webp")) return "webp";
  if (name.endsWith(".gif")) return "gif";
  if (name.endsWith(".avif")) return "avif";
  return null;
}

export async function uploadMagazineAsset(
  file: File,
  asset: MagazineAsset,
  title: string
): Promise<{ url: string } | { error: string; status: number }> {
  let extension: string;

  if (asset === "cover") {
    const imageExtension = getImageExtension(file);
    if (!imageExtension) {
      return {
        error: `Formato de imagen no permitido (${file.type || "desconocido"}). Usa JPG, PNG, WebP, GIF o AVIF.`,
        status: 400,
      };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return { error: `La portada pesa ${mb} MB y el máximo es 8 MB.`, status: 400 };
    }
    extension = imageExtension;
  } else {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return { error: "El archivo de la revista debe ser un PDF válido.", status: 400 };
    }
    if (file.size > MAX_PDF_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(0);
      return { error: `El PDF pesa ${mb} MB y el máximo es 50 MB.`, status: 400 };
    }

    const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (
      signature.length < 5 ||
      signature[0] !== 0x25 ||
      signature[1] !== 0x50 ||
      signature[2] !== 0x44 ||
      signature[3] !== 0x46 ||
      signature[4] !== 0x2d
    ) {
      return { error: "El archivo de la revista debe ser un PDF válido.", status: 400 };
    }
    extension = "pdf";
  }

  const fileName = `${Date.now()}-${asset}-${generateSlug(title)}.${extension}`;
  const upload = await uploadToNeubox(file, "magazines", fileName);
  if ("error" in upload) return { ...upload, status: 502 };
  return upload;
}

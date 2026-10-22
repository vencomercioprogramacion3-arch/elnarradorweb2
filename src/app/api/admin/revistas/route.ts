import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { execute } from "@/lib/db/mysql";
import { uploadToNeubox } from "@/lib/storage/neubox";

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TITLE_LENGTH = 200;

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

function getString(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

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

function jsonError(error: string, status: number) {
    return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
        return jsonError("Origen de solicitud no válido.", 403);
    }

    const auth = await requireAdmin();
    if ("error" in auth) return jsonError(auth.error, 401);

    try {
        const formData = await request.formData();
        const title = getString(formData, "title");
        const description = getString(formData, "description");
        const edition = getString(formData, "edition");
        const isFeatured = formData.get("is_featured") === "on";

        if (!title) return jsonError("El título es obligatorio.", 400);
        if (title.length > MAX_TITLE_LENGTH) {
            return jsonError(`El título supera los ${MAX_TITLE_LENGTH} caracteres.`, 400);
        }

        const coverFile = formData.get("coverImage");
        const pdfFile = formData.get("pdfFile");
        let coverImageUrl = "";
        let pdfUrl = "";

        if (coverFile instanceof File && coverFile.size > 0) {
            const extension = getImageExtension(coverFile);
            if (!extension) {
                return jsonError(
                    `Formato de imagen no permitido (${coverFile.type || "desconocido"}). Usa JPG, PNG, WebP, GIF o AVIF.`,
                    400
                );
            }
            if (coverFile.size > MAX_IMAGE_BYTES) {
                const mb = (coverFile.size / 1024 / 1024).toFixed(1);
                return jsonError(`La portada pesa ${mb} MB y el máximo es 8 MB.`, 400);
            }

            const fileName = `${Date.now()}-cover-${generateSlug(title)}.${extension}`;
            const upload = await uploadToNeubox(coverFile, "magazines", fileName);
            if ("error" in upload) return jsonError(`No se pudo subir la portada: ${upload.error}`, 502);
            coverImageUrl = upload.url;
        }

        if (pdfFile instanceof File && pdfFile.size > 0) {
            if (!pdfFile.name.toLowerCase().endsWith(".pdf")) {
                return jsonError("El archivo de la revista debe ser un PDF válido.", 400);
            }
            if (pdfFile.size > MAX_PDF_BYTES) {
                const mb = (pdfFile.size / 1024 / 1024).toFixed(0);
                return jsonError(`El PDF pesa ${mb} MB y el máximo es 50 MB.`, 400);
            }
            const signature = new Uint8Array(await pdfFile.slice(0, 5).arrayBuffer());
            if (
                signature.length < 5 ||
                signature[0] !== 0x25 ||
                signature[1] !== 0x50 ||
                signature[2] !== 0x44 ||
                signature[3] !== 0x46 ||
                signature[4] !== 0x2d
            ) {
                return jsonError("El archivo de la revista debe ser un PDF válido.", 400);
            }

            const fileName = `${Date.now()}-pdf-${generateSlug(title)}.pdf`;
            const upload = await uploadToNeubox(pdfFile, "magazines", fileName);
            if ("error" in upload) return jsonError(`No se pudo subir el PDF: ${upload.error}`, 502);
            pdfUrl = upload.url;
        }

        if (!pdfUrl) return jsonError("El PDF de la revista es obligatorio.", 400);

        await execute(
            `INSERT INTO magazines
                (id, title, description, edition, cover_image_url, pdf_url, is_featured, published_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                crypto.randomUUID(),
                title,
                description,
                edition,
                coverImageUrl,
                pdfUrl,
                isFeatured,
                new Date(),
                new Date(),
            ]
        );

        revalidatePath("/revistas", "layout");
        revalidatePath("/", "layout");
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("POST /api/admin/revistas failed:", error);
        return jsonError(
            `No se pudo publicar la revista: ${error instanceof Error ? error.message : String(error)}`,
            500
        );
    }
}

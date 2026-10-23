import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { execute, query } from "@/lib/db/mysql";
import { uploadMagazineAsset } from "@/lib/storage/magazine-uploads";

const MAX_TITLE_LENGTH = 200;

function getString(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

function jsonError(error: string, status: number) {
    return NextResponse.json({ error }, { status });
}

export async function GET() {
    const auth = await requireAdmin();
    if ("error" in auth) return jsonError(auth.error, 401);

    try {
        const magazines = await query<{
            id: string;
            title: string;
            description: string;
            edition: string;
            cover_image_url: string;
            pdf_url: string;
            is_featured: boolean;
            published_at: string;
        }>(
            `SELECT id, title, description, edition, cover_image_url, pdf_url, is_featured, published_at
             FROM magazines
             ORDER BY published_at DESC`
        );
        return NextResponse.json({ magazines });
    } catch (error) {
        console.error("GET /api/admin/revistas failed:", error);
        return jsonError("No se pudo cargar la lista de revistas.", 500);
    }
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
            const upload = await uploadMagazineAsset(coverFile, "cover", title);
            if ("error" in upload) return jsonError(`No se pudo subir la portada: ${upload.error}`, upload.status);
            coverImageUrl = upload.url;
        }

        if (pdfFile instanceof File && pdfFile.size > 0) {
            const upload = await uploadMagazineAsset(pdfFile, "pdf", title);
            if ("error" in upload) return jsonError(`No se pudo subir el PDF: ${upload.error}`, upload.status);
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

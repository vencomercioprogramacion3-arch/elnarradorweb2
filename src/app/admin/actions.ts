"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { execute, query } from "@/lib/db/mysql";
import { getAdminCredentials } from "@/lib/db/admin-users";
import { endSession, requireAdmin, startSession, verifyPassword } from "@/lib/auth/session";
import { uploadToNeubox } from "@/lib/storage/neubox";

type ActionResult = { error?: string; success?: boolean };

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_TITLE_LENGTH = 200;
const MAX_SUMMARY_LENGTH = 500;
// HTML grande casi siempre significa imágenes pegadas como base64 dentro del editor
const MAX_CONTENT_LENGTH = 2 * 1024 * 1024; // ~2 MB de HTML

// La extensión se deriva del MIME type para no confiar en el nombre del archivo
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
};

export async function loginAdmin(formData: FormData): Promise<ActionResult> {
    const email = getString(formData, "email").toLowerCase();
    const password = formData.get("password");
    if (!email || typeof password !== "string" || !password) {
        return { error: "Escribe tu correo y contraseña." };
    }

    try {
        const user = await getAdminCredentials(email);
        // Verificar aunque el usuario no exista para no revelar qué correos son válidos
        const valid = await verifyPassword(password, user?.password_hash ?? "pbkdf2_sha256$1$AA$AA");
        if (!user || !valid) {
            return { error: "Correo o contraseña incorrectos. Verifica tus datos." };
        }
        await startSession(user.email);
    } catch (err) {
        console.error("loginAdmin failed:", err);
        return { error: "No se pudo iniciar sesión. Intenta de nuevo." };
    }

    revalidatePath("/", "layout");
    return { success: true };
}

export async function logoutAdmin() {
    await endSession();
    redirect("/admin/login");
}

function generateSlug(title: string) {
    return title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

function getString(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

function validateImage(file: File): { ext: string } | { error: string } {
    const ext = ALLOWED_IMAGE_TYPES[file.type];
    if (!ext) {
        return { error: `Formato de imagen no permitido (${file.type || "desconocido"}). Usa JPG, PNG, WebP, GIF o AVIF.` };
    }
    if (file.size > MAX_IMAGE_BYTES) {
        const mb = (file.size / 1024 / 1024).toFixed(1);
        return { error: `La imagen pesa ${mb} MB y el máximo es 8 MB. Comprímela e inténtalo de nuevo.` };
    }
    return { ext };
}

// Backstop server-side: la sanitización principal ocurre en el cliente con
// DOMPurify, pero el action es un endpoint público y no puede confiar en eso.
function stripDangerousHtml(html: string): string {
    return html
        .replace(/<\s*(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
        .replace(/<\s*(script|style|iframe|object|embed|form)[^>]*\/?>/gi, "")
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'\s>]*\2/gi, "");
}

export async function uploadNews(formData: FormData): Promise<ActionResult> {
    try {
        const auth = await requireAdmin();
        if ("error" in auth) return { error: auth.error };

        const title = getString(formData, "title");
        const summary = getString(formData, "summary");
        const content = getString(formData, "content");
        const category_name = getString(formData, "category_name");
        const category_slug = getString(formData, "category_slug").toLowerCase();
        const author_name = getString(formData, "author_name");
        const is_featured = formData.get("is_featured") === "on";
        const is_breaking = formData.get("is_breaking") === "on";

        if (!title) return { error: "El título es obligatorio." };
        if (title.length > MAX_TITLE_LENGTH) return { error: `El título supera los ${MAX_TITLE_LENGTH} caracteres.` };
        if (!summary) return { error: "El resumen es obligatorio." };
        if (summary.length > MAX_SUMMARY_LENGTH) return { error: `El resumen supera los ${MAX_SUMMARY_LENGTH} caracteres.` };
        if (!category_slug) return { error: "Selecciona una categoría." };
        if (!content.replace(/<[^>]*>/g, "").trim()) return { error: "El contenido de la nota está vacío." };
        if (content.length > MAX_CONTENT_LENGTH) {
            return { error: "El contenido es demasiado grande. Si pegaste imágenes dentro del texto, elimínalas y usa solo la imagen destacada." };
        }

        const imageOption = getString(formData, "imageOption");
        let image_url = "";

        if (imageOption === "url") {
            image_url = getString(formData, "imageUrl");
        } else {
            const file = formData.get("imageFile");
            if (file instanceof File && file.size > 0) {
                const validation = validateImage(file);
                if ("error" in validation) return { error: validation.error };

                const fileName = `${Date.now()}-${generateSlug(title)}.${validation.ext}`;
                const upload = await uploadToNeubox(file, "news", fileName);
                if ("error" in upload) return { error: `No se pudo subir la imagen: ${upload.error}` };
                image_url = upload.url;
            }
        }

        try {
            await execute(
                `INSERT INTO news
                    (id, title, summary, content, category_slug, category_name, author_name,
                     image_url, is_featured, is_breaking, tags, source, published_at, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    crypto.randomUUID(),
                    title,
                    summary,
                    stripDangerousHtml(content),
                    category_slug,
                    category_name,
                    author_name,
                    image_url,
                    is_featured,
                    is_breaking,
                    "[]",
                    // Valor histórico de la columna para notas creadas desde el panel
                    "supabase",
                    new Date(),
                    new Date(),
                ]
            );
        } catch (err) {
            return { error: `No se pudo guardar la nota: ${err instanceof Error ? err.message : String(err)}` };
        }

        revalidatePath("/", "layout");
        return { success: true };
    } catch (err) {
        console.error("uploadNews failed:", err);
        const message = err instanceof Error ? err.message : "Error desconocido";
        return { error: `Ocurrió un error al publicar la nota: ${message}` };
    }
}

export async function uploadMagazine(formData: FormData): Promise<ActionResult> {
    try {
        const auth = await requireAdmin();
        if ("error" in auth) return { error: auth.error };

        const title = getString(formData, "title");
        const description = getString(formData, "description");
        const edition = getString(formData, "edition");
        const is_featured = formData.get("is_featured") === "on";

        if (!title) return { error: "El título es obligatorio." };
        if (title.length > MAX_TITLE_LENGTH) return { error: `El título supera los ${MAX_TITLE_LENGTH} caracteres.` };

        const coverFile = formData.get("coverImage");
        const pdfFile = formData.get("pdfFile");

        let cover_image_url = "";
        let pdf_url = "";

        if (coverFile instanceof File && coverFile.size > 0) {
            const validation = validateImage(coverFile);
            if ("error" in validation) return { error: validation.error };

            const fileName = `${Date.now()}-cover-${generateSlug(title)}.${validation.ext}`;
            const upload = await uploadToNeubox(coverFile, "magazines", fileName);
            if ("error" in upload) return { error: `No se pudo subir la portada: ${upload.error}` };
            cover_image_url = upload.url;
        }

        if (pdfFile instanceof File && pdfFile.size > 0) {
            if (pdfFile.type !== "application/pdf") {
                return { error: "El archivo de la revista debe ser un PDF." };
            }
            if (pdfFile.size > MAX_PDF_BYTES) {
                const mb = (pdfFile.size / 1024 / 1024).toFixed(0);
                return { error: `El PDF pesa ${mb} MB y el máximo es 50 MB.` };
            }
            const fileName = `${Date.now()}-pdf-${generateSlug(title)}.pdf`;
            const upload = await uploadToNeubox(pdfFile, "magazines", fileName);
            if ("error" in upload) return { error: `No se pudo subir el PDF: ${upload.error}` };
            pdf_url = upload.url;
        }

        if (!pdf_url) return { error: "El PDF de la revista es obligatorio." };

        try {
            await execute(
                `INSERT INTO magazines
                    (id, title, description, edition, cover_image_url, pdf_url, is_featured, published_at, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [crypto.randomUUID(), title, description, edition, cover_image_url, pdf_url, is_featured, new Date(), new Date()]
            );
        } catch (err) {
            return { error: `No se pudo guardar la revista: ${err instanceof Error ? err.message : String(err)}` };
        }

        revalidatePath("/revistas", "layout");
        revalidatePath("/", "layout");
        return { success: true };
    } catch (err) {
        console.error("uploadMagazine failed:", err);
        const message = err instanceof Error ? err.message : "Error desconocido";
        return { error: `Ocurrió un error al publicar la revista: ${message}` };
    }
}

/* ───── Gestión de notas (/admin/notas) ───── */

export type AdminNewsItem = {
    id: string;
    title: string;
    category_name: string;
    published_at: string;
    is_featured: boolean;
    is_breaking: boolean;
    view_count: number;
    source: string;
};

export async function listNewsForAdmin(): Promise<{ error: string } | { posts: AdminNewsItem[] }> {
    const auth = await requireAdmin();
    if ("error" in auth) return { error: auth.error };
    const posts = await query<AdminNewsItem>(
        `SELECT id, title, category_name, published_at, is_featured, is_breaking, view_count, source
         FROM news ORDER BY published_at DESC LIMIT 100`
    );
    return { posts };
}

export async function setNewsFlag(id: string, flag: "is_featured" | "is_breaking", value: boolean): Promise<ActionResult> {
    const auth = await requireAdmin();
    if ("error" in auth) return { error: auth.error };
    // El nombre de la columna viene de una lista fija, nunca del cliente sin validar
    const column = flag === "is_breaking" ? "is_breaking" : "is_featured";
    await execute(`UPDATE news SET ${column} = ? WHERE id = ?`, [value, id]);
    revalidatePath("/", "layout");
    return { success: true };
}

export async function deleteNews(id: string): Promise<ActionResult> {
    const auth = await requireAdmin();
    if ("error" in auth) return { error: auth.error };
    await execute("DELETE FROM news WHERE id = ?", [id]);
    revalidatePath("/", "layout");
    return { success: true };
}

/** Nombre del usuario actual, para autollenar el campo "Autor". */
export async function getCurrentAdminName(): Promise<string> {
    const auth = await requireAdmin();
    return "error" in auth ? "" : auth.user.display_name;
}

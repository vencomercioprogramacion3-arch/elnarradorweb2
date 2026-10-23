import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { execute, queryOne } from "@/lib/db/mysql";
import { uploadMagazineAsset } from "@/lib/storage/magazine-uploads";

const MAX_TITLE_LENGTH = 200;

type Props = {
  params: Promise<{ id: string }>;
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function PATCH(request: Request, { params }: Props) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return jsonError("Origen de solicitud no válido.", 403);
  }

  const auth = await requireAdmin();
  if ("error" in auth) return jsonError(auth.error, 401);

  try {
    const { id } = await params;
    const magazine = await queryOne<{
      id: string;
      title: string;
      description: string;
      edition: string;
      cover_image_url: string;
      pdf_url: string;
      is_featured: boolean;
    }>(
      `SELECT id, title, description, edition, cover_image_url, pdf_url, is_featured
       FROM magazines
       WHERE id = ?`,
      [id]
    );
    if (!magazine) return jsonError("No se encontró la revista que quieres editar.", 404);

    const formData = await request.formData();
    const titleValue = formData.get("title");
    const descriptionValue = formData.get("description");
    const editionValue = formData.get("edition");
    if (
      typeof titleValue !== "string" ||
      typeof descriptionValue !== "string" ||
      typeof editionValue !== "string"
    ) {
      return jsonError("Faltan datos obligatorios del formulario.", 400);
    }

    const title = titleValue.trim();
    if (!title) return jsonError("El título es obligatorio.", 400);
    if (title.length > MAX_TITLE_LENGTH) {
      return jsonError(`El título supera los ${MAX_TITLE_LENGTH} caracteres.`, 400);
    }

    let coverImageUrl = magazine.cover_image_url;
    let pdfUrl = magazine.pdf_url;
    const coverFile = formData.get("coverImage");
    const pdfFile = formData.get("pdfFile");

    if (coverFile instanceof File && coverFile.size > 0) {
      const upload = await uploadMagazineAsset(coverFile, "cover", title);
      if ("error" in upload) {
        return jsonError(`No se pudo actualizar la portada: ${upload.error}`, upload.status);
      }
      coverImageUrl = upload.url;
    }

    if (pdfFile instanceof File && pdfFile.size > 0) {
      const upload = await uploadMagazineAsset(pdfFile, "pdf", title);
      if ("error" in upload) {
        return jsonError(`No se pudo actualizar el PDF: ${upload.error}`, upload.status);
      }
      pdfUrl = upload.url;
    }

    await execute(
      `UPDATE magazines
       SET title = ?, description = ?, edition = ?, cover_image_url = ?, pdf_url = ?, is_featured = ?
       WHERE id = ?`,
      [
        title,
        descriptionValue.trim(),
        editionValue.trim(),
        coverImageUrl,
        pdfUrl,
        formData.get("is_featured") === "on",
        id,
      ]
    );

    revalidatePath("/revistas", "layout");
    revalidatePath(`/revistas/${id}`);
    revalidatePath("/", "layout");
    return NextResponse.json({
      success: true,
      magazine: {
        ...magazine,
        title,
        description: descriptionValue.trim(),
        edition: editionValue.trim(),
        cover_image_url: coverImageUrl,
        pdf_url: pdfUrl,
        is_featured: formData.get("is_featured") === "on",
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/revistas/[id] failed:", error);
    return jsonError(
      `No se pudo actualizar la revista: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}

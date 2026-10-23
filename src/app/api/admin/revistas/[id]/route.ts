import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { execute, query, queryOne } from "@/lib/db/mysql";
import { uploadMagazineAsset } from "@/lib/storage/magazine-uploads";
import { deleteMagazineFiles } from "@/lib/storage/neubox";

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

export async function DELETE(request: Request, { params }: Props) {
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
      cover_image_url: string;
      pdf_url: string;
    }>(
      "SELECT id, cover_image_url, pdf_url FROM magazines WHERE id = ?",
      [id]
    );
    if (!magazine) return jsonError("No se encontró la revista que quieres eliminar.", 404);

    const otherMagazines = await query<{
      cover_image_url: string;
      pdf_url: string;
    }>(
      `SELECT cover_image_url, pdf_url
       FROM magazines
       WHERE id <> ?`,
      [id]
    );
    const magazineUrls = [
      ...new Set([magazine.cover_image_url, magazine.pdf_url].filter(Boolean)),
    ];
    const sharedUrls = new Set(
      magazineUrls.filter((url) =>
        otherMagazines.some(
          (other) => other.cover_image_url === url || other.pdf_url === url
        )
      )
    );
    const urlsToDelete = magazineUrls.filter((url) => !sharedUrls.has(url));

    const fileCleanup = await deleteMagazineFiles(urlsToDelete);
    if (fileCleanup.failed) {
      console.error("Magazine media cleanup failed:", fileCleanup.warnings);
      return NextResponse.json(
        {
          error: "No se eliminó la revista porque Neubox no confirmó el borrado de sus archivos.",
          details: fileCleanup.warnings,
        },
        { status: 502 }
      );
    }

    const deleteResult = await execute("DELETE FROM magazines WHERE id = ?", [id]);
    if (deleteResult.affectedRows !== 1) {
      console.error("Magazine record was not deleted after media cleanup:", id);
      return jsonError(
        "Los archivos se limpiaron, pero no se pudo eliminar la ficha. Actualiza la página y vuelve a intentarlo.",
        500
      );
    }

    revalidatePath("/revistas", "layout");
    revalidatePath(`/revistas/${id}`);
    revalidatePath("/", "layout");
    const warnings = [...fileCleanup.warnings];
    if (sharedUrls.size > 0) {
      warnings.push("Se conservaron archivos que también utiliza otra revista.");
    }
    return NextResponse.json({ success: true, warnings });
  } catch (error) {
    console.error("DELETE /api/admin/revistas/[id] failed:", error);
    return jsonError(
      `No se pudo eliminar la revista: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}

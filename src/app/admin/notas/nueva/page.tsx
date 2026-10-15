"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import DOMPurify from "dompurify";
import { getCurrentAdminName, uploadNews } from "../../actions";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // debe coincidir con el límite del server action

// Optimización de imagen en el navegador: encoge y recomprime la foto ANTES de
// subirla, para que pese mucho menos y se publique aun con internet lento.
const MAX_IMAGE_DIMENSION = 1600; // ancho/alto máximo en píxeles tras optimizar
const COMPRESS_QUALITY = 0.82; // calidad JPEG (sin pérdida visible para fotos)

function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Reduce el tamaño de una imagen en el cliente usando un canvas: mantiene la
 * proporción, limita la dimensión máxima y la recomprime como JPEG. Si algo
 * falla (o no logra reducir el peso) devuelve el archivo original para no
 * bloquear nunca la publicación.
 */
async function compressImage(file: File): Promise<File> {
    // Los GIF (posible animación) y formatos no rasterizados se dejan igual.
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
        return file;
    }
    try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;
        // Fondo blanco por si la imagen trae transparencia (al pasar a JPEG).
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/jpeg", COMPRESS_QUALITY)
        );
        // Si no conseguimos reducir el peso, nos quedamos con el original.
        if (!blob || blob.size >= file.size) return file;

        const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
    } catch {
        return file;
    }
}

/* ───── categories ───── */
const categories = [
    { slug: "mexico", name: "México" },
    { slug: "economia", name: "Economía" },
    { slug: "cultura", name: "Cultura" },
    { slug: "internacional", name: "Internacional" },
    { slug: "deportes", name: "Deportes" },
    { slug: "estilo", name: "Estilo" },
    { slug: "ciencia", name: "Ciencia" },
    { slug: "opinion", name: "Opinión" },
    { slug: "sociedad", name: "Sociedad" },
    { slug: "tecnologia", name: "Tecnología" },
];

/* ───── SEO checks ───── */
type SeoCheck = { label: string; pass: boolean; tip: string; weight: number };

function computeSeo(data: {
    title: string;
    summary: string;
    contentHtml: string;
    hasImage: boolean;
    category: string;
}): { score: number; checks: SeoCheck[] } {
    const wordCount = data.contentHtml.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
    const titleLen = data.title.length;
    const summaryLen = data.summary.length;

    const checks: SeoCheck[] = [
        {
            label: "Título entre 40-70 caracteres",
            pass: titleLen >= 40 && titleLen <= 70,
            tip: titleLen < 40 ? `Muy corto (${titleLen}). Añade más detalle.` : titleLen > 70 ? `Muy largo (${titleLen}). Google puede cortar.` : `Perfecto (${titleLen}).`,
            weight: 20,
        },
        {
            label: "Resumen entre 120-160 caracteres",
            pass: summaryLen >= 120 && summaryLen <= 160,
            tip: summaryLen < 120 ? `Muy corto (${summaryLen}). Amplia la descripción.` : summaryLen > 160 ? `Muy largo (${summaryLen}). Google puede cortar.` : `Perfecto (${summaryLen}).`,
            weight: 20,
        },
        {
            label: "Contenido +300 palabras",
            pass: wordCount >= 300,
            tip: wordCount < 300 ? `Solo ${wordCount} palabras. Google prefiere +300.` : `Excelente (${wordCount} palabras).`,
            weight: 25,
        },
        {
            label: "Imagen destacada presente",
            pass: data.hasImage,
            tip: data.hasImage ? "Imagen configurada." : "Agrega una imagen para redes y SEO.",
            weight: 20,
        },
        {
            label: "Categoría seleccionada",
            pass: data.category !== "",
            tip: data.category ? "Categoría asignada." : "Selecciona una categoría.",
            weight: 15,
        },
    ];

    const earned = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
    return { score: earned, checks };
}

function seoColor(score: number) {
    if (score >= 80) return "#16A34A";
    if (score >= 50) return "#D97706";
    return "#DC2626";
}

function seoLabel(score: number) {
    if (score >= 80) return "Excelente";
    if (score >= 50) return "Aceptable";
    return "Necesita mejoras";
}

/* ───── Toolbar buttons ───── */
type ToolbarBtn = {
    cmd: string;
    arg?: string;
    icon: string;
    title: string;
    group?: string;
};

const toolbar: ToolbarBtn[] = [
    { cmd: "bold", icon: "B", title: "Negrita", group: "format" },
    { cmd: "italic", icon: "I", title: "Cursiva", group: "format" },
    { cmd: "underline", icon: "U", title: "Subrayado", group: "format" },
    { cmd: "sep", icon: "", title: "", group: "sep1" },
    { cmd: "formatBlock", arg: "h2", icon: "H2", title: "Título", group: "block" },
    { cmd: "formatBlock", arg: "h3", icon: "H3", title: "Subtítulo", group: "block" },
    { cmd: "formatBlock", arg: "blockquote", icon: "❝", title: "Cita", group: "block" },
    { cmd: "sep", icon: "", title: "", group: "sep2" },
    { cmd: "insertUnorderedList", icon: "•", title: "Lista", group: "list" },
    { cmd: "insertOrderedList", icon: "1.", title: "Lista numerada", group: "list" },
    { cmd: "sep", icon: "", title: "", group: "sep3" },
    { cmd: "createLink", icon: "🔗", title: "Insertar enlace", group: "media" },
    { cmd: "formatBlock", arg: "p", icon: "¶", title: "Párrafo normal", group: "block" },
];

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function NuevaNotaPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    /* form state */
    const [title, setTitle] = useState("");
    const [categorySlug, setCategorySlug] = useState("");
    const [author, setAuthor] = useState("El Narrador");
    const [summary, setSummary] = useState("");
    const [isFeatured, setIsFeatured] = useState(false);
    const [isBreaking, setIsBreaking] = useState(false);

    /* image */
    const [imageOption, setImageOption] = useState<"upload" | "url">("upload");
    const [imagePreview, setImagePreview] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState("");
    const [optimizing, setOptimizing] = useState(false);
    const [imageInfo, setImageInfo] = useState<{ original: number; optimized: number } | null>(null);

    /* auto-fill author from admin_users */
    useEffect(() => {
        async function loadAuthor() {
            const name = await getCurrentAdminName();
            if (name) setAuthor(name);
        }
        loadAuthor();
    }, []);

    /* rich editor */
    const editorRef = useRef<HTMLDivElement>(null);
    const [contentHtml, setContentHtml] = useState("");

    /* tabs */
    const [tab, setTab] = useState<"editor" | "preview">("editor");

    /* sync content from contentEditable */
    const syncContent = useCallback(() => {
        if (editorRef.current) {
            setContentHtml(editorRef.current.innerHTML);
        }
    }, []);

    /* exec toolbar command */
    const execCmd = (cmd: string, arg?: string) => {
        if (cmd === "createLink") {
            const url = prompt("URL del enlace:", "https://");
            if (url) document.execCommand("createLink", false, url);
        } else if (cmd === "formatBlock") {
            document.execCommand("formatBlock", false, `<${arg}>`);
        } else {
            document.execCommand(cmd, false, arg);
        }
        editorRef.current?.focus();
        syncContent();
    };

    /* seleccionar imagen: la optimizamos en el navegador antes de subirla */
    async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);
        setOptimizing(true);
        try {
            const optimized = await compressImage(file);
            setImageFile(optimized);
            setImagePreview(URL.createObjectURL(optimized));
            setImageInfo({ original: file.size, optimized: optimized.size });
        } finally {
            setOptimizing(false);
        }
    }

    /* SEO */
    const seo = computeSeo({
        title,
        summary,
        contentHtml,
        hasImage: !!(imagePreview || imageFile),
        category: categorySlug,
    });

    /* helpers */
    const categoryName = categories.find((c) => c.slug === categorySlug)?.name || "";
    const plainContent = contentHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = plainContent ? plainContent.split(/\s+/).length : 0;

    /* submit */
    async function handleSubmit() {
        setError(null);
        setSuccess(false);

        // Validar antes de enviar para dar errores inmediatos y claros
        if (!plainContent) {
            setError("El contenido de la nota está vacío. Escribe el artículo antes de publicar.");
            return;
        }
        if (imageOption === "upload" && imageFile && imageFile.size > MAX_IMAGE_BYTES) {
            const mb = (imageFile.size / 1024 / 1024).toFixed(1);
            setError(`La imagen pesa ${mb} MB y el máximo es 8 MB. Comprímela e inténtalo de nuevo.`);
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.set("title", title);
        formData.set("summary", summary);
        formData.set("content", DOMPurify.sanitize(contentHtml));
        formData.set("category_slug", categorySlug);
        formData.set("category_name", categoryName);
        formData.set("author_name", author);
        formData.set("imageOption", imageOption);
        if (isFeatured) formData.set("is_featured", "on");
        if (isBreaking) formData.set("is_breaking", "on");

        if (imageOption === "url") {
            formData.set("imageUrl", imageUrl);
        } else if (imageFile) {
            formData.set("imageFile", imageFile);
        }

        try {
            const result = await uploadNews(formData);

            if (result?.error) {
                setError(result.error);
            } else {
                setSuccess(true);
                setTitle("");
                setCategorySlug("");
                setSummary("");
                setContentHtml("");
                setImagePreview("");
                setImageFile(null);
                setImageUrl("");
                setImageInfo(null);
                setIsFeatured(false);
                setIsBreaking(false);
                if (editorRef.current) editorRef.current.innerHTML = "";
            }
        } catch {
            // Sin esto, un fallo de red o del servidor dejaba el botón en
            // "Publicando..." para siempre y sin ningún mensaje de error.
            setError(
                "No se pudo publicar la nota. Revisa tu conexión a internet e inténtalo de nuevo. " +
                "Si el problema continúa, recarga la página y vuelve a iniciar sesión."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-[1200px] mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Publicar Nueva Nota</h1>
                    <p className="text-gray-500 mt-1 text-sm">Redacta, analiza SEO y previsualiza antes de publicar</p>
                </div>
                {/* Tab switcher */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setTab("editor")}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${tab === "editor" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        ✏️ Editor
                    </button>
                    <button
                        onClick={() => { syncContent(); setTab("preview"); }}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${tab === "preview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        👁️ Vista Previa
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-green-600 text-xl">✅</span>
                    <div>
                        <p className="text-green-800 font-semibold">¡Nota publicada exitosamente!</p>
                        <p className="text-green-700 text-sm">Tu artículo ya está visible en el sitio.</p>
                    </div>
                </div>
            )}
            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-red-600 text-xl">❌</span>
                    <p className="text-red-800 font-medium">{error}</p>
                </div>
            )}

            {/* ═══════ EDITOR TAB ═══════ */}
            <div style={{ display: tab === "editor" ? "block" : "none" }}>
                <div className="flex gap-6">
                    {/* LEFT — form */}
                    <div className="flex-1 min-w-0 space-y-5">
                        {/* Title */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Título <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Escribe un título llamativo para tu nota..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                            <p className="text-xs text-gray-400 mt-1 text-right">{title.length} caracteres</p>
                        </div>

                        {/* Category + Author */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoría <span className="text-red-500">*</span></label>
                                <select
                                    value={categorySlug}
                                    onChange={(e) => setCategorySlug(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white"
                                >
                                    <option value="">Seleccionar...</option>
                                    {categories.map((c) => (
                                        <option key={c.slug} value={c.slug}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Autor</label>
                                <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Resumen <span className="text-red-500">*</span></label>
                            <textarea
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                rows={3}
                                maxLength={300}
                                placeholder="Breve resumen (aparece en tarjetas y redes sociales)..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-1 text-right">{summary.length}/300</p>
                        </div>

                        {/* Image */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">Imagen destacada</label>
                            <div className="flex gap-2 mb-3">
                                <button type="button" onClick={() => setImageOption("upload")} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${imageOption === "upload" ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>📁 Subir</button>
                                <button type="button" onClick={() => setImageOption("url")} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${imageOption === "url" ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>🔗 URL</button>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="flex-1">
                                    {imageOption === "upload" ? (
                                        <>
                                            <label className="block border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-blue-400 cursor-pointer bg-gray-50 transition-colors">
                                                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                                <p className="text-gray-500 text-sm">Clic para seleccionar imagen</p>
                                                <p className="text-gray-400 text-xs mt-1">Se optimiza sola para subir más rápido</p>
                                            </label>
                                            {optimizing && (
                                                <p className="text-xs text-blue-600 mt-2">⏳ Optimizando imagen…</p>
                                            )}
                                            {!optimizing && imageInfo && (
                                                <p className="text-xs text-green-600 mt-2">
                                                    ✅ Optimizada: {formatBytes(imageInfo.original)} → {formatBytes(imageInfo.optimized)}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <input type="url" value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value); }} placeholder="https://..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                    )}
                                </div>
                                {imagePreview && (
                                    <div className="w-28 h-20 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-100">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" onError={() => setImagePreview("")} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── Rich Text Editor ─── */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Toolbar */}
                            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
                                {toolbar.map((btn, i) =>
                                    btn.cmd === "sep" ? (
                                        <div key={btn.group} className="w-px h-6 bg-gray-300 mx-1.5" />
                                    ) : (
                                        <button
                                            key={i}
                                            type="button"
                                            title={btn.title}
                                            onMouseDown={(e) => { e.preventDefault(); execCmd(btn.cmd, btn.arg); }}
                                            className="w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                                            style={{ fontStyle: btn.cmd === "italic" ? "italic" : "normal", textDecoration: btn.cmd === "underline" ? "underline" : "none" }}
                                        >
                                            {btn.icon}
                                        </button>
                                    )
                                )}
                                <div className="ml-auto text-xs text-gray-400">{wordCount} palabras</div>
                            </div>
                            {/* Editable area */}
                            <div
                                ref={editorRef}
                                contentEditable
                                suppressContentEditableWarning
                                onInput={syncContent}
                                onBlur={syncContent}
                                data-placeholder="Escribe el contenido de tu artículo aquí..."
                                className="min-h-[350px] max-h-[600px] overflow-y-auto px-5 py-4 text-gray-800 leading-relaxed focus:outline-none"
                                style={{ fontSize: "1.05rem" }}
                            />
                        </div>

                        {/* Options */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-8">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer" />
                                <div>
                                    <span className="text-sm font-medium text-gray-700">⭐ Destacada</span>
                                    <p className="text-xs text-gray-400">Noticia principal</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={isBreaking} onChange={(e) => setIsBreaking(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                                <div>
                                    <span className="text-sm font-medium text-gray-700">🔴 Última Hora</span>
                                    <p className="text-xs text-gray-400">Noticia urgente</p>
                                </div>
                            </label>
                        </div>

                        {/* Submit */}
                        <div className="flex items-center gap-4 pb-8">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading || optimizing || !title || !categorySlug || !summary}
                                className="px-8 py-3.5 rounded-xl text-white font-semibold shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                style={{ background: loading ? "#9CA3AF" : "#1C1917" }}
                            >
                                {loading ? "⏳ Publicando..." : "📰 Publicar Nota"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { syncContent(); setTab("preview"); }}
                                className="px-6 py-3.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-colors cursor-pointer border border-gray-200"
                            >
                                👁️ Previsualizar
                            </button>
                        </div>
                    </div>

                    {/* RIGHT — SEO Meter */}
                    <div className="w-72 shrink-0 space-y-5">
                        {/* SEO Score */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 sticky top-4">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">📊 Puntuación SEO</h3>
                            {/* Circular gauge */}
                            <div className="flex justify-center mb-4">
                                <div className="relative w-28 h-28">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                                        <circle
                                            cx="50" cy="50" r="42" fill="none"
                                            stroke={seoColor(seo.score)}
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(seo.score / 100) * 264} 264`}
                                            className="transition-all duration-500"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold" style={{ color: seoColor(seo.score) }}>
                                            {seo.score}
                                        </span>
                                        <span className="text-xs text-gray-400">/100</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-center text-sm font-semibold mb-5" style={{ color: seoColor(seo.score) }}>
                                {seoLabel(seo.score)}
                            </p>
                            {/* Checklist */}
                            <div className="space-y-3">
                                {seo.checks.map((c) => (
                                    <div key={c.label} className="flex gap-2">
                                        <span className="text-sm shrink-0 mt-0.5">{c.pass ? "✅" : "⚠️"}</span>
                                        <div>
                                            <p className={`text-sm font-medium ${c.pass ? "text-gray-700" : "text-amber-700"}`}>{c.label}</p>
                                            <p className="text-xs text-gray-400">{c.tip}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Tips */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <h4 className="text-sm font-bold text-blue-800 mb-2">💡 Tips de escritura</h4>
                            <ul className="text-xs text-blue-700 space-y-1.5">
                                <li>• Usa subtítulos (H2, H3) para organizar</li>
                                <li>• El primer párrafo debe resumir el tema</li>
                                <li>• Incluye citas textuales cuando sea posible</li>
                                <li>• Artículos de +300 palabras rankean mejor</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════ PREVIEW TAB ═══════ */}
            <div style={{ display: tab === "preview" ? "block" : "none" }}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Preview header bar */}
                    <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-red-400" />
                                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                                <span className="w-3 h-3 rounded-full bg-green-400" />
                            </div>
                            <span className="text-xs text-gray-400 font-mono">elnarradordemexico.com/articulo/nueva-nota</span>
                        </div>
                        <button
                            onClick={() => setTab("editor")}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                        >
                            ← Volver al editor
                        </button>
                    </div>

                    {/* Simulated article page */}
                    <div style={{ background: "#F5F5F0", minHeight: "600px" }}>
                        <div className="max-w-3xl mx-auto px-6 py-10">
                            {/* Breadcrumb */}
                            <nav className="flex items-center gap-2 text-sm mb-6" style={{ color: "#78716C" }}>
                                <span className="cursor-pointer hover:underline" style={{ color: "#B8920F" }}>Inicio</span>
                                <span>/</span>
                                {categoryName && (
                                    <>
                                        <span className="cursor-pointer hover:underline" style={{ color: "#B8920F" }}>{categoryName}</span>
                                        <span>/</span>
                                    </>
                                )}
                                <span className="line-clamp-1" style={{ color: "#A8A29E" }}>{title || "Sin título"}</span>
                            </nav>

                            {/* Category badge */}
                            {categoryName && (
                                <span
                                    className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-sm mb-3"
                                    style={{ background: "#D4A517", color: "white" }}
                                >
                                    {categoryName}
                                </span>
                            )}

                            {/* Title */}
                            <h1
                                className="text-3xl md:text-4xl font-bold leading-tight mb-4"
                                style={{ fontFamily: "'Georgia', serif", color: "#0C0A09" }}
                            >
                                {title || "Título de tu artículo"}
                            </h1>

                            {/* Summary */}
                            {summary && (
                                <p className="text-lg leading-relaxed mb-4" style={{ color: "#78716C" }}>
                                    {summary}
                                </p>
                            )}

                            {/* Meta */}
                            <div className="flex items-center gap-4 text-sm mb-8 pb-6 border-b" style={{ color: "#A8A29E", borderColor: "#E7E5E4" }}>
                                <span className="font-medium" style={{ color: "#0C0A09" }}>{author || "El Narrador"}</span>
                                <time>{new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</time>
                            </div>

                            {/* Featured image */}
                            {imagePreview && (
                                <div className="rounded-lg overflow-hidden mb-8" style={{ aspectRatio: "16/9", background: "#E7E5E4" }}>
                                    <img src={imagePreview} alt="Featured" className="w-full h-full object-cover" />
                                </div>
                            )}

                            {/* Article body */}
                            {contentHtml ? (
                                <div
                                    className="article-content leading-relaxed text-lg"
                                    style={{ color: "#0C0A09" }}
                                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                                />
                            ) : (
                                <div className="text-center py-16" style={{ color: "#A8A29E" }}>
                                    <p className="text-lg">El contenido de tu artículo aparecerá aquí</p>
                                    <p className="text-sm mt-2">Empieza a escribir en el editor para ver la vista previa</p>
                                </div>
                            )}

                            {/* Share buttons mock */}
                            <div className="mt-10 pt-6 border-t flex items-center gap-3" style={{ borderColor: "#E7E5E4" }}>
                                <span className="text-sm font-medium" style={{ color: "#78716C" }}>Compartir:</span>
                                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#1877F2" }}>Facebook</span>
                                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#000" }}>X</span>
                                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#25D366" }}>WhatsApp</span>
                            </div>
                        </div>
                    </div>

                    {/* Preview footer actions */}
                    <div className="bg-gray-50 border-t border-gray-200 px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm">📊 SEO:</span>
                                <span className="text-sm font-bold" style={{ color: seoColor(seo.score) }}>{seo.score}/100</span>
                            </div>
                            <span className="text-gray-300">|</span>
                            <span className="text-sm text-gray-500">{wordCount} palabras</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setTab("editor")}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                            >
                                ✏️ Editar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || optimizing || !title || !categorySlug || !summary}
                                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                style={{ background: loading ? "#9CA3AF" : "#1C1917" }}
                            >
                                {loading ? "⏳ Publicando..." : "📰 Publicar Nota"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

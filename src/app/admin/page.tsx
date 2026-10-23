import Link from "next/link";
import { query, queryOne } from "@/lib/db/mysql";

type Counts = { newsCount: number; featuredCount: number; breakingCount: number; magazinesCount: number };
type RecentNews = { id: string; title: string; category_name: string; published_at: string; source: string };

export default async function AdminDashboard() {
    const [counts, recentNews] = await Promise.all([
        queryOne<Counts>(
            `SELECT
                COUNT(*) AS newsCount,
                COALESCE(SUM(is_featured = 1), 0) AS featuredCount,
                COALESCE(SUM(is_breaking = 1), 0) AS breakingCount,
                (SELECT COUNT(*) FROM magazines) AS magazinesCount
             FROM news`
        ),
        query<RecentNews>(
            "SELECT id, title, category_name, published_at, source FROM news ORDER BY published_at DESC LIMIT 5"
        ),
    ]);
    const newsCount = Number(counts?.newsCount ?? 0);
    const magazinesCount = Number(counts?.magazinesCount ?? 0);
    const featuredCount = Number(counts?.featuredCount ?? 0);
    const breakingCount = Number(counts?.breakingCount ?? 0);

    const stats = [
        { label: "Total Notas", value: newsCount || 0, icon: "📰", color: "bg-blue-50 border-blue-200 text-blue-700" },
        { label: "Revistas", value: magazinesCount || 0, icon: "📖", color: "bg-green-50 border-green-200 text-green-700" },
        { label: "Destacadas", value: featuredCount || 0, icon: "⭐", color: "bg-amber-50 border-amber-200 text-amber-700" },
        { label: "Última Hora", value: breakingCount || 0, icon: "🔴", color: "bg-red-50 border-red-200 text-red-700" },
    ];

    const quickActions = [
        { label: "Nueva Nota", href: "/admin/notas/nueva", icon: "✏️", desc: "Publicar un artículo", bg: "bg-gray-900 text-white hover:bg-gray-800" },
        { label: "Nueva Revista", href: "/admin/revistas/nueva", icon: "📖", desc: "Subir PDF de revista", bg: "bg-green-600 text-white hover:bg-green-700" },
        { label: "Editar revistas subidas", href: "/admin/revistas/editar", icon: "📝", desc: "Buscar y corregir una edición publicada", bg: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50" },
        { label: "Ver Notas", href: "/admin/notas", icon: "📋", desc: "Administrar artículos", bg: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50" },
        { label: "Migración WP", href: "/admin/migrate", icon: "🔄", desc: "Importar de WordPress", bg: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50" },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Bienvenido al panel de administración de El Narrador de México</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className={`p-5 rounded-xl border shadow-sm ${stat.color}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{stat.icon}</span>
                        </div>
                        <p className="text-3xl font-bold">{stat.value}</p>
                        <p className="text-sm opacity-70 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {quickActions.map((action) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className={`p-4 rounded-xl font-medium transition-all duration-200 shadow-sm ${action.bg}`}
                        >
                            <span className="text-2xl block mb-2">{action.icon}</span>
                            <span className="font-semibold text-sm">{action.label}</span>
                            <p className="text-xs opacity-70 mt-0.5">{action.desc}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent News */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Notas recientes</h2>
                    <Link href="/admin/notas" className="text-blue-600 text-sm hover:underline">
                        Ver todas →
                    </Link>
                </div>
                <div className="divide-y divide-gray-50">
                    {recentNews?.map((news) => (
                        <div key={news.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{news.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {news.category_name} · {new Date(news.published_at).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}
                                </p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-3 shrink-0 ${
                                news.source === "wordpress" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                            }`}>
                                {news.source === "wordpress" ? "WP" : "SB"}
                            </span>
                        </div>
                    ))}
                    {(!recentNews || recentNews.length === 0) && (
                        <div className="px-5 py-8 text-center text-gray-400">
                            No hay notas aún. ¡Crea la primera!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

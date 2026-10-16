import { NextResponse } from "next/server";
import { query } from "@/lib/db/mysql";

export const dynamic = "force-dynamic";

// Pistas en español para los códigos de error más comunes de la conexión
const HINTS: Record<string, string> = {
  CONFIG: "Faltan variables MYSQL_* en Settings > Variables and Secrets del Worker (no solo en Build).",
  ER_ACCESS_DENIED_ERROR: "Usuario o contraseña de MySQL incorrectos. Revisa MYSQL_USER y MYSQL_PASSWORD.",
  ER_DBACCESS_DENIED_ERROR: "El usuario no tiene permisos sobre la base. Agrégalo a la base en cPanel con todos los privilegios.",
  ER_BAD_DB_ERROR: "La base de datos no existe. Revisa MYSQL_DATABASE (nombre completo con prefijo).",
  ER_NO_SUCH_TABLE: "Faltan tablas. Importa neubox/schema.sql en phpMyAdmin.",
  ER_HOST_NOT_PRIVILEGED: "Neubox no permite conexiones desde Cloudflare. Agrega el host % en cPanel > MySQL remoto.",
  ECONNREFUSED: "El servidor rechazó la conexión. Revisa MYSQL_HOST, el puerto 3306 y MySQL remoto en cPanel.",
  ETIMEDOUT: "No hubo respuesta del servidor MySQL. Revisa MYSQL_HOST y que Neubox permita conexiones remotas.",
  ENOTFOUND: "No se encontró el host. Revisa MYSQL_HOST.",
};

/**
 * Diagnóstico de la conexión a MySQL. No muestra valores de variables ni
 * contraseñas: solo si existen y el código del error.
 */
export async function GET() {
  const variables = Object.fromEntries(
    ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE", "AUTH_SECRET", "NEUBOX_UPLOAD_URL", "NEUBOX_UPLOAD_KEY"].map(
      (name) => [name, Boolean(process.env[name])]
    )
  );

  try {
    const [counts] = await query<{ notas: number; revistas: number; usuarios: number }>(
      `SELECT (SELECT COUNT(*) FROM news) AS notas,
              (SELECT COUNT(*) FROM magazines) AS revistas,
              (SELECT COUNT(*) FROM admin_users WHERE password_hash IS NOT NULL) AS usuarios`
    );
    return NextResponse.json({ ok: true, variables, datos: counts });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    const code = e.code ?? (e.message?.startsWith("Faltan las variables") ? "CONFIG" : "DESCONOCIDO");
    console.error("salud: fallo de conexión a MySQL", err);
    return NextResponse.json(
      { ok: false, variables, error: code, pista: HINTS[code] ?? "Error inesperado; revisa los logs del Worker." },
      { status: 500 }
    );
  }
}

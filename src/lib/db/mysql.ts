import mysql from "mysql2/promise";
import type { Connection, Pool, PoolOptions, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Conexión a la base MySQL del hosting Neubox (administrada con phpMyAdmin).
 *
 * - En Cloudflare (producción) se abre una conexión por consulta. Si existe el
 *   binding de Hyperdrive `HYPERDRIVE` se usan sus credenciales (recomendado:
 *   Hyperdrive mantiene el pool cerca de la base); si no, se conecta directo
 *   con las variables MYSQL_*.
 * - En Node (`next dev`, `next build`) se reutiliza un pool global.
 */

type HyperdriveBinding = {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
};

const baseOptions: PoolOptions = {
    charset: "utf8mb4",
    // Todas las fechas se guardan y leen en UTC
    timezone: "Z",
    // Workers no permite eval/new Function, que mysql2 usa por defecto para sus parsers
    disableEval: true,
    decimalNumbers: true,
    typeCast(field, next) {
        // TINYINT(1) es el BOOLEAN de MySQL: devolver true/false como hacía Supabase
        if (field.type === "TINY" && field.length === 1) {
            const value = field.string();
            return value === null ? null : value === "1";
        }
        // Fechas como string ISO (UTC), igual que las devolvía Supabase
        if (field.type === "DATETIME" || field.type === "TIMESTAMP" || field.type === "DATE") {
            const value = field.string();
            if (!value || value.startsWith("0000")) return null;
            const iso = value.includes(" ") ? value.replace(" ", "T") + "Z" : value + "T00:00:00Z";
            return new Date(iso).toISOString();
        }
        return next();
    },
};

function envOptions(): PoolOptions {
    const host = process.env.MYSQL_HOST;
    const user = process.env.MYSQL_USER;
    const database = process.env.MYSQL_DATABASE;
    if (!host || !user || !database) {
        throw new Error("Faltan las variables MYSQL_HOST, MYSQL_USER o MYSQL_DATABASE.");
    }
    return {
        ...baseOptions,
        host,
        user,
        database,
        password: process.env.MYSQL_PASSWORD ?? "",
        port: Number(process.env.MYSQL_PORT || 3306),
    };
}

function isCloudflareWorker() {
    return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

function getHyperdrive(): HyperdriveBinding | undefined {
    try {
        const { env } = getCloudflareContext();
        return (env as unknown as { HYPERDRIVE?: HyperdriveBinding }).HYPERDRIVE;
    } catch {
        return undefined;
    }
}

const globalForPool = globalThis as unknown as { __narradorMysqlPool?: Pool };

function getPool(): Pool {
    if (!globalForPool.__narradorMysqlPool) {
        globalForPool.__narradorMysqlPool = mysql.createPool({
            ...envOptions(),
            connectionLimit: 5,
            waitForConnections: true,
        });
    }
    return globalForPool.__narradorMysqlPool;
}

async function withConnection<T>(fn: (conn: Pick<Connection, "query">) => Promise<T>): Promise<T> {
    if (!isCloudflareWorker()) {
        return fn(getPool());
    }

    // En Workers una conexión no puede sobrevivir entre requests: abrir y cerrar
    const hyperdrive = getHyperdrive();
    const conn = await mysql.createConnection(
        hyperdrive
            ? {
                  ...baseOptions,
                  host: hyperdrive.host,
                  port: hyperdrive.port,
                  user: hyperdrive.user,
                  password: hyperdrive.password,
                  database: hyperdrive.database,
              }
            : envOptions()
    );
    try {
        return await fn(conn);
    } finally {
        conn.end().catch(() => {});
    }
}

export type Row = Record<string, unknown>;

/** SELECT: devuelve las filas. Usa `?` como placeholder. */
export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
    return withConnection(async (conn) => {
        const [rows] = await conn.query<RowDataPacket[]>(sql, params);
        return rows as unknown as T[];
    });
}

/** SELECT de una sola fila (o null). */
export async function queryOne<T = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await query<T>(sql, params);
    return rows[0] ?? null;
}

/** INSERT / UPDATE / DELETE: devuelve affectedRows, insertId, etc. */
export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
    return withConnection(async (conn) => {
        const [result] = await conn.query<ResultSetHeader>(sql, params);
        return result;
    });
}

/** Columnas JSON: MariaDB las entrega como texto y MySQL como objeto. */
export function parseJsonArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string" && value) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            return [];
        }
    }
    return [];
}

/** Escapa los comodines de LIKE para buscar texto literal. */
export function escapeLike(text: string) {
    return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

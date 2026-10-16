"use client";

import { useState } from "react";
import Image from "next/image";
import { loginAdmin } from "../actions";

export default function AdminLoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await loginAdmin(new FormData(e.currentTarget));

        if (result.success) {
            // Navegación completa para que el layout lea la cookie nueva
            window.location.href = "/admin";
        } else {
            setError(result.error ?? "No se pudo iniciar sesion. Intenta de nuevo.");
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#F5F5F0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "2rem",
            }}
        >
            <div
                style={{
                    background: "white",
                    borderRadius: "12px",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                    padding: "2.5rem",
                    width: "100%",
                    maxWidth: "420px",
                    border: "1px solid #E7E5E4",
                }}
            >
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <Image
                        src="/images/El Narrador logo sin fondo.png"
                        alt="El Narrador"
                        width={64}
                        height={64}
                        style={{ margin: "0 auto 1rem", borderRadius: "8px" }}
                    />
                    <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1C1917", margin: 0 }}>
                        El Narrador — Admin
                    </h1>
                    <p style={{ color: "#78716C", marginTop: "0.5rem", fontSize: "0.9rem" }}>
                        Ingresa tus credenciales para continuar
                    </p>
                </div>

                {error && (
                    <div
                        style={{
                            background: "#FEF2F2",
                            border: "1px solid #FECACA",
                            color: "#DC2626",
                            borderRadius: "8px",
                            padding: "0.75rem 1rem",
                            marginBottom: "1.25rem",
                            fontSize: "0.875rem",
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                        <label
                            htmlFor="email"
                            style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#44403C", marginBottom: "0.5rem" }}
                        >
                            Correo electrónico
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            style={{
                                width: "100%",
                                padding: "0.75rem 1rem",
                                border: "1.5px solid #E7E5E4",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                color: "#1C1917",
                                outline: "none",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#44403C", marginBottom: "0.5rem" }}
                        >
                            Contraseña
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            style={{
                                width: "100%",
                                padding: "0.75rem 1rem",
                                border: "1.5px solid #E7E5E4",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                color: "#1C1917",
                                outline: "none",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "0.875rem",
                            background: loading ? "#A8A29E" : "#1C1917",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            cursor: loading ? "not-allowed" : "pointer",
                            marginTop: "0.5rem",
                        }}
                    >
                        {loading ? "Iniciando sesión..." : "Entrar al Panel"}
                    </button>
                </form>
            </div>
        </div>
    );
}

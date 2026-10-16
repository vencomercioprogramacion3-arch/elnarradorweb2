/**
 * Las imágenes del WordPress anterior siguen en el hosting de Neubox, pero
 * `elnarradordemexico.com` ahora apunta a Cloudflare. Este subdominio apunta a
 * la carpeta del WordPress en Neubox (la que contiene `wp-content/`).
 * Ver neubox/README.md, sección "Imágenes del WordPress anterior".
 */
export const LEGACY_WP_ORIGIN = "https://wp.elnarradordemexico.com";

// elnarradordemexico.com/wp-content/... (con o sin www) y las copias del CDN de
// Jetpack (i0/i1/i2.wp.com/elnarradordemexico.com/wp-content/...?resize=...)
const LEGACY_URL =
  /https?:\/\/(?:i[0-3]\.wp\.com\/)?(?:www\.)?elnarradordemexico\.com(\/wp-content\/[^\s"'<>)?]*)(?:\?[^\s"'<>)]*)?/g;

/** Reescribe las URLs de imágenes del WordPress anterior al subdominio de Neubox. */
export function fixLegacyMediaUrls(text: string): string;
export function fixLegacyMediaUrls(text: string | null | undefined): string | null | undefined;
export function fixLegacyMediaUrls(text: string | null | undefined) {
  if (!text) return text;
  return text.replace(LEGACY_URL, (_match, path: string) => `${LEGACY_WP_ORIGIN}${path}`);
}

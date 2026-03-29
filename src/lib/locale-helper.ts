/**
 * Get locale-specific value from a Record<string, string> map.
 * Falls back to English if the requested locale is not found.
 */
export function t(map: Record<string, string>, locale: string): string {
    return map[locale] ?? map.en ?? "";
}

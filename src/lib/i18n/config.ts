export const locales = ["en", "zh", "ja", "fr", "es", "hi"] as const;
export const defaultLocale = "en" as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
    en: "English",
    zh: "中文",
    ja: "日本語",
    fr: "Français",
    es: "Español",
    hi: "हिन्दी",
};

export const areas = [
    "roppongi",
    "akasaka",
    "shinjuku",
    "shibuya",
    "kabukicho",
    "ginza",
    "ikebukuro",
] as const;

export type Area = (typeof areas)[number];

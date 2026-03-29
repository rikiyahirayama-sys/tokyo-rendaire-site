"use client";

import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";

export default function LanguageSwitcher() {
    const locale = useLocale();
    const rawPathname = usePathname();

    function switchLocale(newLocale: Locale) {
        // Remove current locale prefix and add new one
        const pathWithoutLocale = rawPathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
        const newPath = `/${newLocale}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`;
        window.location.href = newPath;
    }

    return (
        <div className="flex items-center gap-2">
            {locales.map((loc) => (
                <button
                    key={loc}
                    onClick={() => switchLocale(loc)}
                    className={`text-sm font-medium px-2 py-1 rounded transition-colors ${locale === loc
                        ? "text-gold-400 bg-gold-400/10"
                        : "text-dark-400 hover:text-white"
                        }`}
                >
                    {localeNames[loc]}
                </button>
            ))}
        </div>
    );
}

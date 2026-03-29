import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n/config";

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localeDetection: true,
    localePrefix: "always",
});

export default function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow entrance page, API routes, admin panel, static files
    if (
        pathname === "/entrance" ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/_vercel") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // Check age verification cookie
    const ageVerified = request.cookies.get("age_verified")?.value === "true";

    if (!ageVerified) {
        const url = request.nextUrl.clone();
        url.pathname = "/entrance";
        return NextResponse.redirect(url);
    }

    // Root path redirect to default locale
    if (pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = `/${defaultLocale}`;
        return NextResponse.redirect(url);
    }

    return intlMiddleware(request);
}

export const config = {
    matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

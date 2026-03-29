import { NextRequest, NextResponse } from "next/server";
import { readEnv, writeEnv, maskValue, createLegacySession, validateLegacySession } from "@/lib/legacy-helpers";

// POST /api/auth/login
export async function POST(request: NextRequest) {
    try {
        const { id, password } = await request.json();
        const env = readEnv();
        const adminId = process.env.ADMIN_ID || env.ADMIN_ID || "";
        const adminPw = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD || "changethispassword";

        if (id === adminId && password === adminPw) {
            const token = createLegacySession();
            const response = NextResponse.json({ success: true });
            response.cookies.set("legacy_session", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
                maxAge: 60 * 60 * 24,
            });
            return response;
        }
        return NextResponse.json({ success: false, error: "IDまたはパスワードが正しくありません" }, { status: 401 });
    } catch {
        return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 });
    }
}

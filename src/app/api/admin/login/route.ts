import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials } from "@/lib/admin-auth";
import crypto from "crypto";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password || typeof email !== "string" || typeof password !== "string") {
            return NextResponse.json({ error: "Email and password required" }, { status: 400 });
        }

        if (!verifyAdminCredentials(email, password)) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // Generate session token
        const sessionToken = crypto.randomBytes(32).toString("hex");

        // Store token (in production, store in DB/Redis)
        // For now, validate against env secret
        const response = NextResponse.json({ success: true });
        response.cookies.set("admin_session", process.env.ADMIN_SESSION_SECRET || sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 8, // 8 hours
        });

        return response;
    } catch {
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}

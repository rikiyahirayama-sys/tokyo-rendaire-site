import { NextRequest, NextResponse } from "next/server";

/**
 * Validates admin session token.
 * In production, replace with proper session/JWT verification.
 */
export function validateAdminSession(request: NextRequest): boolean {
    const token = request.cookies.get("admin_session")?.value;
    if (!token) return false;

    const validToken = process.env.ADMIN_SESSION_SECRET;
    if (!validToken) return false;

    return token === validToken;
}

/**
 * Simple email + password admin login.
 * In production, use proper auth (e.g., NextAuth).
 */
export function verifyAdminCredentials(email: string, password: string): boolean {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) return false;

    if (email.toLowerCase() !== adminEmail.toLowerCase()) return false;

    // Constant-time comparison to prevent timing attacks
    if (password.length !== adminPassword.length) return false;
    let result = 0;
    for (let i = 0; i < password.length; i++) {
        result |= password.charCodeAt(i) ^ adminPassword.charCodeAt(i);
    }
    return result === 0;
}

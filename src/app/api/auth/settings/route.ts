import { NextRequest, NextResponse } from "next/server";
import { readEnv, writeEnv, maskValue, validateLegacySession } from "@/lib/legacy-helpers";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

// GET /api/auth/settings — return masked env values
export async function GET(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const env = readEnv();
    const masked: Record<string, string> = {};
    Object.entries(env).forEach(([key, val]) => {
        if (key === "PORT" || key === "SITE_URL") {
            masked[key] = val;
        } else {
            masked[key] = maskValue(val);
        }
    });
    return NextResponse.json({ success: true, settings: masked });
}

// POST /api/auth/settings — update env values
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const env = readEnv();
        const updates = await request.json();

        Object.entries(updates).forEach(([key, val]) => {
            if (typeof val === "string" && val.includes("•")) return;
            env[key] = val as string;
        });

        writeEnv(env);
        return NextResponse.json({ success: true, message: "設定を保存しました" });
    } catch {
        return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
    }
}

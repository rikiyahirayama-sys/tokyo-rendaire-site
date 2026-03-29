import { NextRequest, NextResponse } from "next/server";
import { validateLegacySession } from "@/lib/legacy-helpers";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

// POST /api/auth/settings/test — test external service connection
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { service } = await request.json();

        switch (service) {
            case "claude": {
                if (!process.env.ANTHROPIC_API_KEY) {
                    return NextResponse.json({ success: false, message: "エラー: APIキーが設定されていません" });
                }
                const Anthropic = (await import("@anthropic-ai/sdk")).default;
                const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
                await client.messages.create({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 10,
                    messages: [{ role: "user", content: "test" }],
                });
                return NextResponse.json({ success: true, message: "接続成功" });
            }
            default:
                return NextResponse.json({ success: false, message: "不明なサービスです" }, { status: 400 });
        }
    } catch (e) {
        return NextResponse.json({ success: false, message: `エラー: ${(e as Error).message}` });
    }
}

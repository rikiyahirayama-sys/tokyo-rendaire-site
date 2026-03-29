import { NextRequest, NextResponse } from "next/server";
import { historyPath, readJSON } from "@/lib/legacy-helpers";

// GET /api/sns/history
export async function GET(request: NextRequest) {
    try {
        const history = readJSON(historyPath) as { createdAt: string; results?: { platform: string }[]; platforms?: string[];[k: string]: unknown }[];
        const platform = request.nextUrl.searchParams.get("platform");
        let filtered = history;

        if (platform) {
            filtered = history.filter((h) => {
                if (h.results) return h.results.some((r) => r.platform === platform);
                if (h.platforms) return h.platforms.includes(platform);
                return true;
            });
        }

        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return NextResponse.json({ success: true, history: filtered });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

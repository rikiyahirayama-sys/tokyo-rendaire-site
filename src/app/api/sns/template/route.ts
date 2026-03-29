import { NextRequest, NextResponse } from "next/server";
import { castsPath, readJSON, validateLegacySession } from "@/lib/legacy-helpers";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

// POST /api/sns/template — template-based post generation
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { type, data } = await request.json();
        const claude = require("../../../../services/claude");
        let posts = null;

        switch (type) {
            case "daily_schedule": {
                const casts = (readJSON(castsPath) as { status: string;[k: string]: unknown }[]).filter((c) => c.status === "出勤中");
                posts = await claude.generateDailySchedule(casts);
                break;
            }
            case "new_cast": {
                const casts = readJSON(castsPath) as { id: number;[k: string]: unknown }[];
                const cast = casts.find((c) => String(c.id) === String(data.castId));
                if (!cast) return NextResponse.json({ success: false, error: "キャストが見つかりません" }, { status: 404 });
                posts = await claude.generateNewCastAnnouncement(cast);
                break;
            }
            case "campaign":
                posts = await claude.generateCampaign(data);
                break;
            case "review":
                posts = await claude.generateReviewPost(data);
                break;
            case "weekend": {
                const casts = readJSON(castsPath) as { id: number;[k: string]: unknown }[];
                const available = (data.castIds || []).map((id: string) => casts.find((c) => String(c.id) === String(id))).filter(Boolean);
                posts = await claude.generateWeekendAvailability({ availableCasts: available, notes: data.notes });
                break;
            }
            case "cast_return": {
                const casts = readJSON(castsPath) as { id: number;[k: string]: unknown }[];
                const cast = casts.find((c) => String(c.id) === String(data.castId));
                if (!cast) return NextResponse.json({ success: false, error: "キャストが見つかりません" }, { status: 404 });
                posts = await claude.generateCastReturn(cast, data.message);
                break;
            }
            case "ranking": {
                const casts = readJSON(castsPath) as unknown[];
                posts = await claude.generateMonthlyRanking(casts.slice(0, 10));
                break;
            }
            case "announcement":
                posts = await claude.generateAnnouncement(data);
                break;
            default:
                return NextResponse.json({ success: false, error: "不明なテンプレートタイプです" }, { status: 400 });
        }

        if (posts.error) return NextResponse.json({ success: false, error: posts.error });
        return NextResponse.json({ success: true, posts, type });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

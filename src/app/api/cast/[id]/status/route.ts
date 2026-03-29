import { NextRequest, NextResponse } from "next/server";
import { castsPath, readJSON, writeJSON, validateLegacySession } from "@/lib/legacy-helpers";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

interface Cast {
    id: number;
    status: string;
    [key: string]: unknown;
}

// PUT /api/cast/[id]/status
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const casts = readJSON(castsPath) as Cast[];
        const idx = casts.findIndex((c) => String(c.id) === params.id);
        if (idx === -1) return NextResponse.json({ success: false, error: "キャストが見つかりません" }, { status: 404 });

        const { status } = await request.json();
        const validStatuses = ["出勤中", "待機中", "休み", "新人"];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ success: false, error: "無効なステータスです" }, { status: 400 });
        }

        casts[idx].status = status;
        writeJSON(castsPath, casts);
        return NextResponse.json({ success: true, cast: casts[idx] });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

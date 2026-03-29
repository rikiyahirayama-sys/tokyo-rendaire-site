import { NextRequest, NextResponse } from "next/server";
import { draftsPath, readJSON, writeJSON, validateLegacySession } from "@/lib/legacy-helpers";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

// POST /api/sns/draft — save draft
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const body = await request.json();
        const drafts = readJSON(draftsPath) as unknown[];
        const draft = {
            id: Date.now(),
            ...body,
            createdAt: new Date().toISOString(),
        };
        drafts.push(draft);
        writeJSON(draftsPath, drafts);
        return NextResponse.json({ success: true, draft });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

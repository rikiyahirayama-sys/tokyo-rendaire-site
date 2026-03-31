import { NextRequest, NextResponse } from "next/server";
import { castsPath, historyPath, draftsPath, readJSON, writeJSON, validateLegacySession } from "@/lib/legacy-helpers";
import fs from "fs";
import path from "path";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// POST /api/sns/generate
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const url = new URL(request.url);
        const action = url.pathname.split("/").pop(); // "generate"

        // This route handles /api/sns/generate only — other sns routes have their own files
        const { topics } = await request.json();
        const claude = require("../../../../../services/claude");
        const result = await claude.generateWeeklyPosts(topics);
        if (result.error) return NextResponse.json({ success: false, error: result.error });
        return NextResponse.json({ success: true, posts: result });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

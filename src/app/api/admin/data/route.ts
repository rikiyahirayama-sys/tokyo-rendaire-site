import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin-auth";
import { readSiteData, updateSiteData } from "@/lib/store";
import type { SiteData } from "@/lib/store";

// GET — read all site data
export async function GET(request: NextRequest) {
    if (!validateAdminSession(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = readSiteData();
    return NextResponse.json(data);
}

// PUT — update site data (partial)
export async function PUT(request: NextRequest) {
    if (!validateAdminSession(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const allowedKeys: (keyof SiteData)[] = ["settings", "sns", "casts", "courses", "areas", "bookings"];
        const partial: Partial<SiteData> = {};

        for (const key of allowedKeys) {
            if (key in body) {
                (partial as Record<string, unknown>)[key] = body[key];
            }
        }

        const updated = updateSiteData(partial);
        return NextResponse.json({ success: true, data: updated });
    } catch {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
}

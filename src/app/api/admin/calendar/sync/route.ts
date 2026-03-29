import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin-auth";
import { getTodaySchedule, syncAllCastSchedules, CastCalendarConfig } from "@/lib/calendar";

export async function GET(request: NextRequest) {
    if (!validateAdminSession(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ status: "ok" });
}

export async function POST(request: NextRequest) {
    if (!validateAdminSession(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => null);

        // If cast configs are provided, sync per-cast calendars
        if (body?.casts && Array.isArray(body.casts)) {
            const castConfigs: CastCalendarConfig[] = body.casts.map((c: { castId: string; castName: string; calendarId: string }) => ({
                castId: c.castId,
                castName: c.castName,
                calendarId: c.calendarId,
            }));

            const results = await syncAllCastSchedules(castConfigs);

            return NextResponse.json({
                success: true,
                synced: results.filter((r) => r.status === "synced").length,
                results: results.map((r) => ({
                    castId: r.castId,
                    castName: r.castName,
                    status: r.status,
                    events: r.events.map((e) => ({
                        start: e.start,
                        end: e.end,
                    })),
                })),
                syncedAt: new Date().toISOString(),
            });
        }

        // Fallback: sync from main calendar
        const events = await getTodaySchedule();
        const castSchedules = events.map((event) => ({
            castId: event.castId,
            castName: event.castName,
            start: event.start,
            end: event.end,
            available: true,
        }));

        return NextResponse.json({
            success: true,
            synced: events.length,
            schedules: castSchedules,
            syncedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Calendar sync error:", error);
        return NextResponse.json(
            { error: "Sync failed" },
            { status: 500 }
        );
    }
}

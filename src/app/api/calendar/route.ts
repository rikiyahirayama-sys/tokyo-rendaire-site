import { NextResponse } from "next/server";
import { getTodaySchedule } from "@/lib/calendar";

/**
 * Returns today's cast schedule from Google Calendar.
 * Used by the LP to show real-time availability.
 */
export async function GET() {
    try {
        const schedule = await getTodaySchedule();
        return NextResponse.json({ schedule });
    } catch (error) {
        console.error("Calendar API error:", error);
        return NextResponse.json({ schedule: [] });
    }
}

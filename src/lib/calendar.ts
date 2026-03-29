import { google } from "googleapis";

function getCalendarClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    return google.calendar({ version: "v3", auth });
}

export interface CalendarEvent {
    castId: string;
    castName: string;
    start: string;
    end: string;
}

export interface CastCalendarConfig {
    castId: string;
    castName: string;
    calendarId: string;
}

/**
 * Fetches today's schedule from a single Google Calendar.
 * Each calendar event should have the cast name in the event title (e.g., "Yui - Available")
 */
export async function getTodaySchedule(): Promise<CalendarEvent[]> {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) return [];

    return fetchEventsFromCalendar(calendarId);
}

/**
 * Fetches today's events from a specific calendar ID.
 */
async function fetchEventsFromCalendar(calendarId: string): Promise<CalendarEvent[]> {
    try {
        const calendar = getCalendarClient();
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const res = await calendar.events.list({
            calendarId,
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });

        const events = res.data.items || [];
        return events
            .filter((e) => e.summary && e.start?.dateTime && e.end?.dateTime)
            .map((e) => {
                const [castName] = (e.summary || "").split(" - ");
                return {
                    castId: castName.toLowerCase().replace(/\s+/g, "-"),
                    castName: castName.trim(),
                    start: e.start!.dateTime!,
                    end: e.end!.dateTime!,
                };
            });
    } catch (error) {
        console.error("Failed to fetch Google Calendar events:", error);
        return [];
    }
}

/**
 * Fetches today's schedule for a specific cast from their personal Google Calendar.
 * Events are treated as available time slots.
 */
export async function getCastSchedule(
    config: CastCalendarConfig
): Promise<CalendarEvent[]> {
    if (!config.calendarId) return [];

    try {
        const calendar = getCalendarClient();
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const res = await calendar.events.list({
            calendarId: config.calendarId,
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });

        const events = res.data.items || [];
        return events
            .filter((e) => e.start?.dateTime && e.end?.dateTime)
            .map((e) => ({
                castId: config.castId,
                castName: config.castName,
                start: e.start!.dateTime!,
                end: e.end!.dateTime!,
            }));
    } catch (error) {
        console.error(`Failed to fetch calendar for ${config.castName}:`, error);
        return [];
    }
}

/**
 * Syncs schedules for multiple casts from their individual Google Calendars.
 */
export async function syncAllCastSchedules(
    casts: CastCalendarConfig[]
): Promise<{ castId: string; castName: string; events: CalendarEvent[]; status: "synced" | "error" }[]> {
    const results = await Promise.allSettled(
        casts
            .filter((c) => c.calendarId)
            .map(async (cast) => {
                const events = await getCastSchedule(cast);
                return {
                    castId: cast.castId,
                    castName: cast.castName,
                    events,
                    status: "synced" as const,
                };
            })
    );

    return results.map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        return {
            castId: casts[i].castId,
            castName: casts[i].castName,
            events: [],
            status: "error" as const,
        };
    });
}

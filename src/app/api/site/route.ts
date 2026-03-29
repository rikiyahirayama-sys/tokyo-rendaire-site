import { NextResponse } from "next/server";
import { readSiteData } from "@/lib/store";

// GET — public read-only endpoint for LP data
export async function GET() {
    const data = readSiteData();
    return NextResponse.json({
        settings: {
            storeName: data.settings.storeName,
            openTime: data.settings.openTime,
            closeTime: data.settings.closeTime,
            phone: data.settings.phone,
        },
        sns: data.sns,
        casts: data.casts,
        courses: data.courses,
        areas: data.areas,
    });
}

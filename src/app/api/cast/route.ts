import { NextRequest, NextResponse } from "next/server";
import { castsPath, readJSON, writeJSON, validateLegacySession } from "@/lib/legacy-helpers";
import fs from "fs";
import path from "path";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

interface Cast {
    id: number;
    name: string;
    age: number;
    height: number;
    bust: string;
    waist: number;
    hip: number;
    description_ja: string;
    description_en: string;
    description_zh: string;
    photos: string[];
    status: string;
    createdAt: string;
}

// GET /api/cast — list all casts
export async function GET(request: NextRequest) {
    try {
        const casts = readJSON(castsPath);
        return NextResponse.json({ success: true, casts });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

// POST /api/cast — create a new cast (multipart/form-data with photos)
export async function POST(request: NextRequest) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const formData = await request.formData();
        const casts = readJSON(castsPath) as Cast[];

        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const photos: string[] = [];
        const files = formData.getAll("photos");
        for (const file of files) {
            if (file instanceof File) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
                const filename = Date.now() + "_" + safeName;
                fs.writeFileSync(path.join(uploadDir, filename), buffer);
                photos.push("uploads/" + filename);
            }
        }

        const newCast: Cast = {
            id: Date.now(),
            name: (formData.get("name") as string) || "",
            age: parseInt((formData.get("age") as string) || "0") || 0,
            height: parseInt((formData.get("height") as string) || "0") || 0,
            bust: (formData.get("bust") as string) || "",
            waist: parseInt((formData.get("waist") as string) || "0") || 0,
            hip: parseInt((formData.get("hip") as string) || "0") || 0,
            description_ja: (formData.get("description_ja") as string) || "",
            description_en: (formData.get("description_en") as string) || "",
            description_zh: (formData.get("description_zh") as string) || "",
            photos,
            status: "新人",
            createdAt: new Date().toISOString(),
        };

        casts.push(newCast);
        writeJSON(castsPath, casts);
        return NextResponse.json({ success: true, cast: newCast });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

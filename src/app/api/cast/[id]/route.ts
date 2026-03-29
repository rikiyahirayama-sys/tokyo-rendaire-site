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

// GET /api/cast/[id]
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const casts = readJSON(castsPath) as Cast[];
        const cast = casts.find((c) => String(c.id) === params.id);
        if (!cast) return NextResponse.json({ success: false, error: "キャストが見つかりません" }, { status: 404 });
        return NextResponse.json({ success: true, cast });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

// PUT /api/cast/[id]
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const formData = await request.formData();
        const casts = readJSON(castsPath) as Cast[];
        const idx = casts.findIndex((c) => String(c.id) === params.id);
        if (idx === -1) return NextResponse.json({ success: false, error: "キャストが見つかりません" }, { status: 404 });

        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const newPhotos: string[] = [];
        const files = formData.getAll("photos");
        for (const file of files) {
            if (file instanceof File) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
                const filename = Date.now() + "_" + safeName;
                fs.writeFileSync(path.join(uploadDir, filename), buffer);
                newPhotos.push("uploads/" + filename);
            }
        }

        const existing = casts[idx];
        casts[idx] = {
            ...existing,
            name: (formData.get("name") as string) || existing.name,
            age: formData.get("age") ? parseInt(formData.get("age") as string) : existing.age,
            height: formData.get("height") ? parseInt(formData.get("height") as string) : existing.height,
            bust: (formData.get("bust") as string) || existing.bust,
            waist: formData.get("waist") ? parseInt(formData.get("waist") as string) : existing.waist,
            hip: formData.get("hip") ? parseInt(formData.get("hip") as string) : existing.hip,
            description_ja: formData.has("description_ja") ? (formData.get("description_ja") as string) : existing.description_ja,
            description_en: formData.has("description_en") ? (formData.get("description_en") as string) : existing.description_en,
            description_zh: formData.has("description_zh") ? (formData.get("description_zh") as string) : existing.description_zh,
            photos: newPhotos.length > 0 ? [...existing.photos, ...newPhotos] : existing.photos,
            status: (formData.get("status") as string) || existing.status,
        };

        writeJSON(castsPath, casts);
        return NextResponse.json({ success: true, cast: casts[idx] });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

// DELETE /api/cast/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const casts = readJSON(castsPath) as Cast[];
        const idx = casts.findIndex((c) => String(c.id) === params.id);
        if (idx === -1) return NextResponse.json({ success: false, error: "キャストが見つかりません" }, { status: 404 });
        casts.splice(idx, 1);
        writeJSON(castsPath, casts);
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

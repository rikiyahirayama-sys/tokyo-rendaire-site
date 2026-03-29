import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MIME_TYPES: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
};

// GET /uploads/[...path] — serve uploaded files
export async function GET(_request: NextRequest, { params }: { params: { path: string[] } }) {
    const filePath = path.join(process.cwd(), "uploads", ...params.path);

    // Prevent directory traversal
    const resolved = path.resolve(filePath);
    const uploadsDir = path.resolve(path.join(process.cwd(), "uploads"));
    if (!resolved.startsWith(uploadsDir)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!fs.existsSync(resolved)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const buffer = fs.readFileSync(resolved);

    return new NextResponse(buffer, {
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
    });
}

import { NextRequest, NextResponse } from "next/server";
import { blogDir, validateLegacySession } from "@/lib/legacy-helpers";
import fs from "fs";
import path from "path";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

function getLocalArticles() {
    if (!fs.existsSync(blogDir)) return [];
    return fs
        .readdirSync(blogDir)
        .filter((f) => f.endsWith(".html") && f !== "index.html")
        .map((f) => {
            const content = fs.readFileSync(path.join(blogDir, f), "utf-8");
            const titleMatch = content.match(/<h1>(.*?)<\/h1>/);
            const metaMatch = content.match(/<meta name="description" content="(.*?)">/);
            const dateMatch = content.match(/Published: (\d{4}-\d{2}-\d{2})/);
            return {
                slug: f.replace(".html", ""),
                title: titleMatch ? titleMatch[1] : f,
                meta: metaMatch ? metaMatch[1] : "",
                date: dateMatch ? dateMatch[1] : "",
            };
        });
}

// GET /api/blog/list
export async function GET() {
    try {
        const articles = getLocalArticles();
        return NextResponse.json({ success: true, articles });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

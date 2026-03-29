import { NextRequest, NextResponse } from "next/server";
import { blogDir, validateLegacySession } from "@/lib/legacy-helpers";
import fs from "fs";
import path from "path";

function getSession(request: NextRequest): boolean {
    const token = request.cookies.get("legacy_session")?.value;
    return validateLegacySession(token);
}

// DELETE /api/blog/[slug]
export async function DELETE(request: NextRequest, { params }: { params: { slug: string } }) {
    if (!getSession(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
        const safeSlug = params.slug.replace(/[^a-zA-Z0-9-]/g, "");
        const filePath = path.join(blogDir, `${safeSlug}.html`);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
            const github = require("../../../../services/github");
            await github.deleteFile(`blog/${safeSlug}.html`, `Delete blog: ${safeSlug}`);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 });
    }
}

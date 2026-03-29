import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const envPath = path.join(process.cwd(), ".env");

// ===== .env read/write =====
export function readEnv(): Record<string, string> {
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, "utf-8");
    const env: Record<string, string> = {};
    content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const idx = trimmed.indexOf("=");
        if (idx === -1) return;
        env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
    });
    return env;
}

export function writeEnv(envObj: Record<string, string>) {
    const lines = Object.entries(envObj).map(([k, v]) => `${k}=${v}`);
    fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf-8");
    Object.entries(envObj).forEach(([k, v]) => {
        process.env[k] = v;
    });
}

export function maskValue(val: string): string {
    if (!val || val.length === 0) return "";
    if (val.length <= 4) return val;
    return val.substring(0, 4) + "•".repeat(Math.min(val.length - 4, 20));
}

// ===== JSON data helpers =====
export function readJSON(filePath: string): unknown[] {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function writeJSON(filePath: string, data: unknown) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ===== Data file paths =====
export const castsPath = path.join(dataDir, "casts.json");
export const historyPath = path.join(dataDir, "posts-history.json");
export const draftsPath = path.join(dataDir, "drafts.json");
export const blogDir = path.join(process.cwd(), "blog");

// ===== Session helpers =====
// Legacy admin uses express-session. For Next.js we use a simple cookie-based check.
const sessionStore = new Map<string, { isAdmin: boolean; expires: number }>();

export function createLegacySession(): string {
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    sessionStore.set(token, { isAdmin: true, expires: Date.now() + 24 * 60 * 60 * 1000 });
    return token;
}

export function validateLegacySession(token: string | undefined): boolean {
    if (!token) return false;
    const session = sessionStore.get(token);
    if (!session) return false;
    if (Date.now() > session.expires) {
        sessionStore.delete(token);
        return false;
    }
    return session.isAdmin;
}

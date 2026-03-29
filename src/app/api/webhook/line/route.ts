import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { generateAIReply, detectLocale } from "@/lib/auto-response";

/**
 * LINE Messaging API webhook.
 * Handles verification and incoming messages with AI auto-response.
 */
export async function POST(request: NextRequest) {
    try {
        // Verify signature
        const signature = request.headers.get("x-line-signature");
        const body = await request.text();
        const channelSecret = process.env.LINE_CHANNEL_SECRET || "";

        if (channelSecret && signature) {
            const hash = crypto
                .createHmac("sha256", channelSecret)
                .update(body)
                .digest("base64");
            if (hash !== signature) {
                return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
            }
        }

        const parsed = JSON.parse(body);
        const events = parsed.events || [];

        for (const event of events) {
            if (event.type !== "message" || event.message.type !== "text") continue;

            const userId = event.source.userId;
            const text = event.message.text;
            const replyToken = event.replyToken;

            const locale = detectLocale(text);
            const reply = generateAIReply(`line:${userId}`, text, locale);

            // Reply via LINE Messaging API
            await sendLINEReply(replyToken, reply);
        }

        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("LINE webhook error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}

async function sendLINEReply(replyToken: string, message: string): Promise<boolean> {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
        console.error("LINE_CHANNEL_ACCESS_TOKEN not configured");
        return false;
    }

    try {
        const res = await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                replyToken,
                messages: [{ type: "text", text: message }],
            }),
        });
        return res.ok;
    } catch (error) {
        console.error("Failed to send LINE reply:", error);
        return false;
    }
}

import { NextRequest, NextResponse } from "next/server";
import { generateAIReply, detectLocale } from "@/lib/auto-response";

/**
 * Telegram Bot webhook.
 * Handles incoming messages with AI auto-response.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const message = body.message;

        if (!message?.text) {
            return NextResponse.json({ status: "no message" });
        }

        const chatId = message.chat.id;
        const text = message.text;

        const locale = detectLocale(text);
        const reply = generateAIReply(`telegram:${chatId}`, text, locale);

        // Reply via Telegram Bot API
        await sendTelegramMessage(chatId, reply);

        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("Telegram webhook error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}

async function sendTelegramMessage(chatId: number | string, message: string): Promise<boolean> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        console.error("TELEGRAM_BOT_TOKEN not configured");
        return false;
    }

    try {
        const res = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: "HTML",
                }),
            }
        );
        return res.ok;
    } catch (error) {
        console.error("Failed to send Telegram message:", error);
        return false;
    }
}

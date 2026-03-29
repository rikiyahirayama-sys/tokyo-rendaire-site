import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/messaging";
import { generateAIReply, detectLocale } from "@/lib/auto-response";
import { notifyOwner } from "@/lib/notify";

/**
 * WhatsApp webhook verification (GET) and message handler (POST).
 * Uses AI auto-response for multi-step booking conversations.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (
        mode === "subscribe" &&
        token === process.env.WHATSAPP_VERIFY_TOKEN
    ) {
        return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (!value?.messages?.[0]) {
            return NextResponse.json({ status: "no message" });
        }

        const message = value.messages[0];
        const from = message.from;
        const text = message.text?.body || "";

        // Detect locale from message content
        const locale = detectLocale(text);

        // Generate AI auto-reply with conversation state
        const reply = generateAIReply(`whatsapp:${from}`, text, locale);
        const sent = await sendWhatsAppMessage(from, reply);

        return NextResponse.json({ status: "ok", sent });
    } catch (error) {
        console.error("WhatsApp webhook error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}

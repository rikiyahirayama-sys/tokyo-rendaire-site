import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { generateAIReply, detectLocale } from "@/lib/auto-response";

/**
 * WeChat Official Account message webhook.
 * Uses AI auto-response for multi-step booking conversations.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const signature = searchParams.get("signature") || "";
    const timestamp = searchParams.get("timestamp") || "";
    const nonce = searchParams.get("nonce") || "";
    const echostr = searchParams.get("echostr") || "";

    const token = process.env.WECHAT_TOKEN || "";
    const arr = [token, timestamp, nonce].sort();
    const hash = crypto.createHash("sha1").update(arr.join("")).digest("hex");

    if (hash === signature) {
        return new NextResponse(echostr, { status: 200 });
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
    try {
        const text = await request.text();
        const fromMatch = text.match(/<FromUserName><!\[CDATA\[(.*?)\]\]>/);
        const contentMatch = text.match(/<Content><!\[CDATA\[(.*?)\]\]>/);

        const fromUser = fromMatch?.[1] || "unknown";
        const content = contentMatch?.[1] || "";

        const locale = detectLocale(content);
        const reply = generateAIReply(`wechat:${fromUser}`, content, locale);

        // WeChat expects XML response
        const responseXml = `<xml>
  <ToUserName><![CDATA[${fromUser}]]></ToUserName>
  <FromUserName><![CDATA[${process.env.WECHAT_APP_ID}]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${reply}]]></Content>
</xml>`;

        return new NextResponse(responseXml, {
            status: 200,
            headers: { "Content-Type": "application/xml" },
        });
    } catch (error) {
        console.error("WeChat webhook error:", error);
        return new NextResponse("success", { status: 200 });
    }
}

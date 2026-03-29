import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { sendBookingConfirmation } from "@/lib/messaging";

export async function POST(request: NextRequest) {
    const payload = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event;
    try {
        event = getStripe().webhooks.constructEvent(
            payload,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error("Stripe webhook verification failed:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object;
            const metadata = session.metadata || {};

            console.log(`[PAYMENT] Booking ${metadata.bookingId} paid successfully`);

            // Send confirmation to customer via WhatsApp
            if (metadata.customerPhone) {
                await sendBookingConfirmation(metadata.customerPhone, {
                    bookingId: metadata.bookingId || "",
                    castName: metadata.castName || "To be assigned",
                    date: metadata.date || "",
                    time: metadata.time || "",
                    hotel: metadata.hotel || "",
                    courseName: metadata.courseId || "",
                    total: session.amount_total || 0,
                });
            }
            break;
        }

        case "checkout.session.expired": {
            const session = event.data.object;
            console.log(
                `[PAYMENT] Session expired for booking ${session.metadata?.bookingId}`
            );
            break;
        }

        default:
            console.log(`[STRIPE] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}

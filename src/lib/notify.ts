import { sendWhatsAppMessage } from "./messaging";

/**
 * Notifies the owner about events that need attention.
 */
export async function notifyOwner(
    type: "new_booking" | "unhandled_message" | "payment_failed" | "cancellation",
    details: Record<string, string>
): Promise<void> {
    const ownerPhone = process.env.OWNER_PHONE_NUMBER;
    if (!ownerPhone) {
        console.error("OWNER_PHONE_NUMBER not configured");
        return;
    }

    let message = "";
    switch (type) {
        case "new_booking":
            message = [
                `🔔 NEW BOOKING`,
                `ID: ${details.bookingId}`,
                `Customer: ${details.customerName}`,
                `Phone: ${details.customerPhone}`,
                `Date: ${details.date} ${details.time}`,
                `Course: ${details.courseName}`,
                `Cast: ${details.castName || "Any"}`,
                `Hotel: ${details.hotel} Room ${details.roomNumber}`,
                `Total: ¥${details.total}`,
            ].join("\n");
            break;

        case "unhandled_message":
            message = [
                `⚠️ UNHANDLED MESSAGE`,
                `From: ${details.from}`,
                `Message: ${details.message}`,
                `Please respond manually.`,
            ].join("\n");
            break;

        case "payment_failed":
            message = [
                `❌ PAYMENT FAILED`,
                `Booking ID: ${details.bookingId}`,
                `Customer: ${details.customerName}`,
                `Amount: ¥${details.amount}`,
                `Error: ${details.error}`,
            ].join("\n");
            break;

        case "cancellation":
            message = [
                `🚫 CANCELLATION`,
                `Booking ID: ${details.bookingId}`,
                `Customer: ${details.customerName}`,
                `Reason: ${details.reason || "Not provided"}`,
            ].join("\n");
            break;
    }

    await sendWhatsAppMessage(ownerPhone, message);

    // Also log for email notification (implement email service as needed)
    console.log(`[NOTIFY] ${type}:`, details);
}

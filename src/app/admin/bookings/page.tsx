"use client";

import { useState, useEffect } from "react";

interface Booking {
    id: string;
    castId: string;
    castName: string;
    customerName: string;
    date: string;
    startTime: string;
    duration: number;
    course: string;
    area: string;
    status: "pending" | "confirmed" | "completed" | "cancelled";
    note?: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "未処理", color: "bg-yellow-500/20 text-yellow-400" },
    confirmed: { label: "確定", color: "bg-green-500/20 text-green-400" },
    completed: { label: "完了", color: "bg-blue-500/20 text-blue-400" },
    cancelled: { label: "キャンセル", color: "bg-red-500/20 text-red-400" },
};

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [message, setMessage] = useState("");
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        fetch("/api/admin/data")
            .then((r) => r.json())
            .then((d) => setBookings(d.bookings || []))
            .catch(() => setMessage("データの読み込みに失敗しました"));
    }, []);

    async function updateStatus(id: string, status: Booking["status"]) {
        const updated = bookings.map((b) => (b.id === id ? { ...b, status } : b));
        try {
            const res = await fetch("/api/admin/data", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookings: updated }),
            });
            if (res.ok) {
                setBookings(updated);
                setMessage("ステータスを更新しました");
            } else {
                setMessage("更新に失敗しました");
            }
        } catch {
            setMessage("更新に失敗しました");
        }
    }

    const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">予約管理</h1>
                    <p className="text-dark-400 text-sm mt-1">{bookings.length}件の予約</p>
                </div>
            </div>

            {message && (
                <div className={`mb-6 p-3 rounded-lg text-sm ${message.includes("失敗") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {message}
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                {[
                    { key: "all", label: "すべて" },
                    { key: "pending", label: "未処理" },
                    { key: "confirmed", label: "確定" },
                    { key: "completed", label: "完了" },
                    { key: "cancelled", label: "キャンセル" },
                ].map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-4 py-1.5 rounded-full text-sm ${filter === f.key ? "bg-primary-600 text-white" : "bg-dark-800 text-dark-300 hover:text-white"}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Booking list */}
            {filtered.length === 0 ? (
                <div className="card p-12 text-center text-dark-400">予約はまだありません</div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((booking) => (
                        <div key={booking.id} className="card p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[booking.status]?.color || ""}`}>
                                        {statusLabels[booking.status]?.label || booking.status}
                                    </span>
                                    <span className="text-white font-semibold">{booking.castName}</span>
                                    <span className="text-dark-400 text-sm">← {booking.customerName}</span>
                                </div>
                                <span className="text-dark-400 text-sm">{booking.date} {booking.startTime}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-dark-400 text-sm">
                                    {booking.course} / {booking.duration}分 / {booking.area}
                                    {booking.note && <span className="ml-2 text-dark-500">— {booking.note}</span>}
                                </p>
                                <div className="flex gap-2">
                                    {booking.status === "pending" && (
                                        <>
                                            <button onClick={() => updateStatus(booking.id, "confirmed")} className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30">確定</button>
                                            <button onClick={() => updateStatus(booking.id, "cancelled")} className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">キャンセル</button>
                                        </>
                                    )}
                                    {booking.status === "confirmed" && (
                                        <button onClick={() => updateStatus(booking.id, "completed")} className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30">完了</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

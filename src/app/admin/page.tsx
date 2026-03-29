"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DashboardStats {
    castCount: number;
    activeCastCount: number;
    bookingCount: number;
    pendingBookingCount: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({ castCount: 0, activeCastCount: 0, bookingCount: 0, pendingBookingCount: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/data")
            .then((r) => r.json())
            .then((d) => {
                const casts = d.casts || [];
                const bookings = d.bookings || [];
                setStats({
                    castCount: casts.length,
                    activeCastCount: casts.filter((c: { available: boolean }) => c.available).length,
                    bookingCount: bookings.length,
                    pendingBookingCount: bookings.filter((b: { status: string }) => b.status === "pending").length,
                });
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const cards = [
        { label: "総キャスト数", value: stats.castCount, href: "/admin/cast", color: "text-primary-400" },
        { label: "出勤中", value: stats.activeCastCount, href: "/admin/cast", color: "text-green-400" },
        { label: "総予約数", value: stats.bookingCount, href: "/admin/bookings", color: "text-blue-400" },
        { label: "未処理予約", value: stats.pendingBookingCount, href: "/admin/bookings", color: "text-yellow-400" },
    ];

    const quickActions = [
        { label: "キャスト管理", href: "/admin/cast", icon: "👤" },
        { label: "予約管理", href: "/admin/bookings", icon: "📋" },
        { label: "SNS連携", href: "/admin/sns", icon: "💬" },
        { label: "カレンダー連携", href: "/admin/calendar", icon: "📅" },
        { label: "設定", href: "/admin/settings", icon: "⚙️" },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-8">ダッシュボード</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {cards.map((card) => (
                    <Link key={card.label} href={card.href} className="card p-5 hover:border-dark-600 transition-colors">
                        <p className="text-dark-400 text-sm mb-1">{card.label}</p>
                        <p className={`text-3xl font-bold ${card.color}`}>
                            {loading ? "..." : card.value}
                        </p>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <h2 className="text-lg font-semibold text-white mb-4">クイックアクション</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {quickActions.map((action) => (
                    <Link key={action.label} href={action.href} className="card p-4 text-center hover:border-dark-600 transition-colors">
                        <span className="text-2xl mb-2 block">{action.icon}</span>
                        <span className="text-sm text-dark-300">{action.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

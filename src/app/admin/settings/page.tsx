"use client";

import { useState, useEffect } from "react";

interface Settings {
    storeName: string;
    storeSubtitle: string;
    openTime: string;
    closeTime: string;
    phone: string;
    email: string;
    address: string;
    siteUrl: string;
    metaTitle: string;
    metaDescription: string;
    nominationFee: number;
    extensionRate30min: number;
    cancelFee: number;
    transportFeeDefault: number;
    hotelDiscountNote: string;
    paymentMethods: string[];
    freeBackRate: number;
    nominationBackRate: number;
    paymentTiming: string;
    ownerPhone: string;
    notificationEmail: string;
    minAge: number;
    reservationNote: string;
    cancellationPolicy: string;
}

const allPaymentMethods = [
    { key: "cash", label: "現金" },
    { key: "credit", label: "クレジットカード" },
    { key: "paypay", label: "PayPay" },
    { key: "linepay", label: "LINE Pay" },
    { key: "bankTransfer", label: "銀行振込" },
];

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/admin/data")
            .then((r) => r.json())
            .then((d) => setSettings(d.settings))
            .catch(() => setMessage("データの読み込みに失敗しました"));
    }, []);

    function update<K extends keyof Settings>(key: K, value: Settings[K]) {
        if (!settings) return;
        setSettings({ ...settings, [key]: value });
    }

    function togglePayment(method: string) {
        if (!settings) return;
        const methods = settings.paymentMethods || [];
        if (methods.includes(method)) {
            update("paymentMethods", methods.filter((m) => m !== method));
        } else {
            update("paymentMethods", [...methods, method]);
        }
    }

    async function handleSave() {
        if (!settings) return;
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/admin/data", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings }),
            });
            if (res.ok) setMessage("設定を保存しました");
            else setMessage("保存に失敗しました");
        } catch {
            setMessage("保存に失敗しました");
        } finally {
            setSaving(false);
        }
    }

    if (!settings) return <div className="text-dark-400">読み込み中...</div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">設定</h1>
                    <p className="text-dark-400 text-sm mt-1">店舗情報・料金・ポリシーなどすべての設定</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-6 py-2">
                    {saving ? "保存中..." : "設定を保存"}
                </button>
            </div>

            {message && (
                <div className={`mb-6 p-3 rounded-lg text-sm ${message.includes("失敗") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {message}
                </div>
            )}

            {/* 店舗基本情報 */}
            <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">🏢 店舗基本情報</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">店舗名</label>
                        <input type="text" value={settings.storeName} onChange={(e) => update("storeName", e.target.value)} className="input-field w-full" />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">サブタイトル</label>
                        <input type="text" value={settings.storeSubtitle} onChange={(e) => update("storeSubtitle", e.target.value)} className="input-field w-full" />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">電話番号</label>
                        <input type="text" value={settings.phone} onChange={(e) => update("phone", e.target.value)} className="input-field w-full" />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">メールアドレス</label>
                        <input type="email" value={settings.email} onChange={(e) => update("email", e.target.value)} className="input-field w-full" placeholder="info@example.com" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm text-dark-300 mb-1">住所</label>
                        <input type="text" value={settings.address} onChange={(e) => update("address", e.target.value)} className="input-field w-full" />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">営業開始</label>
                        <input type="time" value={settings.openTime} onChange={(e) => update("openTime", e.target.value)} className="input-field w-full" />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">営業終了</label>
                        <input type="time" value={settings.closeTime} onChange={(e) => update("closeTime", e.target.value)} className="input-field w-full" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm text-dark-300 mb-1">サイトURL</label>
                        <input type="url" value={settings.siteUrl} onChange={(e) => update("siteUrl", e.target.value)} className="input-field w-full" placeholder="https://..." />
                    </div>
                </div>
            </div>

            {/* SEO設定 */}
            <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">🔍 SEO設定</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">メタタイトル</label>
                        <input type="text" value={settings.metaTitle} onChange={(e) => update("metaTitle", e.target.value)} className="input-field w-full" />
                        <p className="text-dark-500 text-xs mt-1">検索結果に表示されるタイトル</p>
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">メタディスクリプション</label>
                        <textarea value={settings.metaDescription} onChange={(e) => update("metaDescription", e.target.value)} className="input-field w-full" rows={3} />
                        <p className="text-dark-500 text-xs mt-1">検索結果に表示される説明文</p>
                    </div>
                </div>
            </div>

            {/* 料金設定 */}
            <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">💰 料金設定</h2>
                <p className="text-dark-500 text-xs mb-4">コース料金は「コース・エリア管理」で設定できます</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">指名料 (¥)</label>
                        <input type="number" value={settings.nominationFee} onChange={(e) => update("nominationFee", Number(e.target.value))} className="input-field w-full" min={0} />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">延長料金 30分 (¥)</label>
                        <input type="number" value={settings.extensionRate30min} onChange={(e) => update("extensionRate30min", Number(e.target.value))} className="input-field w-full" min={0} />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">キャンセル料 (¥)</label>
                        <input type="number" value={settings.cancelFee} onChange={(e) => update("cancelFee", Number(e.target.value))} className="input-field w-full" min={0} />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">デフォルト交通費 (¥)</label>
                        <input type="number" value={settings.transportFeeDefault} onChange={(e) => update("transportFeeDefault", Number(e.target.value))} className="input-field w-full" min={0} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm text-dark-300 mb-1">ホテル割引メモ</label>
                        <input type="text" value={settings.hotelDiscountNote} onChange={(e) => update("hotelDiscountNote", e.target.value)} className="input-field w-full" placeholder="六本木・赤坂エリアは交通費無料" />
                    </div>
                </div>
            </div>

            {/* 支払い方法 */}
            <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">💳 受付支払い方法</h2>
                <div className="flex flex-wrap gap-3">
                    {allPaymentMethods.map((pm) => (
                        <label key={pm.key} className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 transition-colors">
                            <input
                                type="checkbox"
                                checked={(settings.paymentMethods || []).includes(pm.key)}
                                onChange={() => togglePayment(pm.key)}
                                className="accent-primary-500"
                            />
                            <span className="text-sm text-dark-300">{pm.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* 報酬設定 */}
            <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">📊 報酬設定（キャスト向け）</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">フリーバック率 (%)</label>
                        <input type="number" value={settings.freeBackRate} onChange={(e) => update("freeBackRate", Number(e.target.value))} className="input-field w-full" min={0} max={100} />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">本指名バック率 (%)</label>
                        <input type="number" value={settings.nominationBackRate} onChange={(e) => update("nominationBackRate", Number(e.target.value))} className="input-field w-full" min={0} max={100} />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">支払いタイミング</label>
                        <select value={settings.paymentTiming} onChange={(e) => update("paymentTiming", e.target.value)} className="input-field w-full">
                            <option value="翌日払い">翌日払い</option>
                            <option value="即日払い">即日払い</option>
                            <option value="週払い">週払い</option>
                            <option value="月払い">月払い</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 通知設定 */}
            <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">🔔 通知設定</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">オーナー電話番号</label>
                        <input type="text" value={settings.ownerPhone} onChange={(e) => update("ownerPhone", e.target.value)} className="input-field w-full" placeholder="+81..." />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">通知メールアドレス</label>
                        <input type="email" value={settings.notificationEmail} onChange={(e) => update("notificationEmail", e.target.value)} className="input-field w-full" placeholder="admin@example.com" />
                    </div>
                </div>
            </div>

            {/* 営業ポリシー */}
            <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">📋 営業ポリシー</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">最低年齢制限</label>
                        <input type="number" value={settings.minAge} onChange={(e) => update("minAge", Number(e.target.value))} className="input-field w-32" min={18} />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">予約に関する注意事項</label>
                        <textarea value={settings.reservationNote} onChange={(e) => update("reservationNote", e.target.value)} className="input-field w-full" rows={2} />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">キャンセルポリシー</label>
                        <textarea value={settings.cancellationPolicy} onChange={(e) => update("cancellationPolicy", e.target.value)} className="input-field w-full" rows={2} />
                    </div>
                </div>
            </div>

            {/* フッター保存ボタン */}
            <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-8 py-2.5">
                    {saving ? "保存中..." : "すべての設定を保存"}
                </button>
            </div>
        </div>
    );
} 
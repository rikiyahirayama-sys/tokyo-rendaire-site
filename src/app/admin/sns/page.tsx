"use client";

import { useState, useEffect } from "react";

interface SNSPlatform {
    enabled: boolean;
    accountId: string;
    webhookUrl?: string;
}

interface SNSConfig {
    whatsapp: SNSPlatform;
    wechat: SNSPlatform;
    line: SNSPlatform;
    telegram: SNSPlatform;
}

const defaultSNS: SNSConfig = {
    whatsapp: { enabled: false, accountId: "" },
    wechat: { enabled: false, accountId: "" },
    line: { enabled: false, accountId: "" },
    telegram: { enabled: false, accountId: "" },
};

const platformInfo = [
    { key: "whatsapp" as const, name: "WhatsApp", color: "bg-green-500", icon: "📱" },
    { key: "wechat" as const, name: "WeChat", color: "bg-emerald-500", icon: "💬" },
    { key: "line" as const, name: "LINE", color: "bg-lime-500", icon: "🟢" },
    { key: "telegram" as const, name: "Telegram", color: "bg-blue-500", icon: "✈️" },
];

export default function SNSPage() {
    const [sns, setSNS] = useState<SNSConfig>(defaultSNS);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/admin/data")
            .then((r) => r.json())
            .then((d) => d.sns && setSNS(d.sns))
            .catch(() => setMessage("データの読み込みに失敗しました"));
    }, []);

    async function handleSave() {
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/admin/data", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sns }),
            });
            if (res.ok) {
                setMessage("保存しました");
            } else {
                setMessage("保存に失敗しました");
            }
        } catch {
            setMessage("保存に失敗しました");
        } finally {
            setSaving(false);
        }
    }

    function updatePlatform(key: keyof SNSConfig, field: string, value: string | boolean) {
        setSNS((prev) => ({
            ...prev,
            [key]: { ...prev[key], [field]: value },
        }));
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">SNS連携設定</h1>
                    <p className="text-dark-400 text-sm mt-1">メッセージプラットフォームの設定</p>
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

            <div className="space-y-4">
                {platformInfo.map((p) => (
                    <div key={p.key} className="card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{p.icon}</span>
                                <span className="text-white font-semibold text-lg">{p.name}</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sns[p.key].enabled}
                                    onChange={(e) => updatePlatform(p.key, "enabled", e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dark-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-checked:after:bg-white"></div>
                            </label>
                        </div>
                        {sns[p.key].enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-dark-300 mb-1">アカウントID</label>
                                    <input
                                        type="text"
                                        value={sns[p.key].accountId}
                                        onChange={(e) => updatePlatform(p.key, "accountId", e.target.value)}
                                        className="input-field w-full"
                                        placeholder={`${p.name}のアカウントID`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-dark-300 mb-1">Webhook URL</label>
                                    <input
                                        type="text"
                                        value={sns[p.key].webhookUrl || ""}
                                        onChange={(e) => updatePlatform(p.key, "webhookUrl", e.target.value)}
                                        className="input-field w-full"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

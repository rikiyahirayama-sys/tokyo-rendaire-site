"use client";

import { useState, useEffect, useCallback } from "react";

interface EnvEntry {
    key: string;
    value: string;
    masked: string;
}

interface TestResult {
    service: string;
    success: boolean;
    message?: string;
    error?: string;
}

export default function APISettingsPage() {
    const [envVars, setEnvVars] = useState<EnvEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [testing, setTesting] = useState(false);

    // New key/value
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");

    // Password change
    const [newPassword, setNewPassword] = useState("");

    function toast(msg: string) {
        setMessage(msg);
        setTimeout(() => setMessage(""), 4000);
    }

    const loadSettings = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/settings");
            const data = await res.json();
            if (data.success) setEnvVars(data.env || []);
            else toast("設定の読み込みに失敗");
        } catch { toast("通信エラー"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    async function handleSave() {
        if (Object.keys(editValues).length === 0 && !newKey && !newPassword) return;
        setSaving(true);
        try {
            const updates: Record<string, string> = { ...editValues };
            if (newKey.trim() && newValue.trim()) {
                updates[newKey.trim()] = newValue.trim();
            }
            if (newPassword.trim()) {
                updates["ADMIN_PASSWORD"] = newPassword.trim();
            }
            const res = await fetch("/api/auth/settings", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
            });
            const data = await res.json();
            if (data.success) {
                toast("設定を保存しました（再起動が必要な場合があります）");
                setEditingKey(null); setEditValues({}); setNewKey(""); setNewValue(""); setNewPassword("");
                loadSettings();
            } else toast("保存失敗: " + (data.error || ""));
        } catch { toast("通信エラー"); }
        finally { setSaving(false); }
    }

    async function handleTest(service: string) {
        setTesting(true);
        try {
            const res = await fetch("/api/auth/settings/test", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ service }),
            });
            const data = await res.json();
            setTestResults(prev => {
                const filtered = prev.filter(r => r.service !== service);
                return [...filtered, { service, success: data.success, message: data.message, error: data.error }];
            });
        } catch {
            setTestResults(prev => [...prev.filter(r => r.service !== service), { service, success: false, error: "通信エラー" }]);
        }
        finally { setTesting(false); }
    }

    async function handleTestAll() {
        setTesting(true);
        setTestResults([]);
        const services = ["twitter_en", "twitter_ja", "telegram", "claude", "github"];
        for (const svc of services) {
            try {
                const res = await fetch("/api/auth/settings/test", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ service: svc }),
                });
                const data = await res.json();
                setTestResults(prev => [...prev, { service: svc, success: data.success, message: data.message, error: data.error }]);
            } catch {
                setTestResults(prev => [...prev, { service: svc, success: false, error: "通信エラー" }]);
            }
        }
        setTesting(false);
    }

    const serviceGroups = [
        {
            label: "🐦 Twitter (EN)", prefix: "TWITTER_",
            testKey: "twitter_en",
            keys: ["TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN_SECRET"],
        },
        {
            label: "🐦 Twitter (JA)", prefix: "TWITTER_JA_",
            testKey: "twitter_ja",
            keys: ["TWITTER_JA_API_KEY", "TWITTER_JA_API_SECRET", "TWITTER_JA_ACCESS_TOKEN", "TWITTER_JA_ACCESS_TOKEN_SECRET"],
        },
        {
            label: "✈️ Telegram", prefix: "TELEGRAM_",
            testKey: "telegram",
            keys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL_ID"],
        },
        {
            label: "🤖 Claude AI", prefix: "ANTHROPIC_",
            testKey: "claude",
            keys: ["ANTHROPIC_API_KEY"],
        },
        {
            label: "🐙 GitHub", prefix: "GITHUB_",
            testKey: "github",
            keys: ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"],
        },
        {
            label: "💳 Stripe", prefix: "STRIPE_",
            testKey: "",
            keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
        },
    ];

    if (loading) return <div className="text-dark-400">読み込み中...</div>;

    function getEnvValue(key: string): string {
        return envVars.find(e => e.key === key)?.masked || "";
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">API設定</h1>
                    <p className="text-dark-400 text-sm mt-1">.env環境変数・外部サービスの接続設定</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleTestAll} disabled={testing}
                        className="text-sm px-4 py-2 text-dark-300 hover:text-white border border-dark-700 rounded-lg">
                        {testing ? "テスト中..." : "全サービステスト"}
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-6 py-2">
                        {saving ? "保存中..." : "変更を保存"}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes("失敗") || message.includes("エラー") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {message}
                </div>
            )}

            {/* Test Results */}
            {testResults.length > 0 && (
                <div className="card p-4 mb-6">
                    <h3 className="text-white font-medium text-sm mb-3">接続テスト結果</h3>
                    <div className="space-y-2">
                        {testResults.map(r => (
                            <div key={r.service} className="flex items-center gap-3 text-sm">
                                <span className={`w-2 h-2 rounded-full ${r.success ? "bg-green-500" : "bg-red-500"}`} />
                                <span className="text-dark-300 w-24">{r.service}</span>
                                <span className={r.success ? "text-green-400" : "text-red-400"}>
                                    {r.success ? (r.message || "OK") : (r.error || "失敗")}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Service groups */}
            {serviceGroups.map(group => (
                <div key={group.label} className="card p-5 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-white font-semibold text-sm">{group.label}</h2>
                        {group.testKey && (
                            <button onClick={() => handleTest(group.testKey)} disabled={testing}
                                className="text-xs px-3 py-1 text-primary-400 hover:text-primary-300 border border-dark-700 rounded">
                                テスト
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {group.keys.map(key => {
                            const isEditing = editingKey === key;
                            const currentMasked = getEnvValue(key);
                            return (
                                <div key={key} className="flex items-center gap-3">
                                    <span className="text-xs text-dark-500 w-56 font-mono truncate">{key}</span>
                                    {isEditing ? (
                                        <>
                                            <input type="text" value={editValues[key] || ""}
                                                onChange={e => setEditValues({ ...editValues, [key]: e.target.value })}
                                                className="input-field flex-1 text-sm" placeholder="新しい値を入力" />
                                            <button onClick={() => { setEditingKey(null); const v = { ...editValues }; delete v[key]; setEditValues(v); }}
                                                className="text-xs text-dark-500 hover:text-white">キャンセル</button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-sm text-dark-400 flex-1 font-mono">
                                                {editValues[key] ? <span className="text-yellow-400">(変更あり)</span> : (currentMasked || <span className="text-dark-600">未設定</span>)}
                                            </span>
                                            <button onClick={() => setEditingKey(key)}
                                                className="text-xs text-primary-400 hover:text-primary-300">編集</button>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Other env vars */}
            <div className="card p-5 mb-4">
                <h2 className="text-white font-semibold text-sm mb-3">⚙️ その他の環境変数</h2>
                <div className="space-y-2">
                    {envVars.filter(e => !serviceGroups.some(g => g.keys.includes(e.key))).map(e => (
                        <div key={e.key} className="flex items-center gap-3">
                            <span className="text-xs text-dark-500 w-56 font-mono truncate">{e.key}</span>
                            {editingKey === e.key ? (
                                <>
                                    <input type="text" value={editValues[e.key] || ""}
                                        onChange={ev => setEditValues({ ...editValues, [e.key]: ev.target.value })}
                                        className="input-field flex-1 text-sm" />
                                    <button onClick={() => setEditingKey(null)} className="text-xs text-dark-500 hover:text-white">キャンセル</button>
                                </>
                            ) : (
                                <>
                                    <span className="text-sm text-dark-400 flex-1 font-mono">
                                        {editValues[e.key] ? <span className="text-yellow-400">(変更あり)</span> : e.masked}
                                    </span>
                                    <button onClick={() => setEditingKey(e.key)} className="text-xs text-primary-400 hover:text-primary-300">編集</button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Add new env var */}
            <div className="card p-5 mb-4">
                <h2 className="text-white font-semibold text-sm mb-3">➕ 新しい環境変数を追加</h2>
                <div className="flex gap-3">
                    <input type="text" value={newKey} onChange={e => setNewKey(e.target.value)}
                        className="input-field w-48 text-sm font-mono" placeholder="KEY_NAME" />
                    <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)}
                        className="input-field flex-1 text-sm" placeholder="値" />
                </div>
            </div>

            {/* Password change */}
            <div className="card p-5 mb-6">
                <h2 className="text-white font-semibold text-sm mb-3">🔐 パスワード変更</h2>
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="block text-xs text-dark-500 mb-1">新しいパスワード</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            className="input-field w-full text-sm" placeholder="新しいパスワードを入力" />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-8 py-2.5">
                    {saving ? "保存中..." : "変更を保存"}
                </button>
            </div>
        </div>
    );
}

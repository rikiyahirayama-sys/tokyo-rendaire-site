"use client";

import { useState, useEffect } from "react";

interface HistoryEntry {
    id: number;
    type: string;
    text?: string;
    results?: { platform: string; success?: boolean; text?: string; error?: string }[];
    platforms?: string[];
    createdAt: string;
}

type TabName = "generate" | "manual" | "template" | "history";

export default function SNSPostPage() {
    const [tab, setTab] = useState<TabName>("generate");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    // Generate tab
    const [topics, setTopics] = useState("");
    const [generatedPosts, setGeneratedPosts] = useState<Record<string, string[]> | null>(null);

    // Manual tab
    const [manualText, setManualText] = useState("");
    const [manualPlatforms, setManualPlatforms] = useState<string[]>([]);

    // Template tab
    const [templateType, setTemplateType] = useState("");
    const [templateData, setTemplateData] = useState<Record<string, string>>({});
    const [templatePosts, setTemplatePosts] = useState<Record<string, string[]> | null>(null);

    // History tab
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [historyFilter, setHistoryFilter] = useState("");

    // Casts for templates
    const [casts, setCasts] = useState<{ id: number; name: string; status: string }[]>([]);

    useEffect(() => {
        fetch("/api/cast").then(r => r.json()).then(d => d.casts && setCasts(d.casts)).catch(() => { });
    }, []);

    function toast(msg: string) {
        setMessage(msg);
        setTimeout(() => setMessage(""), 4000);
    }

    // ===== 自動生成 =====
    async function handleGenerate() {
        if (!topics.trim()) return;
        setLoading(true);
        try {
            const res = await fetch("/api/sns/generate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topics }),
            });
            const data = await res.json();
            if (data.success) { setGeneratedPosts(data.posts); toast("投稿を生成しました"); }
            else toast("生成失敗: " + (data.error || ""));
        } catch { toast("通信エラー"); }
        finally { setLoading(false); }
    }

    async function handlePostAll() {
        if (!generatedPosts) return;
        setLoading(true);
        try {
            const res = await fetch("/api/sns/post", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ posts: generatedPosts }),
            });
            const data = await res.json();
            if (data.success) { toast("投稿完了！"); setGeneratedPosts(null); }
            else toast("投稿失敗: " + (data.error || ""));
        } catch { toast("通信エラー"); }
        finally { setLoading(false); }
    }

    // ===== 手動投稿 =====
    async function handleManualPost() {
        if (!manualText.trim() || manualPlatforms.length === 0) return;
        setLoading(true);
        const form = new FormData();
        form.append("text", manualText);
        form.append("platforms", JSON.stringify(manualPlatforms));
        try {
            const res = await fetch("/api/sns/manual", { method: "POST", body: form });
            const data = await res.json();
            if (data.success) { toast("投稿しました！"); setManualText(""); }
            else toast("投稿失敗: " + (data.error || ""));
        } catch { toast("通信エラー"); }
        finally { setLoading(false); }
    }

    async function handleSaveDraft() {
        if (!manualText.trim()) return;
        try {
            const res = await fetch("/api/sns/draft", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: manualText }),
            });
            const data = await res.json();
            if (data.success) toast("下書き保存しました");
            else toast("保存失敗");
        } catch { toast("通信エラー"); }
    }

    // ===== テンプレート =====
    const templates = [
        { type: "daily_schedule", label: "📋 本日の出勤", fields: [] },
        { type: "new_cast", label: "🌸 新人入店", fields: ["castId"] },
        { type: "campaign", label: "🎉 キャンペーン", fields: ["name", "discount", "period", "description"] },
        { type: "review", label: "⭐ 口コミ紹介", fields: ["text", "castName", "rating"] },
        { type: "weekend", label: "📅 週末の空き", fields: ["castIds", "notes"] },
        { type: "cast_return", label: "🔄 キャスト復帰", fields: ["castId", "message"] },
        { type: "ranking", label: "👑 月間ランキング", fields: [] },
        { type: "announcement", label: "⚠️ お知らせ", fields: ["title", "content", "period"] },
    ];

    async function handleTemplate() {
        if (!templateType) return;
        setLoading(true);
        try {
            const res = await fetch("/api/sns/template", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: templateType, data: templateData }),
            });
            const data = await res.json();
            if (data.success) { setTemplatePosts(data.posts); toast("テンプレート生成完了"); }
            else toast("生成失敗: " + (data.error || ""));
        } catch { toast("通信エラー"); }
        finally { setLoading(false); }
    }

    async function handlePostTemplate() {
        if (!templatePosts) return;
        setLoading(true);
        try {
            const res = await fetch("/api/sns/post", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ posts: templatePosts }),
            });
            const data = await res.json();
            if (data.success) { toast("投稿完了！"); setTemplatePosts(null); }
            else toast("投稿失敗: " + (data.error || ""));
        } catch { toast("通信エラー"); }
        finally { setLoading(false); }
    }

    // ===== 履歴 =====
    async function loadHistory() {
        try {
            const url = historyFilter ? `/api/sns/history?platform=${historyFilter}` : "/api/sns/history";
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) setHistory(data.history || []);
        } catch { toast("履歴の読み込みに失敗"); }
    }

    useEffect(() => { if (tab === "history") loadHistory(); }, [tab, historyFilter]);

    function togglePlatform(p: string) {
        setManualPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    }

    const tabItems: { key: TabName; label: string }[] = [
        { key: "generate", label: "🤖 自動生成" },
        { key: "manual", label: "✏️ 手動投稿" },
        { key: "template", label: "📋 テンプレート" },
        { key: "history", label: "📜 投稿履歴" },
    ];

    const selectedTemplate = templates.find(t => t.type === templateType);

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-2">SNS投稿</h1>
            <p className="text-dark-400 text-sm mb-6">Twitter / Telegram への投稿管理</p>

            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes("失敗") || message.includes("エラー") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {message}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-dark-800/50 pb-1">
                {tabItems.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === t.key ? "bg-dark-800 text-white" : "text-dark-400 hover:text-white"}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* 自動生成タブ */}
            {tab === "generate" && (
                <div className="space-y-4">
                    <div className="card p-5">
                        <label className="block text-sm text-dark-300 mb-2">トピック / テーマ</label>
                        <textarea value={topics} onChange={e => setTopics(e.target.value)}
                            className="input-field w-full" rows={3} placeholder="例: 週末イベント、新人キャスト紹介、六本木の夜" />
                        <button onClick={handleGenerate} disabled={loading} className="btn-primary text-sm px-6 py-2 mt-3">
                            {loading ? "生成中..." : "投稿を生成"}
                        </button>
                    </div>

                    {generatedPosts && (
                        <div className="space-y-4">
                            {Object.entries(generatedPosts).map(([platform, posts]) => (
                                <div key={platform} className="card p-5">
                                    <h3 className="text-white font-semibold mb-3">
                                        {platform === "twitter_en" ? "🐦 Twitter (EN)" : platform === "twitter_ja" ? "🐦 Twitter (JA)" : "✈️ Telegram"}
                                    </h3>
                                    {Array.isArray(posts) && posts.map((post, i) => (
                                        <div key={i} className="mb-3">
                                            <textarea value={typeof post === "string" ? post : (post as { text?: string }).text || ""}
                                                onChange={e => {
                                                    const updated = { ...generatedPosts };
                                                    updated[platform] = [...posts];
                                                    updated[platform][i] = e.target.value;
                                                    setGeneratedPosts(updated);
                                                }}
                                                className="input-field w-full text-sm" rows={3} />
                                            <p className="text-dark-500 text-xs mt-1">
                                                {(typeof post === "string" ? post : "").length}/280文字
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <button onClick={handlePostAll} disabled={loading} className="btn-primary text-sm px-8 py-3">
                                {loading ? "投稿中..." : "すべて投稿する"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 手動投稿タブ */}
            {tab === "manual" && (
                <div className="card p-5 space-y-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-2">投稿テキスト</label>
                        <textarea value={manualText} onChange={e => setManualText(e.target.value)}
                            className="input-field w-full" rows={4} placeholder="投稿内容を入力..." />
                        <p className="text-dark-500 text-xs mt-1">{manualText.length}/280文字</p>
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-2">投稿先</label>
                        <div className="flex gap-3">
                            {[{ key: "twitter_en", label: "X (EN)" }, { key: "twitter_ja", label: "X (JA)" }, { key: "telegram", label: "Telegram" }].map(p => (
                                <label key={p.key} className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-dark-800 hover:bg-dark-700">
                                    <input type="checkbox" checked={manualPlatforms.includes(p.key)}
                                        onChange={() => togglePlatform(p.key)} className="accent-primary-500" />
                                    <span className="text-sm text-dark-300">{p.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleManualPost} disabled={loading} className="btn-primary text-sm px-6 py-2">
                            {loading ? "投稿中..." : "投稿する"}
                        </button>
                        <button onClick={handleSaveDraft} className="text-sm px-4 py-2 text-dark-400 hover:text-white border border-dark-700 rounded-lg">
                            下書き保存
                        </button>
                    </div>
                </div>
            )}

            {/* テンプレートタブ */}
            {tab === "template" && (
                <div className="space-y-4">
                    <div className="card p-5">
                        <label className="block text-sm text-dark-300 mb-3">テンプレート種類</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                            {templates.map(t => (
                                <button key={t.type} onClick={() => { setTemplateType(t.type); setTemplateData({}); setTemplatePosts(null); }}
                                    className={`p-3 rounded-lg text-sm text-left transition-colors ${templateType === t.type ? "bg-primary-600/20 border border-primary-500 text-white" : "bg-dark-800 text-dark-400 hover:text-white"}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {selectedTemplate && selectedTemplate.fields.length > 0 && (
                            <div className="space-y-3 mb-4">
                                {selectedTemplate.fields.map(field => (
                                    <div key={field}>
                                        {field === "castId" ? (
                                            <div>
                                                <label className="block text-sm text-dark-300 mb-1">キャスト選択</label>
                                                <select value={templateData.castId || ""} onChange={e => setTemplateData({ ...templateData, castId: e.target.value })}
                                                    className="input-field w-full">
                                                    <option value="">選択してください</option>
                                                    {casts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-sm text-dark-300 mb-1">{field}</label>
                                                <input type="text" value={templateData[field] || ""}
                                                    onChange={e => setTemplateData({ ...templateData, [field]: e.target.value })}
                                                    className="input-field w-full" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {templateType && (
                            <button onClick={handleTemplate} disabled={loading} className="btn-primary text-sm px-6 py-2">
                                {loading ? "生成中..." : "テンプレートで生成"}
                            </button>
                        )}
                    </div>

                    {templatePosts && (
                        <div className="space-y-4">
                            {Object.entries(templatePosts).map(([platform, posts]) => (
                                <div key={platform} className="card p-5">
                                    <h3 className="text-white font-semibold mb-2">
                                        {platform === "twitter_en" ? "🐦 Twitter (EN)" : platform === "twitter_ja" ? "🐦 Twitter (JA)" : "✈️ Telegram"}
                                    </h3>
                                    {Array.isArray(posts) && posts.map((post, i) => (
                                        <div key={i} className="bg-dark-800 rounded p-3 mb-2 text-sm text-dark-200 whitespace-pre-wrap">
                                            {typeof post === "string" ? post : JSON.stringify(post)}
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <button onClick={handlePostTemplate} disabled={loading} className="btn-primary text-sm px-8 py-3">
                                {loading ? "投稿中..." : "すべて投稿する"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 投稿履歴タブ */}
            {tab === "history" && (
                <div>
                    <div className="flex gap-2 mb-4">
                        {[{ key: "", label: "全部" }, { key: "twitter_en", label: "X (EN)" }, { key: "twitter_ja", label: "X (JA)" }, { key: "telegram", label: "Telegram" }].map(f => (
                            <button key={f.key} onClick={() => setHistoryFilter(f.key)}
                                className={`px-3 py-1 text-sm rounded-lg ${historyFilter === f.key ? "bg-primary-600 text-white" : "bg-dark-800 text-dark-400 hover:text-white"}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-3">
                        {history.length === 0 && <p className="text-dark-500 text-sm">投稿履歴はありません</p>}
                        {history.map(h => (
                            <div key={h.id} className="card p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-dark-500">{new Date(h.createdAt).toLocaleString("ja-JP")}</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-dark-800 text-dark-400">{h.type}</span>
                                </div>
                                {h.results && h.results.map((r, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm mb-1">
                                        <span className={`w-2 h-2 rounded-full ${r.success !== false ? "bg-green-500" : "bg-red-500"}`} />
                                        <span className="text-dark-400">{r.platform}</span>
                                        {r.text && <span className="text-dark-300 truncate max-w-md">{r.text.slice(0, 60)}...</span>}
                                        {r.error && <span className="text-red-400 text-xs">{r.error}</span>}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

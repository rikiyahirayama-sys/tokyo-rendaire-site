"use client";

import { useState, useEffect, useCallback } from "react";

interface Article {
    slug: string;
    title: string;
    date: string;
    url?: string;
}

export default function BlogManagementPage() {
    const [tab, setTab] = useState<"generate" | "manual" | "list">("generate");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    // Generate
    const [genTopic, setGenTopic] = useState("");
    const [genKeywords, setGenKeywords] = useState("");
    const [generatedArticle, setGeneratedArticle] = useState<{ title: string; content: string; slug: string } | null>(null);

    // Manual
    const [manualTitle, setManualTitle] = useState("");
    const [manualSlug, setManualSlug] = useState("");
    const [manualContent, setManualContent] = useState("");

    // List
    const [articles, setArticles] = useState<Article[]>([]);

    function toast(msg: string) {
        setMessage(msg);
        setTimeout(() => setMessage(""), 4000);
    }

    const loadArticles = useCallback(async () => {
        try {
            const res = await fetch("/api/blog/list");
            const data = await res.json();
            if (data.success) setArticles(data.articles || []);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { if (tab === "list") loadArticles(); }, [tab, loadArticles]);

    async function handleGenerate() {
        if (!genTopic.trim()) return;
        setLoading(true);
        try {
            const res = await fetch("/api/blog/generate", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: genTopic, keywords: genKeywords }),
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedArticle(data.article);
                toast("記事を生成しました");
            } else toast("生成失敗: " + (data.error || ""));
        } catch { toast("通信エラー"); }
        finally { setLoading(false); }
    }

    async function handlePublish(title: string, content: string, slug: string) {
        setLoading(true);
        try {
            const res = await fetch("/api/blog/publish", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, slug }),
            });
            const data = await res.json();
            if (data.success) {
                toast("記事を公開しました！");
                setGeneratedArticle(null);
                setManualTitle(""); setManualSlug(""); setManualContent("");
            } else toast("公開失敗: " + (data.error || ""));
        } catch { toast("通信エラー"); }
        finally { setLoading(false); }
    }

    async function handleDelete(slug: string) {
        if (!confirm(`「${slug}」を削除しますか？`)) return;
        try {
            const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) { toast("削除しました"); loadArticles(); }
            else toast("削除失敗: " + (data.error || ""));
        } catch { toast("通信エラー"); }
    }

    async function handleManualPublish() {
        if (!manualTitle.trim() || !manualContent.trim()) return;
        const slug = manualSlug.trim() || manualTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        await handlePublish(manualTitle, manualContent, slug);
    }

    const tabItems = [
        { key: "generate" as const, label: "🤖 AI生成" },
        { key: "manual" as const, label: "✏️ 手動作成" },
        { key: "list" as const, label: "📚 記事一覧" },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-2">ブログ管理</h1>
            <p className="text-dark-400 text-sm mb-6">GitHub Pages への記事管理</p>

            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes("失敗") || message.includes("エラー") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {message}
                </div>
            )}

            <div className="flex gap-1 mb-6 border-b border-dark-800/50 pb-1">
                {tabItems.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${tab === t.key ? "bg-dark-800 text-white" : "text-dark-400 hover:text-white"}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* AI生成タブ */}
            {tab === "generate" && (
                <div className="space-y-4">
                    <div className="card p-5">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">トピック</label>
                                <input type="text" value={genTopic} onChange={e => setGenTopic(e.target.value)}
                                    className="input-field w-full" placeholder="例: 六本木のナイトライフガイド" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">キーワード (カンマ区切り)</label>
                                <input type="text" value={genKeywords} onChange={e => setGenKeywords(e.target.value)}
                                    className="input-field w-full" placeholder="例: 六本木, バー, ラウンジ" />
                            </div>
                            <button onClick={handleGenerate} disabled={loading} className="btn-primary text-sm px-6 py-2">
                                {loading ? "生成中..." : "記事を生成"}
                            </button>
                        </div>
                    </div>

                    {generatedArticle && (
                        <div className="card p-5 space-y-3">
                            <h3 className="text-white font-semibold">生成された記事</h3>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">タイトル</label>
                                <input type="text" value={generatedArticle.title}
                                    onChange={e => setGeneratedArticle({ ...generatedArticle, title: e.target.value })}
                                    className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">スラッグ</label>
                                <input type="text" value={generatedArticle.slug}
                                    onChange={e => setGeneratedArticle({ ...generatedArticle, slug: e.target.value })}
                                    className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">本文 (HTML)</label>
                                <textarea value={generatedArticle.content}
                                    onChange={e => setGeneratedArticle({ ...generatedArticle, content: e.target.value })}
                                    className="input-field w-full text-xs" rows={12} />
                            </div>
                            <button onClick={() => handlePublish(generatedArticle.title, generatedArticle.content, generatedArticle.slug)}
                                disabled={loading} className="btn-primary text-sm px-8 py-3">
                                {loading ? "公開中..." : "GitHub Pagesに公開"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 手動作成タブ */}
            {tab === "manual" && (
                <div className="card p-5 space-y-4">
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">タイトル</label>
                        <input type="text" value={manualTitle} onChange={e => setManualTitle(e.target.value)}
                            className="input-field w-full" placeholder="記事タイトル" />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">スラッグ (空欄で自動生成)</label>
                        <input type="text" value={manualSlug} onChange={e => setManualSlug(e.target.value)}
                            className="input-field w-full" placeholder="my-article-slug" />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-300 mb-1">本文 (HTML)</label>
                        <textarea value={manualContent} onChange={e => setManualContent(e.target.value)}
                            className="input-field w-full" rows={12} placeholder="<h2>見出し</h2><p>本文...</p>" />
                    </div>
                    <button onClick={handleManualPublish} disabled={loading} className="btn-primary text-sm px-8 py-3">
                        {loading ? "公開中..." : "GitHub Pagesに公開"}
                    </button>
                </div>
            )}

            {/* 記事一覧タブ */}
            {tab === "list" && (
                <div>
                    {articles.length === 0 ? (
                        <p className="text-dark-500 text-sm">記事がありません</p>
                    ) : (
                        <div className="space-y-2">
                            {articles.map(a => (
                                <div key={a.slug} className="card p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-white text-sm font-medium">{a.title}</h3>
                                        <div className="flex gap-3 text-xs text-dark-500 mt-1">
                                            <span>{a.date}</span>
                                            <span className="text-dark-600">{a.slug}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {a.url && (
                                            <a href={a.url} target="_blank" rel="noopener noreferrer"
                                                className="text-xs px-3 py-1 text-primary-400 hover:text-primary-300 border border-dark-700 rounded-lg">
                                                表示
                                            </a>
                                        )}
                                        <button onClick={() => handleDelete(a.slug)}
                                            className="text-xs px-3 py-1 text-red-400 hover:text-red-300 border border-dark-700 rounded-lg">
                                            削除
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

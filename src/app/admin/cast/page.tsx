"use client";

import { useState, useEffect } from "react";

interface Cast {
    id: string;
    name: string;
    age: number;
    height: number;
    bust: number;
    cup: string;
    waist: number;
    hip: number;
    images: string[];
    profile: Record<string, string>;
    castComment: Record<string, string>;
    storeComment: Record<string, string>;
    tags: string[];
    nationality: string;
    languages: string[];
    smoking: boolean;
    tattoo: boolean;
    isNew: boolean;
    isRecommended: boolean;
    available: boolean;
    availableFrom?: string;
    availableUntil?: string;
}

const emptyCast: Cast = {
    id: "",
    name: "",
    age: 20,
    height: 160,
    bust: 84,
    cup: "C",
    waist: 57,
    hip: 84,
    images: [""],
    profile: { ja: "", en: "" },
    castComment: { ja: "", en: "" },
    storeComment: { ja: "", en: "" },
    tags: [],
    nationality: "Japanese",
    languages: ["Japanese"],
    smoking: false,
    tattoo: false,
    isNew: false,
    isRecommended: false,
    available: true,
    availableFrom: "18:00",
    availableUntil: "02:00",
};

export default function CastPage() {
    const [casts, setCasts] = useState<Cast[]>([]);
    const [editing, setEditing] = useState<Cast | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/admin/data")
            .then((r) => r.json())
            .then((d) => setCasts(d.casts || []))
            .catch(() => setMessage("データの読み込みに失敗しました"));
    }, []);

    async function saveCasts(updated: Cast[]) {
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/admin/data", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ casts: updated }),
            });
            if (res.ok) {
                setCasts(updated);
                setMessage("保存しました");
                setEditing(null);
                setIsNew(false);
            } else {
                setMessage("保存に失敗しました");
            }
        } catch {
            setMessage("保存に失敗しました");
        } finally {
            setSaving(false);
        }
    }

    function handleAdd() {
        const newCast = {
            ...emptyCast,
            id: `cast-${Date.now()}`,
            profile: { ...emptyCast.profile },
            castComment: { ...emptyCast.castComment },
            storeComment: { ...emptyCast.storeComment },
            tags: [],
            languages: ["Japanese"],
            images: [""],
        };
        setEditing(newCast);
        setIsNew(true);
    }

    function handleEdit(cast: Cast) {
        setEditing({
            ...cast,
            profile: { ...cast.profile },
            castComment: { ...(cast.castComment || { ja: "", en: "" }) },
            storeComment: { ...(cast.storeComment || { ja: "", en: "" }) },
            tags: [...(cast.tags || [])],
            languages: [...(cast.languages || [])],
            images: [...(cast.images || [""])],
        });
        setIsNew(false);
    }

    function handleDelete(id: string) {
        if (!confirm("このキャストを削除しますか？")) return;
        saveCasts(casts.filter((c) => c.id !== id));
    }

    function handleSave() {
        if (!editing) return;
        if (isNew) {
            saveCasts([...casts, editing]);
        } else {
            saveCasts(casts.map((c) => (c.id === editing.id ? editing : c)));
        }
    }

    function toggleAvailable(id: string) {
        const updated = casts.map((c) => (c.id === id ? { ...c, available: !c.available } : c));
        saveCasts(updated);
    }

    function updateEditing<K extends keyof Cast>(key: K, value: Cast[K]) {
        if (!editing) return;
        setEditing({ ...editing, [key]: value });
    }

    function updateProfile(lang: string, value: string) {
        if (!editing) return;
        setEditing({ ...editing, profile: { ...editing.profile, [lang]: value } });
    }

    function updateCastComment(lang: string, value: string) {
        if (!editing) return;
        setEditing({ ...editing, castComment: { ...editing.castComment, [lang]: value } });
    }

    function updateStoreComment(lang: string, value: string) {
        if (!editing) return;
        setEditing({ ...editing, storeComment: { ...editing.storeComment, [lang]: value } });
    }

    function updateImage(index: number, value: string) {
        if (!editing) return;
        const newImages = [...editing.images];
        newImages[index] = value;
        setEditing({ ...editing, images: newImages });
    }

    function addImage() {
        if (!editing || editing.images.length >= 20) return;
        setEditing({ ...editing, images: [...editing.images, ""] });
    }

    function removeImage(index: number) {
        if (!editing || editing.images.length <= 1) return;
        const newImages = editing.images.filter((_, i) => i !== index);
        setEditing({ ...editing, images: newImages });
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">キャスト管理</h1>
                    <p className="text-dark-400 text-sm mt-1">{casts.length}名のキャスト</p>
                </div>
                <button onClick={handleAdd} className="btn-primary text-sm px-6 py-2">+ 新規追加</button>
            </div>

            {message && (
                <div className={`mb-6 p-3 rounded-lg text-sm ${message.includes("失敗") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {message}
                </div>
            )}

            {/* Cast list */}
            <div className="space-y-3">
                {casts.map((cast) => (
                    <div key={cast.id} className="card p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-dark-800 overflow-hidden flex items-center justify-center text-lg font-bold text-primary-400">
                                {cast.images?.[0] && cast.images[0] !== "/images/cast/placeholder.jpg" && cast.images[0] !== "" ? (
                                    <img src={cast.images[0]} alt={cast.name} className="w-full h-full object-cover" />
                                ) : (
                                    cast.name.charAt(0)
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-semibold">{cast.name}</span>
                                    {cast.isNew && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">NEW</span>}
                                    {cast.isRecommended && <span className="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-xs rounded-full">おすすめ</span>}
                                    <span className="text-dark-500 text-xs">写真{(cast.images || []).filter((i: string) => i && i !== "/images/cast/placeholder.jpg").length}枚</span>
                                </div>
                                <p className="text-dark-400 text-sm">{cast.age}歳 / {cast.height}cm / {cast.cup}カップ / B{cast.bust} W{cast.waist} H{cast.hip}</p>
                                {cast.tags && cast.tags.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                        {cast.tags.map((tag: string) => (
                                            <span key={tag} className="px-1.5 py-0.5 bg-primary-500/10 text-primary-400 text-xs rounded">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => toggleAvailable(cast.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium ${cast.available ? "bg-green-500/20 text-green-400" : "bg-dark-700 text-dark-400"}`}
                            >
                                {cast.available ? "出勤中" : "休み"}
                            </button>
                            <button onClick={() => handleEdit(cast)} className="text-dark-400 hover:text-white text-sm">編集</button>
                            <button onClick={() => handleDelete(cast.id)} className="text-dark-400 hover:text-red-400 text-sm">削除</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit modal */}
            {editing && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => { setEditing(null); setIsNew(false); }}>
                    <div className="card p-6 w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-6">{isNew ? "キャスト追加" : "キャスト編集"}</h2>

                        {/* Basic info */}
                        <h3 className="text-sm font-semibold text-gold-400 mb-3 border-b border-dark-700 pb-2">基本情報</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                            <div className="col-span-2">
                                <label className="block text-sm text-dark-300 mb-1">名前</label>
                                <input type="text" value={editing.name} onChange={(e) => updateEditing("name", e.target.value)} className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">年齢</label>
                                <input type="number" value={editing.age} onChange={(e) => updateEditing("age", Number(e.target.value))} className="input-field w-full" min={18} />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">身長 (cm)</label>
                                <input type="number" value={editing.height} onChange={(e) => updateEditing("height", Number(e.target.value))} className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">カップ</label>
                                <select value={editing.cup} onChange={(e) => updateEditing("cup", e.target.value)} className="input-field w-full">
                                    {["A", "B", "C", "D", "E", "F", "G", "H"].map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">バスト</label>
                                <input type="number" value={editing.bust} onChange={(e) => updateEditing("bust", Number(e.target.value))} className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">ウエスト</label>
                                <input type="number" value={editing.waist} onChange={(e) => updateEditing("waist", Number(e.target.value))} className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">ヒップ</label>
                                <input type="number" value={editing.hip} onChange={(e) => updateEditing("hip", Number(e.target.value))} className="input-field w-full" />
                            </div>
                        </div>

                        {/* Additional info */}
                        <h3 className="text-sm font-semibold text-gold-400 mb-3 border-b border-dark-700 pb-2">詳細情報</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">国籍</label>
                                <input type="text" value={editing.nationality || ""} onChange={(e) => updateEditing("nationality", e.target.value)} className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">対応言語（カンマ区切り）</label>
                                <input type="text" value={(editing.languages || []).join(", ")} onChange={(e) => updateEditing("languages", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className="input-field w-full" placeholder="Japanese, English" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">タグ（カンマ区切り）</label>
                                <input type="text" value={(editing.tags || []).join(", ")} onChange={(e) => updateEditing("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className="input-field w-full" placeholder="High Class, GFE, Slim" />
                            </div>
                        </div>
                        <div className="flex gap-6 mb-6">
                            <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                                <input type="checkbox" checked={editing.smoking || false} onChange={(e) => updateEditing("smoking", e.target.checked)} className="accent-primary-500" />
                                喫煙
                            </label>
                            <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                                <input type="checkbox" checked={editing.tattoo || false} onChange={(e) => updateEditing("tattoo", e.target.checked)} className="accent-primary-500" />
                                タトゥー
                            </label>
                        </div>

                        {/* Schedule + badges */}
                        <h3 className="text-sm font-semibold text-gold-400 mb-3 border-b border-dark-700 pb-2">出勤・バッジ</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">出勤開始</label>
                                <input type="time" value={editing.availableFrom || ""} onChange={(e) => updateEditing("availableFrom", e.target.value)} className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">出勤終了</label>
                                <input type="time" value={editing.availableUntil || ""} onChange={(e) => updateEditing("availableUntil", e.target.value)} className="input-field w-full" />
                            </div>
                        </div>
                        <div className="flex gap-4 mb-6">
                            <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                                <input type="checkbox" checked={editing.isNew} onChange={(e) => updateEditing("isNew", e.target.checked)} className="accent-primary-500" />
                                NEWバッジ
                            </label>
                            <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                                <input type="checkbox" checked={editing.isRecommended} onChange={(e) => updateEditing("isRecommended", e.target.checked)} className="accent-primary-500" />
                                おすすめバッジ
                            </label>
                            <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer">
                                <input type="checkbox" checked={editing.available} onChange={(e) => updateEditing("available", e.target.checked)} className="accent-green-500" />
                                出勤中
                            </label>
                        </div>

                        {/* Images (up to 20) */}
                        <h3 className="text-sm font-semibold text-gold-400 mb-3 border-b border-dark-700 pb-2">
                            写真（最大20枚）
                            <span className="ml-2 text-dark-400 font-normal">{editing.images.length}/20</span>
                        </h3>
                        <div className="space-y-2 mb-2">
                            {editing.images.map((img, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-dark-500 text-xs w-6 text-right">{i + 1}.</span>
                                    <input
                                        type="text"
                                        value={img}
                                        onChange={(e) => updateImage(i, e.target.value)}
                                        className="input-field flex-1 text-sm"
                                        placeholder="画像URL（https://... or /images/cast/...）"
                                    />
                                    {img && img !== "/images/cast/placeholder.jpg" && (
                                        <div className="w-10 h-10 rounded bg-dark-800 overflow-hidden flex-shrink-0">
                                            <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        </div>
                                    )}
                                    {editing.images.length > 1 && (
                                        <button onClick={() => removeImage(i)} className="text-dark-500 hover:text-red-400 text-sm flex-shrink-0">✕</button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {editing.images.length < 20 && (
                            <button onClick={addImage} className="text-primary-400 hover:text-primary-300 text-sm mb-6">+ 画像を追加</button>
                        )}

                        {/* Store comment */}
                        <h3 className="text-sm font-semibold text-gold-400 mb-3 border-b border-dark-700 pb-2 mt-6">お店からのコメント</h3>
                        {[
                            { code: "ja", label: "日本語" },
                            { code: "en", label: "English" },
                        ].map((lang) => (
                            <div key={lang.code} className="mb-2">
                                <label className="block text-xs text-dark-400 mb-1">{lang.label}</label>
                                <textarea
                                    value={(editing.storeComment || {})[lang.code] || ""}
                                    onChange={(e) => updateStoreComment(lang.code, e.target.value)}
                                    className="input-field w-full text-sm"
                                    rows={3}
                                />
                            </div>
                        ))}

                        {/* Cast comment */}
                        <h3 className="text-sm font-semibold text-gold-400 mb-3 border-b border-dark-700 pb-2 mt-6">女の子からのコメント</h3>
                        {[
                            { code: "ja", label: "日本語" },
                            { code: "en", label: "English" },
                        ].map((lang) => (
                            <div key={lang.code} className="mb-2">
                                <label className="block text-xs text-dark-400 mb-1">{lang.label}</label>
                                <textarea
                                    value={(editing.castComment || {})[lang.code] || ""}
                                    onChange={(e) => updateCastComment(lang.code, e.target.value)}
                                    className="input-field w-full text-sm"
                                    rows={3}
                                />
                            </div>
                        ))}

                        {/* Profile (multilingual) */}
                        <h3 className="text-sm font-semibold text-gold-400 mb-3 border-b border-dark-700 pb-2 mt-6">プロフィール（多言語）</h3>
                        {[
                            { code: "ja", label: "日本語" },
                            { code: "en", label: "English" },
                            { code: "zh", label: "中文" },
                            { code: "fr", label: "Français" },
                            { code: "es", label: "Español" },
                            { code: "hi", label: "हिन्दी" },
                        ].map((lang) => (
                            <div key={lang.code} className="mb-2">
                                <label className="block text-xs text-dark-400 mb-1">{lang.label}</label>
                                <textarea
                                    value={editing.profile[lang.code] || ""}
                                    onChange={(e) => updateProfile(lang.code, e.target.value)}
                                    className="input-field w-full text-sm"
                                    rows={2}
                                />
                            </div>
                        ))}

                        <div className="flex gap-3 justify-end mt-6">
                            <button onClick={() => { setEditing(null); setIsNew(false); }} className="px-4 py-2 text-dark-400 hover:text-white text-sm">キャンセル</button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-6 py-2">
                                {saving ? "保存中..." : "保存"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

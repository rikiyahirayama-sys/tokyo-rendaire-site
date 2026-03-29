"use client";

import { useState, useEffect } from "react";

interface MultiLang {
    [key: string]: string;
}

interface Course {
    id: string;
    name: MultiLang;
    duration: number;
    price: number;
    description: MultiLang;
}

interface Area {
    id: string;
    slug: string;
    name: MultiLang;
    description: MultiLang;
    transportMinutes: number;
    transportFee: number;
}

const langs = [
    { code: "ja", label: "日本語" },
    { code: "en", label: "English" },
    { code: "zh", label: "中文" },
    { code: "fr", label: "Français" },
    { code: "es", label: "Español" },
    { code: "hi", label: "हिन्दी" },
];

const emptyLang = (): MultiLang => Object.fromEntries(langs.map((l) => [l.code, ""]));

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [tab, setTab] = useState<"courses" | "areas">("courses");
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [editingArea, setEditingArea] = useState<Area | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/admin/data")
            .then((r) => r.json())
            .then((d) => {
                setCourses(d.courses || []);
                setAreas(d.areas || []);
            })
            .catch(() => setMessage("データの読み込みに失敗しました"));
    }, []);

    async function saveData(data: { courses?: Course[]; areas?: Area[] }) {
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/admin/data", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                if (data.courses) setCourses(data.courses);
                if (data.areas) setAreas(data.areas);
                setMessage("保存しました");
                setEditingCourse(null);
                setEditingArea(null);
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

    // Course handlers
    function addCourse() {
        setEditingCourse({ id: `course-${Date.now()}`, name: emptyLang(), duration: 60, price: 30000, description: emptyLang() });
        setIsNew(true);
    }
    function saveCourse() {
        if (!editingCourse) return;
        const updated = isNew ? [...courses, editingCourse] : courses.map((c) => (c.id === editingCourse.id ? editingCourse : c));
        saveData({ courses: updated });
    }
    function deleteCourse(id: string) {
        if (!confirm("このコースを削除しますか？")) return;
        saveData({ courses: courses.filter((c) => c.id !== id) });
    }

    // Area handlers
    function addArea() {
        setEditingArea({ id: `area-${Date.now()}`, slug: "", name: emptyLang(), description: emptyLang(), transportMinutes: 20, transportFee: 0 });
        setIsNew(true);
    }
    function saveArea() {
        if (!editingArea) return;
        const updated = isNew ? [...areas, editingArea] : areas.map((a) => (a.id === editingArea.id ? editingArea : a));
        saveData({ areas: updated });
    }
    function deleteArea(id: string) {
        if (!confirm("このエリアを削除しますか？")) return;
        saveData({ areas: areas.filter((a) => a.id !== id) });
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6">コース・エリア管理</h1>

            {message && (
                <div className={`mb-6 p-3 rounded-lg text-sm ${message.includes("失敗") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {message}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button onClick={() => setTab("courses")} className={`px-5 py-2 rounded-lg text-sm font-medium ${tab === "courses" ? "bg-primary-600 text-white" : "bg-dark-800 text-dark-300"}`}>
                    コース ({courses.length})
                </button>
                <button onClick={() => setTab("areas")} className={`px-5 py-2 rounded-lg text-sm font-medium ${tab === "areas" ? "bg-primary-600 text-white" : "bg-dark-800 text-dark-300"}`}>
                    エリア ({areas.length})
                </button>
            </div>

            {/* Courses tab */}
            {tab === "courses" && (
                <div>
                    <button onClick={addCourse} className="btn-primary text-sm px-6 py-2 mb-4">+ コース追加</button>
                    <div className="space-y-3">
                        {courses.map((course) => (
                            <div key={course.id} className="card p-4 flex items-center justify-between">
                                <div>
                                    <span className="text-white font-semibold">{course.name.ja || course.name.en}</span>
                                    <span className="text-dark-400 text-sm ml-3">{course.duration}分 / ¥{course.price.toLocaleString()}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingCourse({ ...course, name: { ...course.name }, description: { ...course.description } }); setIsNew(false); }} className="text-dark-400 hover:text-white text-sm">編集</button>
                                    <button onClick={() => deleteCourse(course.id)} className="text-dark-400 hover:text-red-400 text-sm">削除</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Areas tab */}
            {tab === "areas" && (
                <div>
                    <button onClick={addArea} className="btn-primary text-sm px-6 py-2 mb-4">+ エリア追加</button>
                    <div className="space-y-3">
                        {areas.map((area) => (
                            <div key={area.id} className="card p-4 flex items-center justify-between">
                                <div>
                                    <span className="text-white font-semibold">{area.name.ja || area.name.en}</span>
                                    <span className="text-dark-400 text-sm ml-3">移動{area.transportMinutes}分 / ¥{area.transportFee.toLocaleString()}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingArea({ ...area, name: { ...area.name }, description: { ...area.description } }); setIsNew(false); }} className="text-dark-400 hover:text-white text-sm">編集</button>
                                    <button onClick={() => deleteArea(area.id)} className="text-dark-400 hover:text-red-400 text-sm">削除</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Course edit modal */}
            {editingCourse && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setEditingCourse(null); setIsNew(false); }}>
                    <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-4">{isNew ? "コース追加" : "コース編集"}</h2>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">時間（分）</label>
                                <input type="number" value={editingCourse.duration} onChange={(e) => setEditingCourse({ ...editingCourse, duration: Number(e.target.value) })} className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">料金（円）</label>
                                <input type="number" value={editingCourse.price} onChange={(e) => setEditingCourse({ ...editingCourse, price: Number(e.target.value) })} className="input-field w-full" />
                            </div>
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-2">コース名（多言語）</h3>
                        {langs.map((l) => (
                            <div key={l.code} className="mb-2">
                                <label className="block text-xs text-dark-400 mb-1">{l.label}</label>
                                <input type="text" value={editingCourse.name[l.code] || ""} onChange={(e) => setEditingCourse({ ...editingCourse, name: { ...editingCourse.name, [l.code]: e.target.value } })} className="input-field w-full text-sm" />
                            </div>
                        ))}
                        <h3 className="text-sm font-semibold text-white mb-2 mt-4">説明（多言語）</h3>
                        {langs.map((l) => (
                            <div key={l.code} className="mb-2">
                                <label className="block text-xs text-dark-400 mb-1">{l.label}</label>
                                <textarea value={editingCourse.description[l.code] || ""} onChange={(e) => setEditingCourse({ ...editingCourse, description: { ...editingCourse.description, [l.code]: e.target.value } })} className="input-field w-full text-sm" rows={2} />
                            </div>
                        ))}
                        <div className="flex gap-3 justify-end mt-4">
                            <button onClick={() => { setEditingCourse(null); setIsNew(false); }} className="px-4 py-2 text-dark-400 hover:text-white text-sm">キャンセル</button>
                            <button onClick={saveCourse} disabled={saving} className="btn-primary text-sm px-6 py-2">{saving ? "保存中..." : "保存"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Area edit modal */}
            {editingArea && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setEditingArea(null); setIsNew(false); }}>
                    <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-4">{isNew ? "エリア追加" : "エリア編集"}</h2>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">スラッグ</label>
                                <input type="text" value={editingArea.slug} onChange={(e) => setEditingArea({ ...editingArea, slug: e.target.value })} className="input-field w-full" placeholder="roppongi" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">移動時間（分）</label>
                                <input type="number" value={editingArea.transportMinutes} onChange={(e) => setEditingArea({ ...editingArea, transportMinutes: Number(e.target.value) })} className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">交通費（円）</label>
                                <input type="number" value={editingArea.transportFee} onChange={(e) => setEditingArea({ ...editingArea, transportFee: Number(e.target.value) })} className="input-field w-full" />
                            </div>
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-2">エリア名（多言語）</h3>
                        {langs.map((l) => (
                            <div key={l.code} className="mb-2">
                                <label className="block text-xs text-dark-400 mb-1">{l.label}</label>
                                <input type="text" value={editingArea.name[l.code] || ""} onChange={(e) => setEditingArea({ ...editingArea, name: { ...editingArea.name, [l.code]: e.target.value } })} className="input-field w-full text-sm" />
                            </div>
                        ))}
                        <h3 className="text-sm font-semibold text-white mb-2 mt-4">説明（多言語）</h3>
                        {langs.map((l) => (
                            <div key={l.code} className="mb-2">
                                <label className="block text-xs text-dark-400 mb-1">{l.label}</label>
                                <textarea value={editingArea.description[l.code] || ""} onChange={(e) => setEditingArea({ ...editingArea, description: { ...editingArea.description, [l.code]: e.target.value } })} className="input-field w-full text-sm" rows={2} />
                            </div>
                        ))}
                        <div className="flex gap-3 justify-end mt-4">
                            <button onClick={() => { setEditingArea(null); setIsNew(false); }} className="px-4 py-2 text-dark-400 hover:text-white text-sm">キャンセル</button>
                            <button onClick={saveArea} disabled={saving} className="btn-primary text-sm px-6 py-2">{saving ? "保存中..." : "保存"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

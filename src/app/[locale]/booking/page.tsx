"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { courses, demoCasts } from "@/lib/data";
import { t as tl } from "@/lib/locale-helper";

export default function BookingPage() {
    return (
        <Suspense fallback={<div className="pt-24 pb-20 text-center text-dark-400">Loading...</div>}>
            <BookingContent />
        </Suspense>
    );
}

function BookingContent() {
    const t = useTranslations("booking");
    const ts = useTranslations("system");
    const tc = useTranslations("cast");
    const locale = useLocale();
    const searchParams = useSearchParams();

    const preselectedCourse = searchParams.get("course") || "";
    const preselectedCast = searchParams.get("cast") || "";

    const [step, setStep] = useState(1);
    const [selectedCourse, setSelectedCourse] = useState(preselectedCourse);
    const [selectedCast, setSelectedCast] = useState(preselectedCast);
    const [formData, setFormData] = useState({
        date: "",
        time: "",
        name: "",
        phone: "",
        email: "",
        hotel: "",
        roomNumber: "",
        specialRequests: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingId, setBookingId] = useState("");

    const course = courses.find((c) => c.id === selectedCourse);

    async function handleSubmit() {
        if (!course) return;
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId: selectedCourse,
                    castId: selectedCast || null,
                    date: formData.date,
                    time: formData.time,
                    customerName: formData.name,
                    customerPhone: formData.phone,
                    customerEmail: formData.email,
                    hotel: formData.hotel,
                    roomNumber: formData.roomNumber,
                    specialRequests: formData.specialRequests,
                    locale,
                }),
            });

            const data = await res.json();

            if (data.paymentUrl) {
                // Redirect to Stripe Checkout
                window.location.href = data.paymentUrl;
            } else if (data.bookingId) {
                setBookingId(data.bookingId);
                setStep(5);
            }
        } catch {
            alert("Booking failed. Please contact us on WhatsApp.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="pt-24 pb-20">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="section-title">{t("title")}</h1>
                    <p className="section-subtitle">{t("subtitle")}</p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-12">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s
                                    ? "bg-primary-500 text-white"
                                    : "bg-dark-800 text-dark-500"
                                    }`}
                            >
                                {step > s ? "✓" : s}
                            </div>
                            {s < 5 && (
                                <div
                                    className={`w-8 h-[2px] ${step > s ? "bg-primary-500" : "bg-dark-800"
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 1: Select Course */}
                {step === 1 && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-6">
                            {t("step1")}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {courses.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        setSelectedCourse(c.id);
                                        setStep(2);
                                    }}
                                    className={`card p-5 text-left transition-all ${selectedCourse === c.id
                                        ? "border-primary-500 ring-1 ring-primary-500/50"
                                        : "hover:border-dark-600"
                                        }`}
                                >
                                    <h3 className="font-semibold text-white">
                                        {tl(c.name, locale)}
                                    </h3>
                                    <p className="text-dark-400 text-sm">
                                        {c.duration} {ts("minutes")}
                                    </p>
                                    <p className="text-2xl font-bold gold-accent mt-2">
                                        ¥{c.price.toLocaleString()}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Date & Time */}
                {step === 2 && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-6">
                            {t("step2")}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-dark-400 mb-2">
                                    {t("selectDate")}
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) =>
                                        setFormData({ ...formData, date: e.target.value })
                                    }
                                    min={new Date().toISOString().split("T")[0]}
                                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-400 mb-2">
                                    {t("selectTime")}
                                </label>
                                <select
                                    value={formData.time}
                                    onChange={(e) =>
                                        setFormData({ ...formData, time: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                >
                                    <option value="">--</option>
                                    {Array.from({ length: 24 }, (_, h) =>
                                        [`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`]
                                    )
                                        .flat()
                                        .map((time) => (
                                            <option key={time} value={time}>
                                                {time}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Cast Selection */}
                            <div>
                                <label className="block text-sm text-dark-400 mb-2">
                                    {t("selectedCast")}
                                </label>
                                <select
                                    value={selectedCast}
                                    onChange={(e) => setSelectedCast(e.target.value)}
                                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                >
                                    <option value="">{t("anyCast")}</option>
                                    {demoCasts
                                        .filter((c) => c.available)
                                        .map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setStep(1)}
                                    className="btn-secondary flex-1"
                                >
                                    ← {t("step1")}
                                </button>
                                <button
                                    onClick={() => {
                                        if (formData.date && formData.time) setStep(3);
                                    }}
                                    disabled={!formData.date || !formData.time}
                                    className="btn-primary flex-1 disabled:opacity-50"
                                >
                                    {t("step3")} →
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Customer Details */}
                {step === 3 && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-6">
                            {t("step3")}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-dark-400 mb-2">
                                    {t("yourName")} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-400 mb-2">
                                    {t("phone")} *
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) =>
                                        setFormData({ ...formData, phone: e.target.value })
                                    }
                                    placeholder="+81..."
                                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-400 mb-2">
                                    {t("email")}
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-400 mb-2">
                                    {t("hotel")} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.hotel}
                                    onChange={(e) =>
                                        setFormData({ ...formData, hotel: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-400 mb-2">
                                    {t("roomNumber")} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.roomNumber}
                                    onChange={(e) =>
                                        setFormData({ ...formData, roomNumber: e.target.value })
                                    }
                                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-400 mb-2">
                                    {t("specialRequests")}
                                </label>
                                <textarea
                                    value={formData.specialRequests}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            specialRequests: e.target.value,
                                        })
                                    }
                                    rows={3}
                                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setStep(2)}
                                    className="btn-secondary flex-1"
                                >
                                    ← {t("step2")}
                                </button>
                                <button
                                    onClick={() => {
                                        if (formData.name && formData.phone && formData.hotel && formData.roomNumber)
                                            setStep(4);
                                    }}
                                    disabled={
                                        !formData.name ||
                                        !formData.phone ||
                                        !formData.hotel ||
                                        !formData.roomNumber
                                    }
                                    className="btn-primary flex-1 disabled:opacity-50"
                                >
                                    {t("step4")} →
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Review & Pay */}
                {step === 4 && course && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-6">
                            {t("step4")}
                        </h2>
                        <div className="card p-6 mb-6 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">{t("step1")}</span>
                                <span className="text-white">
                                    {tl(course.name, locale)} ({course.duration}min)
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">{t("selectDate")}</span>
                                <span className="text-white">{formData.date}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">{t("selectTime")}</span>
                                <span className="text-white">{formData.time}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">{t("selectedCast")}</span>
                                <span className="text-white">
                                    {selectedCast
                                        ? demoCasts.find((c) => c.id === selectedCast)?.name
                                        : t("anyCast")}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-dark-400">{t("hotel")}</span>
                                <span className="text-white">{formData.hotel}</span>
                            </div>
                            <hr className="border-dark-700" />
                            <div className="flex justify-between text-lg font-bold">
                                <span className="text-white">Total</span>
                                <span className="gold-accent">
                                    ¥{course.price.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep(3)}
                                className="btn-secondary flex-1"
                            >
                                ← {t("step3")}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="btn-primary flex-1 disabled:opacity-50"
                            >
                                {isSubmitting ? "..." : t("proceedPayment")}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 5: Confirmation */}
                {step === 5 && (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {t("bookingConfirmed")}
                        </h2>
                        <p className="text-dark-400 mb-4">
                            {t("bookingConfirmedDesc")}
                        </p>
                        {bookingId && (
                            <p className="text-dark-500 text-sm">
                                {t("bookingId")}: <span className="text-gold-400 font-mono">{bookingId}</span>
                            </p>
                        )}
                        <Link href={`/${locale}`} className="btn-secondary mt-8 inline-block">
                            ← Home
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

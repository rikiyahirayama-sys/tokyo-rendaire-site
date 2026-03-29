"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
    images: string[];
    name: string;
}

export default function CastDetailClient({ images, name }: Props) {
    const validImages = images.filter((img) => img && img !== "/images/cast/placeholder.jpg");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const currentImage = validImages[selectedIndex] || null;

    if (validImages.length === 0) {
        return (
            <div className="card overflow-hidden">
                <div className="aspect-[3/4] bg-dark-800 flex items-center justify-center text-dark-600">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                </div>
            </div>
        );
    }

    function prev() {
        setSelectedIndex((i) => (i > 0 ? i - 1 : validImages.length - 1));
    }
    function next() {
        setSelectedIndex((i) => (i < validImages.length - 1 ? i + 1 : 0));
    }

    return (
        <>
            {/* Main image */}
            <div className="card overflow-hidden mb-3">
                <div
                    className="relative aspect-[3/4] bg-dark-800 cursor-pointer group"
                    onClick={() => setLightboxOpen(true)}
                >
                    {currentImage && (
                        <Image
                            src={currentImage}
                            alt={`${name} photo ${selectedIndex + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 60vw"
                            priority
                        />
                    )}
                    {/* Navigation arrows */}
                    {validImages.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); prev(); }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-dark-950/60 hover:bg-dark-950/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); next(); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-dark-950/60 hover:bg-dark-950/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </>
                    )}
                    {/* Counter */}
                    <div className="absolute bottom-3 right-3 bg-dark-950/70 text-white text-xs px-2 py-1 rounded z-10">
                        {selectedIndex + 1} / {validImages.length}
                    </div>
                </div>
            </div>

            {/* Thumbnail strip */}
            {validImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {validImages.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedIndex(i)}
                            className={`relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border-2 transition-colors ${i === selectedIndex ? "border-primary-500" : "border-transparent hover:border-dark-600"}`}
                        >
                            <Image
                                src={img}
                                alt={`${name} thumbnail ${i + 1}`}
                                fill
                                className="object-cover"
                                sizes="64px"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {lightboxOpen && currentImage && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                    onClick={() => setLightboxOpen(false)}
                >
                    <button
                        className="absolute top-4 right-4 text-white/70 hover:text-white z-50"
                        onClick={() => setLightboxOpen(false)}
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    {validImages.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); prev(); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-dark-950/60 hover:bg-dark-950/80 text-white rounded-full flex items-center justify-center z-50"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); next(); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-dark-950/60 hover:bg-dark-950/80 text-white rounded-full flex items-center justify-center z-50"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </>
                    )}

                    <div className="relative max-w-4xl max-h-[90vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
                        <Image
                            src={currentImage}
                            alt={`${name} photo ${selectedIndex + 1}`}
                            fill
                            className="object-contain"
                            sizes="100vw"
                        />
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                        {selectedIndex + 1} / {validImages.length}
                    </div>
                </div>
            )}
        </>
    );
}

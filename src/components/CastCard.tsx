"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import type { Cast } from "@/types";

interface CastCardProps {
    cast: Cast;
    tAvailable: string;
    tUnavailable: string;
    tNew: string;
    tRecommended: string;
    tAge: string;
    tHeight: string;
    tViewDetails: string;
}

export default function CastCard({
    cast,
    tAvailable,
    tUnavailable,
    tNew,
    tRecommended,
    tAge,
    tHeight,
    tViewDetails,
}: CastCardProps) {
    const locale = useLocale();
    const mainImage = cast.images?.[0];
    const photoCount = cast.images?.length || 0;

    return (
        <Link href={`/${locale}/cast/${cast.id}`} className="card-hover group block">
            {/* Image */}
            <div className="relative aspect-[3/4] bg-dark-800 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-transparent to-transparent z-10" />

                {mainImage && mainImage !== "/images/cast/placeholder.jpg" ? (
                    <Image
                        src={mainImage}
                        alt={cast.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-dark-600">
                        <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                )}

                {/* Photo count */}
                {photoCount > 1 && (
                    <div className="absolute bottom-3 right-3 z-20 bg-dark-950/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                        {photoCount}
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 z-20 flex gap-2">
                    {cast.isNew && (
                        <span className="px-2 py-1 bg-primary-500 text-white text-xs font-bold rounded">
                            {tNew}
                        </span>
                    )}
                    {cast.isRecommended && (
                        <span className="px-2 py-1 bg-gold-500 text-dark-950 text-xs font-bold rounded">
                            {tRecommended}
                        </span>
                    )}
                </div>

                {/* Availability */}
                <div className="absolute top-3 right-3 z-20">
                    <span
                        className={`px-2 py-1 text-xs font-medium rounded ${cast.available
                            ? "bg-green-500/90 text-white"
                            : "bg-dark-700/90 text-dark-400"
                            }`}
                    >
                        {cast.available ? tAvailable : tUnavailable}
                    </span>
                </div>

                {/* Name overlay */}
                <div className="absolute bottom-3 left-3 z-20">
                    <h3 className="font-display text-2xl font-bold text-white">
                        {cast.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-dark-300 mt-1">
                        <span>{tAge}: {cast.age}</span>
                        <span>{tHeight}: {cast.height}cm</span>
                        <span>{cast.cup}</span>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="p-4">
                {/* Tags */}
                {cast.tags && cast.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {cast.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-primary-500/10 text-primary-400 text-xs rounded-full">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4">
                    <div>
                        <span className="text-dark-500 text-xs">B</span>
                        <p className="text-white">{cast.bust}</p>
                    </div>
                    <div>
                        <span className="text-dark-500 text-xs">W</span>
                        <p className="text-white">{cast.waist}</p>
                    </div>
                    <div>
                        <span className="text-dark-500 text-xs">H</span>
                        <p className="text-white">{cast.hip}</p>
                    </div>
                </div>

                {cast.available && cast.availableFrom && (
                    <p className="text-green-400 text-xs mb-3">
                        {cast.availableFrom} - {cast.availableUntil}
                    </p>
                )}

                <span className="btn-primary w-full text-sm py-2 block text-center">
                    {tViewDetails}
                </span>
            </div>
        </Link>
    );
}

export interface Cast {
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

export interface Course {
    id: string;
    name: Record<string, string>;
    duration: number;
    price: number;
    description?: Record<string, string>;
}

export interface Area {
    id: string;
    slug: string;
    name: Record<string, string>;
    description: Record<string, string>;
    transportMinutes: number;
    transportFee: number;
    image?: string;
}

export interface Booking {
    id: string;
    castId?: string;
    courseId: string;
    date: string;
    time: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    hotel: string;
    roomNumber: string;
    specialRequests?: string;
    status: "pending" | "confirmed" | "completed" | "cancelled";
    paymentIntentId?: string;
    totalAmount: number;
}

export interface ScheduleEntry {
    castId: string;
    date: string;
    startTime: string;
    endTime: string;
}

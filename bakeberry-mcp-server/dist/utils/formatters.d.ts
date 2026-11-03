export interface CakeVariant {
    _id: string;
    name: string;
    price: number;
    stock: number;
    reserved: number;
    flavours: string[];
    preparationDays: number;
    instantEligible: boolean;
    advanceEligible: boolean;
    active: boolean;
}
export interface CakeItem {
    _id: string;
    name: string;
    description?: string;
    category: string;
    images?: string[];
    variants: CakeVariant[];
}
export declare function formatCakesResponse(items: CakeItem[], total: number, page: number): string;
export interface BookingSlotItem {
    date: string;
    slot: string;
    capacity?: number;
    reserved?: number;
    remaining: number;
    available: boolean;
}
export declare function formatBookingAvailability(slots: BookingSlotItem[], from: string, to: string, earliestDate?: string): string;
export declare function formatOrderStatus(order: any): string;
export declare function formatInventorySummary(items: any[]): string;

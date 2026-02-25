import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function removeUndefinedValues<T extends Object>(obj: T): Partial<T> {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined)) as Partial<T>
}

export function formatPrice(price: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(price)
}

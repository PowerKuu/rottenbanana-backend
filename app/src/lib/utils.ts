import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import convert from "color-convert"
import { File } from "@/prisma/client"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function removeUndefinedValues<T extends Object>(obj: T): Partial<T> {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined)) as Partial<T>
}

export function formatPrice(priceGross: number, currency: string = "USD") {
    return `${priceGross.toFixed(2)} ${currency}`
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

export function validateUrl(url: string): boolean {
    try {
        const parsed = new URL(url)
        return parsed.protocol === "http:" || parsed.protocol === "https:"
    } catch {
        return false
    }
}

export function parseTextfieldList(input: string): string[] {
    if (!input.trim()) return []

    const list = input
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

    return list
}

export function hexToCIELAB(hex: string): [number, number, number] {
    const cleanHex = hex.replace(/^#/, "")

    const rgb = convert.hex.rgb(cleanHex)
    const lab = convert.rgb.lab(rgb)

    return lab
}

export function randomShuffle<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

export function randomDraw<T>(array: T[]): T {
    const index = Math.floor(Math.random() * array.length)
    return array[index]
}

export function getFileUrl(id: string): string {
    return `/api/uploads/${id}`
}

export function getExternalFileUrl(id: string): string {
    const url = process.env.BASE_URL
    return `${url}/api/uploads/${id}`
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

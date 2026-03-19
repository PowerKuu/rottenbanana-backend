"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"

import { PendingProduct } from "@/prisma/client"
import { StatusBadge } from "./StatusBadge"

type SwipePhase = "idle" | "dragging" | "flying-approve" | "flying-reject" | "snapping"

const THRESHOLD = 120
const MAX_ROTATE = 18

interface SwipeCardProps {
    product: PendingProduct
    nextProduct: PendingProduct | null
    onApprove: () => void
    onReject: () => void
    disabled?: boolean
}

export function SwipeCard({ product, nextProduct, onApprove, onReject, disabled }: SwipeCardProps) {
    const [dragX, setDragX] = useState(0)
    const [phase, setPhase] = useState<SwipePhase>("idle")
    const [entered, setEntered] = useState(false)
    const dragStartX = useRef<number | null>(null)
    const decidedRef = useRef(false)

    // Entrance animation: double rAF ensures the browser paints the initial state before transitioning
    useEffect(() => {
        let frame1: number
        let frame2: number
        frame1 = requestAnimationFrame(() => {
            frame2 = requestAnimationFrame(() => setEntered(true))
        })
        return () => {
            cancelAnimationFrame(frame1)
            cancelAnimationFrame(frame2)
        }
    }, [])

    useEffect(() => {
        if (dragStartX.current === null) return

        const handleMouseMove = (e: MouseEvent) => {
            if (dragStartX.current === null) return
            setDragX(e.clientX - dragStartX.current)
        }

        const handleMouseUp = (e: MouseEvent) => {
            if (dragStartX.current === null) return
            const delta = e.clientX - dragStartX.current
            dragStartX.current = null
            if (decidedRef.current) return

            if (delta >= THRESHOLD) {
                decidedRef.current = true
                setPhase("flying-approve")
                onApprove()
            } else if (delta <= -THRESHOLD) {
                decidedRef.current = true
                setPhase("flying-reject")
                onReject()
            } else {
                setPhase("snapping")
                setDragX(0)
                setTimeout(() => setPhase("idle"), 380)
            }
        }

        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)
        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [phase, onApprove, onReject])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (disabled) return
        e.preventDefault()
        dragStartX.current = e.clientX
        decidedRef.current = false
        setPhase("dragging")
    }

    const getDomainFromUrl = (url: string): string => {
        try {
            return new URL(url).hostname.replace("www.", "")
        } catch {
            return "Product"
        }
    }

    const rotationDeg = (dragX / 400) * MAX_ROTATE
    const dragProgress = Math.min(Math.abs(dragX) / THRESHOLD, 1)
    const approveOpacity = Math.min(Math.max(dragX / THRESHOLD, 0), 1)
    const rejectOpacity = Math.min(Math.max(-dragX / THRESHOLD, 0), 1)

    // Next card grows and lifts as the front card moves
    const nextScale = 0.88 + 0.12 * dragProgress
    const nextTranslateY = 16 - 16 * dragProgress

    // Active card: slight scale-up when dragging ("picked up" feel)
    const dragScale = phase === "dragging" ? 1 + 0.02 * dragProgress : 1

    let cardTransform = `translateX(${dragX}px) rotate(${rotationDeg}deg) scale(${dragScale})`
    let cardTransition = "none"

    if (phase === "flying-approve") {
        cardTransform = `translateX(140vw) rotate(${MAX_ROTATE}deg) scale(1)`
        cardTransition = "transform 0.5s cubic-bezier(0.55, 0, 0.85, 0.3)"
    } else if (phase === "flying-reject") {
        cardTransform = `translateX(-140vw) rotate(-${MAX_ROTATE}deg) scale(1)`
        cardTransition = "transform 0.5s cubic-bezier(0.55, 0, 0.85, 0.3)"
    } else if (phase === "snapping") {
        cardTransform = "translateX(0px) rotate(0deg) scale(1)"
        cardTransition = "transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1)"
    }

    // Entrance animation on wrapper (separate from drag transform on inner card)
    const wrapperStyle: React.CSSProperties = {
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0px) scale(1)" : "translateY(28px) scale(0.92)",
        transition: entered ? "opacity 0.35s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none"
    }

    return (
        <div className="relative w-full max-w-sm mx-auto" style={{ aspectRatio: "9/16", ...wrapperStyle }}>
            {/* Next card (stack preview) */}
            {nextProduct && (
                <div
                    className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl bg-card"
                    style={{
                        transform: `scale(${nextScale}) translateY(${nextTranslateY}px)`,
                        transition: phase === "dragging" ? "none" : "transform 0.3s ease",
                        zIndex: 0
                    }}
                >
                    <Image
                        src={nextProduct.imageUrl}
                        alt={getDomainFromUrl(nextProduct.url)}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                    {/* Dim overlay on next card */}
                    <div className="absolute inset-0 bg-black/20" style={{ opacity: 1 - dragProgress * 0.8 }} />
                </div>
            )}

            {/* Active draggable card */}
            <div
                className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl bg-card select-none"
                style={{
                    transform: cardTransform,
                    transition: cardTransition,
                    zIndex: 10,
                    cursor: disabled ? "default" : phase === "dragging" ? "grabbing" : "grab",
                    boxShadow:
                        phase === "dragging"
                            ? "0 30px 60px -10px rgba(0,0,0,0.4), 0 18px 36px -18px rgba(0,0,0,0.5)"
                            : undefined
                }}
                onMouseDown={handleMouseDown}
            >
                {/* Approve overlay */}
                <div
                    className="absolute inset-0 z-20 flex items-start justify-start p-8 rounded-3xl"
                    style={{
                        opacity: approveOpacity,
                        pointerEvents: "none",
                        background: `rgba(34, 197, 94, ${approveOpacity * 0.15})`,
                        borderWidth: 4,
                        borderStyle: "solid",
                        borderColor: `rgba(34, 197, 94, ${approveOpacity})`
                    }}
                >
                    <span
                        className="font-black text-green-500 leading-none"
                        style={{
                            fontSize: 72,
                            transform: "rotate(-15deg)",
                            textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                            display: "block"
                        }}
                    >
                        LIKE
                    </span>
                </div>

                {/* Reject overlay */}
                <div
                    className="absolute inset-0 z-20 flex items-start justify-end p-8 rounded-3xl"
                    style={{
                        opacity: rejectOpacity,
                        pointerEvents: "none",
                        background: `rgba(239, 68, 68, ${rejectOpacity * 0.15})`,
                        borderWidth: 4,
                        borderStyle: "solid",
                        borderColor: `rgba(239, 68, 68, ${rejectOpacity})`
                    }}
                >
                    <span
                        className="font-black text-red-500 leading-none"
                        style={{
                            fontSize: 72,
                            transform: "rotate(15deg)",
                            textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                            display: "block"
                        }}
                    >
                        NOPE
                    </span>
                </div>

                {/* Product image (full card) */}
                <Image
                    src={product.imageUrl}
                    alt={getDomainFromUrl(product.url)}
                    fill
                    className="object-cover"
                    unoptimized
                    draggable={false}
                />

                {/* Status badge */}
                <div className="absolute top-4 left-4 z-10">
                    <StatusBadge status={product.status} />
                </div>

                {/* Info bar at bottom */}
                <div
                    className="absolute bottom-0 left-0 right-0 z-10 px-5 py-4"
                    style={{
                        background:
                            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)",
                        paddingTop: 48
                    }}
                >
                    <p className="text-white font-medium truncate">{getDomainFromUrl(product.url)}</p>
                    <p className="text-white/60 text-sm truncate mt-0.5">{product.url}</p>
                </div>
            </div>
        </div>
    )
}

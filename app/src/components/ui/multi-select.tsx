"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface MultiSelectProps {
    options: { id: string; name: string }[]
    value: string[]
    onChange: (value: string[]) => void
    placeholder?: string
    disabled?: boolean
}

export function MultiSelect({
    options,
    value,
    onChange,
    placeholder = "Select items",
    disabled = false
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
            return () => document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    const handleToggle = (optionId: string) => {
        if (value.includes(optionId)) {
            onChange(value.filter((id) => id !== optionId))
        } else {
            onChange([...value, optionId])
        }
    }

    const handleRemove = (optionId: string) => {
        onChange(value.filter((id) => id !== optionId))
    }

    const selectedOptions = options.filter((option) => value.includes(option.id))

    const displayText =
        value.length === 0 ? placeholder : value.length === 1 ? "1 item selected" : `${value.length} items selected`

    return (
        <div className="space-y-2">
            <div ref={containerRef} className="relative">
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    className={cn("w-full justify-between", !value.length && "text-muted-foreground")}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                >
                    {displayText}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                        <div className="max-h-60 overflow-y-auto p-1">
                            {options.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">No items available</div>
                            ) : (
                                options.map((option) => {
                                    const isSelected = value.includes(option.id)
                                    return (
                                        <div
                                            key={option.id}
                                            className={cn(
                                                "relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                                                isSelected && "bg-accent/50"
                                            )}
                                            onClick={() => handleToggle(option.id)}
                                        >
                                            <div
                                                className={cn(
                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                                                )}
                                            >
                                                {isSelected && <Check className="h-3 w-3" />}
                                            </div>
                                            <span>{option.name}</span>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {selectedOptions.map((option) => (
                        <Badge key={option.id} variant="secondary" className="gap-1 pr-1">
                            <span>{option.name}</span>
                            <button
                                type="button"
                                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                onClick={() => !disabled && handleRemove(option.id)}
                                disabled={disabled}
                            >
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}

"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createRegion, updateRegion } from "@/server/admin/actions/regions"
import { getFileUrl } from "@/lib/utils"
import { Region } from "@/prisma/client"

const ISO_COUNTRIES: { code: string; name: string }[] = [
    { code: "AF", name: "Afghanistan" },
    { code: "AL", name: "Albania" },
    { code: "DZ", name: "Algeria" },
    { code: "AD", name: "Andorra" },
    { code: "AO", name: "Angola" },
    { code: "AG", name: "Antigua and Barbuda" },
    { code: "AR", name: "Argentina" },
    { code: "AM", name: "Armenia" },
    { code: "AU", name: "Australia" },
    { code: "AT", name: "Austria" },
    { code: "AZ", name: "Azerbaijan" },
    { code: "BS", name: "Bahamas" },
    { code: "BH", name: "Bahrain" },
    { code: "BD", name: "Bangladesh" },
    { code: "BB", name: "Barbados" },
    { code: "BY", name: "Belarus" },
    { code: "BE", name: "Belgium" },
    { code: "BZ", name: "Belize" },
    { code: "BJ", name: "Benin" },
    { code: "BT", name: "Bhutan" },
    { code: "BO", name: "Bolivia" },
    { code: "BA", name: "Bosnia and Herzegovina" },
    { code: "BW", name: "Botswana" },
    { code: "BR", name: "Brazil" },
    { code: "BN", name: "Brunei" },
    { code: "BG", name: "Bulgaria" },
    { code: "BF", name: "Burkina Faso" },
    { code: "BI", name: "Burundi" },
    { code: "CV", name: "Cabo Verde" },
    { code: "KH", name: "Cambodia" },
    { code: "CM", name: "Cameroon" },
    { code: "CA", name: "Canada" },
    { code: "CF", name: "Central African Republic" },
    { code: "TD", name: "Chad" },
    { code: "CL", name: "Chile" },
    { code: "CN", name: "China" },
    { code: "CO", name: "Colombia" },
    { code: "KM", name: "Comoros" },
    { code: "CG", name: "Congo" },
    { code: "CR", name: "Costa Rica" },
    { code: "HR", name: "Croatia" },
    { code: "CU", name: "Cuba" },
    { code: "CY", name: "Cyprus" },
    { code: "CZ", name: "Czech Republic" },
    { code: "DK", name: "Denmark" },
    { code: "DJ", name: "Djibouti" },
    { code: "DM", name: "Dominica" },
    { code: "DO", name: "Dominican Republic" },
    { code: "EC", name: "Ecuador" },
    { code: "EG", name: "Egypt" },
    { code: "SV", name: "El Salvador" },
    { code: "GQ", name: "Equatorial Guinea" },
    { code: "ER", name: "Eritrea" },
    { code: "EE", name: "Estonia" },
    { code: "SZ", name: "Eswatini" },
    { code: "ET", name: "Ethiopia" },
    { code: "FJ", name: "Fiji" },
    { code: "FI", name: "Finland" },
    { code: "FR", name: "France" },
    { code: "GA", name: "Gabon" },
    { code: "GM", name: "Gambia" },
    { code: "GE", name: "Georgia" },
    { code: "DE", name: "Germany" },
    { code: "GH", name: "Ghana" },
    { code: "GR", name: "Greece" },
    { code: "GD", name: "Grenada" },
    { code: "GT", name: "Guatemala" },
    { code: "GN", name: "Guinea" },
    { code: "GW", name: "Guinea-Bissau" },
    { code: "GY", name: "Guyana" },
    { code: "HT", name: "Haiti" },
    { code: "HN", name: "Honduras" },
    { code: "HU", name: "Hungary" },
    { code: "IS", name: "Iceland" },
    { code: "IN", name: "India" },
    { code: "ID", name: "Indonesia" },
    { code: "IR", name: "Iran" },
    { code: "IQ", name: "Iraq" },
    { code: "IE", name: "Ireland" },
    { code: "IL", name: "Israel" },
    { code: "IT", name: "Italy" },
    { code: "JM", name: "Jamaica" },
    { code: "JP", name: "Japan" },
    { code: "JO", name: "Jordan" },
    { code: "KZ", name: "Kazakhstan" },
    { code: "KE", name: "Kenya" },
    { code: "KI", name: "Kiribati" },
    { code: "KW", name: "Kuwait" },
    { code: "KG", name: "Kyrgyzstan" },
    { code: "LA", name: "Laos" },
    { code: "LV", name: "Latvia" },
    { code: "LB", name: "Lebanon" },
    { code: "LS", name: "Lesotho" },
    { code: "LR", name: "Liberia" },
    { code: "LY", name: "Libya" },
    { code: "LI", name: "Liechtenstein" },
    { code: "LT", name: "Lithuania" },
    { code: "LU", name: "Luxembourg" },
    { code: "MG", name: "Madagascar" },
    { code: "MW", name: "Malawi" },
    { code: "MY", name: "Malaysia" },
    { code: "MV", name: "Maldives" },
    { code: "ML", name: "Mali" },
    { code: "MT", name: "Malta" },
    { code: "MH", name: "Marshall Islands" },
    { code: "MR", name: "Mauritania" },
    { code: "MU", name: "Mauritius" },
    { code: "MX", name: "Mexico" },
    { code: "FM", name: "Micronesia" },
    { code: "MD", name: "Moldova" },
    { code: "MC", name: "Monaco" },
    { code: "MN", name: "Mongolia" },
    { code: "ME", name: "Montenegro" },
    { code: "MA", name: "Morocco" },
    { code: "MZ", name: "Mozambique" },
    { code: "MM", name: "Myanmar" },
    { code: "NA", name: "Namibia" },
    { code: "NR", name: "Nauru" },
    { code: "NP", name: "Nepal" },
    { code: "NL", name: "Netherlands" },
    { code: "NZ", name: "New Zealand" },
    { code: "NI", name: "Nicaragua" },
    { code: "NE", name: "Niger" },
    { code: "NG", name: "Nigeria" },
    { code: "KP", name: "North Korea" },
    { code: "MK", name: "North Macedonia" },
    { code: "NO", name: "Norway" },
    { code: "OM", name: "Oman" },
    { code: "PK", name: "Pakistan" },
    { code: "PW", name: "Palau" },
    { code: "PA", name: "Panama" },
    { code: "PG", name: "Papua New Guinea" },
    { code: "PY", name: "Paraguay" },
    { code: "PE", name: "Peru" },
    { code: "PH", name: "Philippines" },
    { code: "PL", name: "Poland" },
    { code: "PT", name: "Portugal" },
    { code: "QA", name: "Qatar" },
    { code: "RO", name: "Romania" },
    { code: "RU", name: "Russia" },
    { code: "RW", name: "Rwanda" },
    { code: "KN", name: "Saint Kitts and Nevis" },
    { code: "LC", name: "Saint Lucia" },
    { code: "VC", name: "Saint Vincent and the Grenadines" },
    { code: "WS", name: "Samoa" },
    { code: "SM", name: "San Marino" },
    { code: "ST", name: "Sao Tome and Principe" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "SN", name: "Senegal" },
    { code: "RS", name: "Serbia" },
    { code: "SC", name: "Seychelles" },
    { code: "SL", name: "Sierra Leone" },
    { code: "SG", name: "Singapore" },
    { code: "SK", name: "Slovakia" },
    { code: "SI", name: "Slovenia" },
    { code: "SB", name: "Solomon Islands" },
    { code: "SO", name: "Somalia" },
    { code: "ZA", name: "South Africa" },
    { code: "KR", name: "South Korea" },
    { code: "SS", name: "South Sudan" },
    { code: "ES", name: "Spain" },
    { code: "LK", name: "Sri Lanka" },
    { code: "SD", name: "Sudan" },
    { code: "SR", name: "Suriname" },
    { code: "SE", name: "Sweden" },
    { code: "CH", name: "Switzerland" },
    { code: "SY", name: "Syria" },
    { code: "TW", name: "Taiwan" },
    { code: "TJ", name: "Tajikistan" },
    { code: "TZ", name: "Tanzania" },
    { code: "TH", name: "Thailand" },
    { code: "TL", name: "Timor-Leste" },
    { code: "TG", name: "Togo" },
    { code: "TO", name: "Tonga" },
    { code: "TT", name: "Trinidad and Tobago" },
    { code: "TN", name: "Tunisia" },
    { code: "TR", name: "Turkey" },
    { code: "TM", name: "Turkmenistan" },
    { code: "TV", name: "Tuvalu" },
    { code: "UG", name: "Uganda" },
    { code: "UA", name: "Ukraine" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "GB", name: "United Kingdom" },
    { code: "US", name: "United States" },
    { code: "UY", name: "Uruguay" },
    { code: "UZ", name: "Uzbekistan" },
    { code: "VU", name: "Vanuatu" },
    { code: "VE", name: "Venezuela" },
    { code: "VN", name: "Vietnam" },
    { code: "YE", name: "Yemen" },
    { code: "ZM", name: "Zambia" },
    { code: "ZW", name: "Zimbabwe" },
    { code: "HK", name: "Hong Kong" },
    { code: "MO", name: "Macao" },
    { code: "PS", name: "Palestine" },
    { code: "XK", name: "Kosovo" }
]

function CountryCodeCombobox({
    value,
    onChange,
    disabled
}: {
    value: string
    onChange: (val: string) => void
    disabled: boolean
}) {
    const [query, setQuery] = useState(value)
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setQuery(value)
    }, [value])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const filtered =
        query.length === 0
            ? ISO_COUNTRIES
            : ISO_COUNTRIES.filter(
                  (c) => c.code.startsWith(query.toUpperCase()) || c.name.toLowerCase().includes(query.toLowerCase())
              )

    function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
        const val = e.target.value.slice(0, 2)
        setQuery(val)
        onChange(val.toUpperCase())
        setOpen(true)
    }

    function handleSelect(code: string) {
        setQuery(code)
        onChange(code)
        setOpen(false)
    }

    return (
        <div ref={containerRef} className="relative">
            <Input
                value={query}
                onChange={handleInput}
                onFocus={() => setOpen(true)}
                placeholder="e.g., NO, US, GB"
                disabled={disabled}
                maxLength={2}
                autoComplete="off"
                className="uppercase"
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
                    <ul className="max-h-48 overflow-y-auto py-1">
                        {filtered.map((c) => (
                            <li
                                key={c.code}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    handleSelect(c.code)
                                }}
                                className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${value === c.code ? "bg-accent/50 font-medium" : ""}`}
                            >
                                <span className="font-mono font-semibold text-xs w-6 shrink-0">{c.code}</span>
                                <span className="text-muted-foreground">{c.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export function RegionFormDialog({
    open,
    onOpenChange,
    region,
    onSuccess
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    region?: Region | null
    onSuccess?: () => void
}) {
    const [name, setName] = useState("")
    const [countryCode, setCountryCode] = useState("")
    const [flagImage, setFlagImage] = useState<File | null>(null)
    const [flagPreview, setFlagPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (region) {
            setName(region.name)
            setCountryCode(region.countryCode ?? "")
            setFlagPreview(region.flagImageId ? getFileUrl(region.flagImageId) : null)
        } else {
            setName("")
            setCountryCode("")
            setFlagPreview(null)
        }
        setFlagImage(null)
        setError("")
    }, [region, open])

    function handleFlagImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            setError("Image must be under 5MB")
            return
        }
        setFlagImage(file)
        setError("")
        const reader = new FileReader()
        reader.onloadend = () => setFlagPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!name.trim()) {
            setError("Region name is required")
            return
        }

        if (name.trim().length < 2) {
            setError("Region name must be at least 2 characters")
            return
        }

        if (name.trim().length > 100) {
            setError("Region name must be less than 100 characters")
            return
        }

        setLoading(true)

        try {
            let flagImageId = region?.flagImageId ?? undefined

            if (flagImage) {
                const formData = new FormData()
                formData.append("file", flagImage)
                const uploadResponse = await fetch("/api/uploads/upload", { method: "POST", body: formData })
                const uploadData = await uploadResponse.json()
                if (uploadData.error) throw new Error(uploadData.error)
                flagImageId = uploadData.id
            }

            if (region) {
                await updateRegion({
                    id: region.id,
                    name,
                    countryCode: countryCode || null,
                    flagImageId: flagImageId ?? null
                })
            } else {
                await createRegion({
                    name,
                    countryCode: countryCode || undefined,
                    flagImageId
                })
            }

            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            if (err instanceof Error) {
                if (err.message.includes("Unique constraint")) {
                    setError("A region with this name already exists")
                } else {
                    setError(err.message)
                }
            } else {
                setError("An error occurred")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{region ? "Edit Region" : "Create Region"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Region Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Norway, United States"
                            disabled={loading}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">A unique name for this geographical region</p>
                    </div>

                    <div className="space-y-2">
                        <Label>
                            Country Code <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <CountryCodeCombobox value={countryCode} onChange={setCountryCode} disabled={loading} />
                        <p className="text-xs text-muted-foreground">
                            ISO 3166-1 alpha-2 code — used to auto-detect the user's region on mobile
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="flagImage">
                            Flag Image <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Input
                            id="flagImage"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFlagImageChange}
                            disabled={loading}
                        />
                        {flagPreview && (
                            <div className="relative h-16 w-24 overflow-hidden rounded-md border border-border bg-muted">
                                <Image
                                    src={flagPreview}
                                    alt="Flag preview"
                                    fill
                                    className="object-cover"
                                    sizes="96px"
                                    unoptimized={flagPreview.startsWith("data:")}
                                />
                            </div>
                        )}
                    </div>

                    {error && <div className="text-sm text-destructive">{error}</div>}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : region ? "Update" : "Create"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

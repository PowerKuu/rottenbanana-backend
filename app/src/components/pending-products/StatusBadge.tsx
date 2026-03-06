import { Badge } from "@/components/ui/badge"
import { PendingProductStatus } from "@/prisma/client"

const statusConfig = {
    PENDING: { label: "Pending", variant: "secondary" as const },
    APPROVED: { label: "Approved", variant: "default" as const },
    REJECTED: { label: "Rejected", variant: "destructive" as const },
    PROCCESSING: { label: "Processing", variant: "outline" as const }
}

export function StatusBadge({ status }: { status: PendingProductStatus }) {
    const config = statusConfig[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
}

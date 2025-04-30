"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Edit, Trash2, Calendar } from "lucide-react"
import type { Batch } from "@/types"
import { formatCurrency } from "@/lib/utils"

interface BatchHeaderProps {
    batch: Batch
    onDeleteClick: () => void
}

export function BatchHeader({ batch, onDeleteClick }: BatchHeaderProps) {
    const formattedDate = new Date(batch.purchase_date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <CardTitle>{batch.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            {formattedDate}
                        </CardDescription>
                        {batch.description && (
                            <p className="text-sm text-muted-foreground mt-1">{batch.description}</p>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button variant="outline" asChild>
                            <Link href={`/batches/${batch.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Batch
                            </Link>
                        </Button>
                        <Button variant="destructive" onClick={onDeleteClick}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Batch
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>
    )
}

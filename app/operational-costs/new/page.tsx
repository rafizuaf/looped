import { Suspense } from "react"
import { OperationalCostForm } from "@/components/forms/operational-cost-form"
import { LoadingIndicator } from "@/components/ui/loading-indicator"

export default function NewOperationalCostPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <OperationalCostForm mode="create" />
    </Suspense>
  )
} 
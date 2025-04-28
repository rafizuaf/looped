"use client"

import * as React from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "@/components/ui/sheet"

export function MobileNav() {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[240px] sm:w-[300px]">
        <div className="flex flex-col gap-4 mt-8">
          <Link
            href="/dashboard"
            className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/batches"
            className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
            onClick={() => setOpen(false)}
          >
            Batches
          </Link>
          <Link
            href="/budget"
            className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
            onClick={() => setOpen(false)}
          >
            Budget
          </Link>
          <Link
            href="/items"
            className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
            onClick={() => setOpen(false)}
          >
            Items
          </Link>
          <Link
            href="/reports"
            className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
            onClick={() => setOpen(false)}
          >
            Reports
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
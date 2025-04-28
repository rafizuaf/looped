"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { DoorClosed, DoorOpen, Infinity, LogOut, Recycle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { MobileNav } from "@/components/layout/mobile-nav"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/providers/auth-provider"
import { supabase } from "@/lib/supabase/client"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { toast } = useToast()

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
      variant: "success",
    })
    router.push('/auth/login')
    router.refresh()
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 z-40 w-full transition-all duration-200",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-b"
          : "bg-transparent"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Infinity className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight">looped</span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/dashboard"
            className={cn(
              "text-sm font-medium transition-colors relative",
              pathname === "/dashboard"
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/batches"
            className={cn(
              "text-sm font-medium transition-colors relative",
              pathname === "/batches" || pathname.startsWith("/batches/")
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            Batches
          </Link>
          <Link
            href="/budget"
            className={cn(
              "text-sm font-medium transition-colors relative",
              pathname === "/budget"
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            Budget
          </Link>
          <Link
            href="/items"
            className={cn(
              "text-sm font-medium transition-colors relative",
              pathname === "/items" || pathname.startsWith("/items/")
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            Items
          </Link>
          <Link
            href="/reports"
            className={cn(
              "text-sm font-medium transition-colors relative",
              pathname === "/reports"
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            Reports
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          )}
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
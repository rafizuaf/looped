"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Infinity, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { MobileNav } from "@/components/layout/mobile-nav"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/providers/auth-provider"
import { supabase } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { routes, isRouteActive } from "@/lib/routes"
import { toast } from "sonner"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error("Failed to sign out. Please try again.")
        return
      }

      toast.success("Logged out successfully")
      router.push("/auth/login")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to log out")
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={cn(
        "fixed top-0 z-40 w-full transition-all duration-200",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-b"
          : "bg-transparent"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <motion.div 
          className="flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Link href="/" className="flex items-center gap-2">
            <Infinity className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight">looped</span>
          </Link>
        </motion.div>
        <nav className="hidden md:flex items-center gap-6">
          {routes.map((route) => {
            const isActive = isRouteActive(pathname, route)
            return (
              <motion.div
                key={route.href}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href={route.href}
                  className={cn(
                    "text-sm font-medium transition-colors relative flex items-center gap-2",
                    isActive
                      ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                      : "text-muted-foreground hover:text-primary"
                  )}
                >
                  {route.icon && <route.icon className="h-4 w-4" />}
                  {route.label}
                </Link>
              </motion.div>
            )
          })}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </motion.div>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </motion.div>
          )}
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </motion.header>
  )
}
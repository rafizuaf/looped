import { DollarSign, LayoutDashboard, Package, Wallet, FileText, Recycle } from "lucide-react"

export interface RouteConfig {
  href: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/batches",
    label: "Batches",
    icon: Package,
  },
  {
    href: "/operational-costs",
    label: "Costs",
    icon: DollarSign,
  },
  {
    href: "/budget",
    label: "Budget",
    icon: Wallet,
  },
  {
    href: "/items",
    label: "Items",
    icon: Recycle,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: FileText,
  },
]

// Helper function to check if a path matches a route
export function isRouteActive(pathname: string, route: RouteConfig): boolean {
  return pathname === route.href || pathname.startsWith(`${route.href}/`)
}

// Helper function to get all routes including nested ones
export function getAllRoutes(routes: RouteConfig[]): RouteConfig[] {
  return routes.reduce<RouteConfig[]>((acc, route) => {
    acc.push(route)
    if (route.children) {
      acc.push(...getAllRoutes(route.children))
    }
    return acc
  }, [])
} 
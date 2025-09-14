"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { FolderOpen, Home, Settings } from "lucide-react"

const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderOpen,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="pb-12 w-72 border-r border-charcoal/10 bg-parchment/50">
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <nav className="space-y-2">
            {sidebarNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-4 py-3 rounded-squircle text-sm font-body font-medium transition-all duration-200",
                    pathname === item.href 
                      ? "bg-sage text-charcoal shadow-paper-inner" 
                      : "text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5"
                  )}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.title}
                </div>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}

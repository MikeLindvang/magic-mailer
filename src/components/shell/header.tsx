"use client"

import Link from "next/link"
import { UserButton } from '@clerk/nextjs'
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

export function Header() {
  const { setTheme, theme } = useTheme()

  return (
    <header className="bg-parchment border-b border-charcoal/10 p-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center space-x-2">
          <h1 className="font-headline text-charcoal text-2xl font-bold">
            MagicMailer
          </h1>
        </Link>
        
        <div className="flex items-center space-x-4">
          <button
            className="p-2 rounded-squircle-sm hover:bg-charcoal/5 transition-colors duration-200"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <Sun className="h-5 w-5 text-charcoal rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 text-charcoal rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </button>
          
          <UserButton 
            appearance={{
              elements: {
                avatarBox: {
                  width: '40px',
                  height: '40px',
                  borderRadius: '2rem 1rem 1rem 2rem', // squircle shape
                  border: '2px solid rgba(43, 42, 45, 0.1)',
                },
                popoverCard: {
                  backgroundColor: '#F8F5EE',
                  borderRadius: '2rem 1rem 1rem 2rem',
                  boxShadow: '0 10px 15px -3px rgba(43, 42, 45, 0.1)',
                  border: '1px solid rgba(43, 42, 45, 0.1)',
                },
                popoverActionButton: {
                  color: '#2B2A2D',
                  fontFamily: 'Inter, sans-serif',
                  '&:hover': {
                    backgroundColor: 'rgba(217, 134, 102, 0.1)',
                  },
                },
              },
            }}
            afterSignOutUrl="/"
          />
        </div>
      </div>
    </header>
  )
}

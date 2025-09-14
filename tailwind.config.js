/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'headline': ['Playfair Display', 'serif'],
        'body': ['Inter', 'sans-serif'],
        'sans': ['Inter', 'sans-serif'], // Override default sans
        'serif': ['Playfair Display', 'serif'], // Override default serif
      },
      colors: {
        // Tactile Digital Color Palette
        'parchment': '#F8F5EE',
        'charcoal': '#2B2A2D',
        'terracotta': '#D98666',
        'sage': '#88A89A',
        
        // Keep existing shadcn/ui colors for compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Custom squircle shapes for tactile design
        'squircle': '2rem 1rem 1rem 2rem',
        'squircle-sm': '1.5rem 0.75rem 0.75rem 1.5rem',
        'squircle-lg': '2.5rem 1.25rem 1.25rem 2.5rem',
        'squircle-alt': '1rem 2rem 2rem 1rem', // Alternative asymmetric shape
      },
      boxShadow: {
        // Custom paper-like shadows for depth
        'paper': '0 4px 6px -1px rgba(43, 42, 45, 0.1), 0 2px 4px -1px rgba(43, 42, 45, 0.06), 0 1px 3px 0 rgba(43, 42, 45, 0.1)',
        'paper-lg': '0 10px 15px -3px rgba(43, 42, 45, 0.1), 0 4px 6px -2px rgba(43, 42, 45, 0.05), 0 2px 4px 0 rgba(43, 42, 45, 0.1)',
        'paper-xl': '0 20px 25px -5px rgba(43, 42, 45, 0.1), 0 10px 10px -5px rgba(43, 42, 45, 0.04), 0 4px 6px 0 rgba(43, 42, 45, 0.1)',
        'paper-inner': 'inset 0 2px 4px 0 rgba(43, 42, 45, 0.06)',
      },
      backgroundImage: {
        // Subtle texture for the parchment background
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}


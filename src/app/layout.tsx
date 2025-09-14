import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MagicMailer",
  description: "AI-powered email marketing platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined, // Use custom styling
        variables: {
          // Tactile design system integration
          colorPrimary: '#D98666',        // terracotta
          colorBackground: '#F8F5EE',     // parchment
          colorText: '#2B2A2D',           // charcoal
          colorTextSecondary: '#2B2A2D',  // charcoal with opacity
          colorInputBackground: '#F8F5EE', // parchment
          colorInputText: '#2B2A2D',      // charcoal
          borderRadius: '2rem 1rem 1rem 2rem', // squircle shape
          fontFamily: 'Inter, sans-serif', // body font
          fontSize: '16px',
        },
        elements: {
          // Modal-specific styling
          modalContent: {
            backgroundColor: '#F8F5EE',
            borderRadius: '2rem 1rem 1rem 2rem',
            boxShadow: '0 20px 25px -5px rgba(43, 42, 45, 0.1), 0 10px 10px -5px rgba(43, 42, 45, 0.04)',
            border: '1px solid rgba(43, 42, 45, 0.1)',
          },
          modalCloseButton: {
            color: '#2B2A2D',
          },
          // Form elements
          formButtonPrimary: {
            backgroundColor: '#D98666',
            color: '#F8F5EE',
            borderRadius: '2rem 1rem 1rem 2rem',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '500',
            padding: '12px 24px',
            boxShadow: '0 4px 6px -1px rgba(43, 42, 45, 0.1)',
            transition: 'all 200ms ease',
            '&:hover': {
              backgroundColor: '#C67A5C',
              transform: 'translateY(-1px)',
              boxShadow: '0 10px 15px -3px rgba(43, 42, 45, 0.1)',
            },
            '&:active': {
              transform: 'translateY(0.5px)',
              boxShadow: 'inset 0 2px 4px 0 rgba(43, 42, 45, 0.06)',
            },
          },
          formFieldInput: {
            backgroundColor: 'rgba(248, 245, 238, 0.5)',
            border: '2px solid rgba(43, 42, 45, 0.2)',
            borderRadius: '1.5rem 0.75rem 0.75rem 1.5rem',
            color: '#2B2A2D',
            fontFamily: 'Inter, sans-serif',
            padding: '12px 16px',
            '&:focus': {
              borderColor: '#88A89A',
              boxShadow: 'inset 0 2px 4px 0 rgba(43, 42, 45, 0.06)',
              outline: 'none',
            },
          },
          // Typography
          headerTitle: {
            fontFamily: 'Playfair Display, serif',
            color: '#2B2A2D',
            fontSize: '28px',
            fontWeight: '700',
          },
          headerSubtitle: {
            fontFamily: 'Inter, sans-serif',
            color: 'rgba(43, 42, 45, 0.8)',
            fontSize: '16px',
          },
          // Links and secondary actions
          footerActionLink: {
            color: '#D98666',
            fontFamily: 'Inter, sans-serif',
            textDecoration: 'none',
            '&:hover': {
              color: '#C67A5C',
              textDecoration: 'underline',
            },
          },
        },
      }}
    >
      <html lang="en">
        <body className={`${inter.variable} ${playfairDisplay.variable} font-body bg-parchment bg-grain text-charcoal antialiased`}>
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}

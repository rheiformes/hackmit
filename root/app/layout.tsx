import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Jam - Music Generator for Hackers",
  description:
    "Generate personalized music from your Spotify taste and GitHub repos. Perfect for hackathons and coding sessions.",
  generator: "v0.app",
  keywords: ["music generation", "AI", "hackathon", "Spotify", "GitHub", "coding music"],
  authors: [{ name: "Jam Team" }],
  openGraph: {
    title: "Jam - Music Generator for Hackers",
    description: "Transform your Spotify taste and GitHub repos into personalized soundtracks",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jam - Music Generator for Hackers",
    description: "Transform your Spotify taste and GitHub repos into personalized soundtracks",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}

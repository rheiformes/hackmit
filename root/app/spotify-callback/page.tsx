"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

function SpotifyCallbackContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      console.error("Spotify auth error:", error)
      window.close()
      return
    }

    if (code && window.opener) {
      // Send the authorization code back to the parent window
      window.opener.postMessage(
        {
          type: "SPOTIFY_AUTH_SUCCESS",
          code,
          state,
        },
        window.location.origin,
      )
      window.close()
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Connecting to Spotify...</h1>
        <p className="text-muted-foreground">This window will close automatically.</p>
      </div>
    </div>
  )
}

export default function SpotifyCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SpotifyCallbackContent />
    </Suspense>
  )
}

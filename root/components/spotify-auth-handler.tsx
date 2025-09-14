"use client"

import { useEffect } from "react"
import { JamAPI } from "@/lib/api"

interface SpotifyAuthHandlerProps {
  onUserConnected: (user: any) => void
}

export function SpotifyAuthHandler({ onUserConnected }: SpotifyAuthHandlerProps) {
  useEffect(() => {
    // Listen for messages from Spotify OAuth popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
        const { code, state } = event.data
        try {
          // Exchange code for tokens
          const tokens = await JamAPI.exchangeSpotifyCode(code, state)

          // Get user profile with minimal data for faster loading
          const profile = await JamAPI.getSpotifyProfile(tokens.access_token)

          // Create user object
          const user = {
            id: profile.profile.id,
            accessToken: tokens.access_token,
            profile: {
              display_name: profile.profile.display_name,
              top_genres: profile.top_genres || [],
            },
          }

          onUserConnected(user)
        } catch (error) {
          console.error("Failed to handle Spotify auth:", error)
          // Show user-friendly error
          alert("Failed to connect Spotify account. Please try again.")
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [onUserConnected])

  return null
}

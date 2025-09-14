"use client"

import { useState, useCallback } from "react"
import { JamAPI } from "@/lib/api"

interface SpotifyUser {
  id: string
  accessToken: string
  refreshToken?: string
  profile?: {
    display_name: string
    email?: string
    top_genres: string[]
  }
}

export function useSpotifyAuth() {
  const [users, setUsers] = useState<SpotifyUser[]>([])
  const [isConnecting, setIsConnecting] = useState(false)

  const connectUser = useCallback(async () => {
    if (isConnecting) return

    setIsConnecting(true)
    try {
      const { authorize_url } = await JamAPI.getSpotifyAuthUrl(`jam-${Date.now()}`)

      // Open popup window
      const popup = window.open(authorize_url, "spotify-auth", "width=500,height=600")

      // Listen for auth completion
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === "SPOTIFY_AUTH_SUCCESS") {
          const { code, state } = event.data

          try {
            // Exchange code for tokens
            const tokens = await JamAPI.exchangeSpotifyCode(code, state)

            // Get user profile
            const profileData = await JamAPI.getSpotifyProfile(tokens.access_token)

            const newUser: SpotifyUser = {
              id: profileData.profile.id,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              profile: {
                display_name: profileData.profile.display_name,
                email: profileData.profile.email,
                top_genres: profileData.top_genres || [],
              },
            }

            setUsers((prev) => {
              const existingIndex = prev.findIndex((u) => u.id === newUser.id)
              if (existingIndex >= 0) {
                const updated = [...prev]
                updated[existingIndex] = newUser
                return updated
              }
              return [...prev, newUser]
            })

            popup?.close()
          } catch (error) {
            console.error("Failed to complete Spotify auth:", error)
            alert("Failed to connect Spotify account. Please try again.")
          }

          window.removeEventListener("message", handleMessage)
        }
      }

      window.addEventListener("message", handleMessage)

      // Clean up if popup is closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          window.removeEventListener("message", handleMessage)
          setIsConnecting(false)
        }
      }, 1000)
    } catch (error) {
      console.error("Failed to initiate Spotify auth:", error)
      alert("Failed to start Spotify connection. Please try again.")
    } finally {
      setIsConnecting(false)
    }
  }, [isConnecting])

  const removeUser = useCallback((userId: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId))
  }, [])

  const refreshUserToken = useCallback(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId)
      if (!user?.refreshToken) return null

      try {
        const tokens = await JamAPI.refreshSpotifyToken(user.refreshToken)

        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, accessToken: tokens.access_token } : u)))

        return tokens.access_token
      } catch (error) {
        console.error("Failed to refresh token:", error)
        return null
      }
    },
    [users],
  )

  return {
    users,
    isConnecting,
    connectUser,
    removeUser,
    refreshUserToken,
  }
}

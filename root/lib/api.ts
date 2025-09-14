// API configuration and helper functions for the Jam backend
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787"

console.log("[v0] API_BASE configured as:", API_BASE)

export interface SpotifyUser {
  accessToken: string
}

export interface HackJamRequest {
  users: SpotifyUser[]
  mood: string
  teamName: string
  insideJokes?: string
  instrumental?: boolean
}

export interface RepoJamRequest {
  repoUrl: string
  tags?: string
  mood: string
  teamName?: string
}

export interface GenerationResponse {
  clipId: string
  tags: string
  status?: string
  audio_url?: string
  image_url?: string
  title?: string
  duration?: number
}

export class JamAPI {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    console.log("[v0] Making API request to:", url)

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      })

      console.log("[v0] API response status:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.log("[v0] API error response:", errorText)
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log("[v0] API response data:", data)
      return data
    } catch (error) {
      console.error("[v0] API request failed:", error)
      throw error
    }
  }

  static async generateHackJam(request: HackJamRequest): Promise<GenerationResponse> {
    console.log("[v0] Generating HackJam with request:", request)
    return this.request<GenerationResponse>("/api/team-anthem", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  static async generateRepoJam(request: RepoJamRequest): Promise<GenerationResponse> {
    console.log("[v0] Generating RepoJam with request:", request)
    return this.request<GenerationResponse>("/api/songify", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  static async getClip(clipId: string): Promise<GenerationResponse> {
    return this.request<GenerationResponse>(`/api/clip/${clipId}`)
  }

  static async waitForClip(clipId: string, timeoutSec = 180): Promise<GenerationResponse> {
    return this.request<GenerationResponse>(`/api/clip/${clipId}/wait?timeoutSec=${timeoutSec}`)
  }

  static async getSpotifyAuthUrl(state = "hacktrack"): Promise<{ authorize_url: string }> {
    return this.request<{ authorize_url: string }>(`/api/spotify/authorize?state=${state}`)
  }

  static async exchangeSpotifyCode(code: string, state?: string): Promise<any> {
    return this.request<any>(`/api/spotify/callback?code=${code}${state ? `&state=${state}` : ""}`)
  }

  static async getSpotifyProfile(accessToken: string): Promise<any> {
    return this.request<any>("/api/spotify/me", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    })
  }

  static async refreshSpotifyToken(refreshToken: string): Promise<any> {
    return this.request<any>("/api/spotify/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  }
}

export const MOODS = [
  { value: "lock-in", label: "Lock-in", description: "Focus mode activated" },
  { value: "debug-spiral", label: "Debug Spiral", description: "When the bugs fight back" },
  { value: "help-pls", label: "Help Pls", description: "Stack Overflow time" },
  { value: "free-swag-run", label: "Free Swag Run", description: "Sponsor booth speedrun" },
  { value: "food-and-yap", label: "Food & Yap", description: "Networking over snacks" },
  { value: "monster-energy", label: "Monster Energy", description: "Maximum overdrive" },
]

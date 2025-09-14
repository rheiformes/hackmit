import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Access token required" }, { status: 400 })
    }

    const headers = { Authorization: `Bearer ${accessToken}` }

    // Get user profile
    const meResponse = await fetch("https://api.spotify.com/v1/me", { headers })
    if (!meResponse.ok) {
      throw new Error(`Spotify API error: ${meResponse.status}`)
    }
    const me = await meResponse.json()

    // Get top artists for genres
    const artistsResponse = await fetch("https://api.spotify.com/v1/me/top/artists?limit=10&time_range=short_term", {
      headers,
    })
    const artists = artistsResponse.ok ? await artistsResponse.json() : { items: [] }

    const topGenres: string[] = []
    for (const artist of artists.items || []) {
      topGenres.push(...(artist.genres || []))
    }

    // Deduplicate and limit genres
    const uniqueGenres = [...new Set(topGenres.map((g) => g.toLowerCase()))].slice(0, 5)

    return NextResponse.json({
      profile: {
        id: me.id,
        display_name: me.display_name,
        email: me.email,
        country: me.country,
        product: me.product,
      },
      top_genres: uniqueGenres,
    })
  } catch (error) {
    console.error("Spotify me error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch Spotify profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

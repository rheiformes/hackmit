import { type NextRequest, NextResponse } from "next/server"

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI

export async function GET(request: NextRequest) {
  try {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI) {
      return NextResponse.json(
        {
          error: "Missing Spotify configuration",
        },
        { status: 500 },
      )
    }

    const { searchParams } = new URL(request.url)
    const state = searchParams.get("state") || "hacktrack"
    const scopes = searchParams.get("scopes") || "user-top-read user-read-email user-read-recently-played"

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: SPOTIFY_REDIRECT_URI,
      scope: scopes,
      state,
      show_dialog: "true",
    })

    const authorizeUrl = `https://accounts.spotify.com/authorize?${params.toString()}`

    return NextResponse.json({ authorize_url: authorizeUrl })
  } catch (error) {
    console.error("Spotify authorize error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate authorization URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

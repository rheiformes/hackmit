import { type NextRequest, NextResponse } from "next/server"

const SUNO_BASE = "https://studio-api.prod.suno.com/api/v2/external/hackmit"
const SUNO_TOKEN = process.env.SUNO_TOKEN

interface SpotifyUser {
  accessToken: string
}

interface TeamAnthemBody {
  users: SpotifyUser[]
  mood: string
  teamName: string
  insideJokes: string
  instrumental?: boolean
}

const MOOD_MAP: Record<string, any> = {
  "lock-in": {
    tags: ["electronic", "synthwave", "driving"],
    delta: { tempo: +10, energy: +0.2, danceability: +0.1 },
    instrumental: true,
  },
  "debug-spiral": {
    tags: ["lo-fi", "minimal", "chill"],
    delta: { tempo: -15, energy: -0.2, danceability: -0.05 },
    instrumental: true,
  },
  "help-pls": {
    tags: ["ambient pop", "uplifting", "light pads"],
    delta: { tempo: 0, energy: +0.05, danceability: 0.0 },
    instrumental: false,
  },
  "free-swag-run": {
    tags: ["house", "pop", "bright", "groove"],
    delta: { tempo: +20, energy: +0.25, danceability: +0.2 },
    instrumental: false,
  },
  "food-and-yap": {
    tags: ["bossa nova", "jazzy", "warm", "acoustic"],
    delta: { tempo: 0, energy: -0.05, danceability: +0.05 },
    instrumental: false,
  },
  "monster-energy": {
    tags: ["dnb", "hard techno", "aggressive"],
    delta: { tempo: +30, energy: +0.35, danceability: +0.1 },
    instrumental: false,
  },
}

async function fetchSpotifyTaste(accessToken: string) {
  const headers = { Authorization: `Bearer ${accessToken}` }

  try {
    // Get top artists for genres
    const artistsRes = await fetch("https://api.spotify.com/v1/me/top/artists?limit=20&time_range=short_term", {
      headers,
    })
    const artists = await artistsRes.json()

    const genres: string[] = []
    for (const artist of artists.items || []) {
      for (const genre of artist.genres || []) {
        if (genre) genres.push(genre.toLowerCase())
      }
    }

    // Get top tracks for audio features
    const tracksRes = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term", {
      headers,
    })
    const tracks = await tracksRes.json()

    const trackIds = (tracks.items || []).map((t: any) => t.id).filter((id: string) => id && id.length === 22)

    const features = { tempo: 0, energy: 0, danceability: 0, valence: 0, count: 0 }

    if (trackIds.length > 0) {
      const featuresRes = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds.join(",")}`, {
        headers,
      })
      const audioFeatures = await featuresRes.json()

      for (const feature of audioFeatures.audio_features || []) {
        if (feature) {
          features.tempo += feature.tempo || 0
          features.energy += feature.energy || 0
          features.danceability += feature.danceability || 0
          features.valence += feature.valence || 0
          features.count += 1
        }
      }

      if (features.count > 0) {
        features.tempo /= features.count
        features.energy /= features.count
        features.danceability /= features.count
        features.valence /= features.count
      }
    }

    return { genres, features }
  } catch (error) {
    console.error("Error fetching Spotify taste:", error)
    return { genres: [], features: { tempo: 110, energy: 0.55, danceability: 0.55, valence: 0.5, count: 1 } }
  }
}

function fuseTags(perUser: any[], mood: string, forceInstrumental?: boolean) {
  // Count genre frequencies
  const freq: Record<string, number> = {}
  for (const user of perUser) {
    const seen = new Set()
    for (const genre of user.genres || []) {
      if (genre && !seen.has(genre)) {
        seen.add(genre)
        freq[genre] = (freq[genre] || 0) + 1
      }
    }
  }

  const topGenres = Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([genre]) => genre)

  const moodCfg = MOOD_MAP[mood] || MOOD_MAP["lock-in"]
  const tags = [...new Set([...topGenres, ...moodCfg.tags])]
  const makeInstrumental = forceInstrumental !== undefined ? forceInstrumental : moodCfg.instrumental

  // Average features
  const agg = { tempo: 0, energy: 0, danceability: 0, valence: 0, n: 0 }
  for (const user of perUser) {
    const f = user.features || {}
    if (f.count > 0) {
      agg.tempo += f.tempo || 0
      agg.energy += f.energy || 0
      agg.danceability += f.danceability || 0
      agg.valence += f.valence || 0
      agg.n += 1
    }
  }

  if (agg.n > 0) {
    agg.tempo /= agg.n
    agg.energy /= agg.n
    agg.danceability /= agg.n
    agg.valence /= agg.n
  }

  const delta = moodCfg.delta || {}
  const adjusted = {
    tempo: Math.max(60, Math.min(200, Math.round((agg.tempo || 110) + (delta.tempo || 0)))),
    energy: Math.max(0, Math.min(1, (agg.energy || 0.5) + (delta.energy || 0))),
    danceability: Math.max(0, Math.min(1, (agg.danceability || 0.5) + (delta.danceability || 0))),
    valence: agg.valence || 0.5,
  }

  const tagStr = tags.slice(0, 6).join(", ")
  return {
    tagStr,
    makeInstrumental,
    explain: { topGenres: topGenres.slice(0, 4), adjusted },
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!SUNO_TOKEN) {
      return NextResponse.json({ error: "Missing SUNO_TOKEN" }, { status: 500 })
    }

    const body: TeamAnthemBody = await request.json()

    if (!body.users || body.users.length === 0) {
      return NextResponse.json({ error: "No users provided" }, { status: 400 })
    }

    // Fetch Spotify taste for each user
    const perUser = await Promise.all(body.users.map((user) => fetchSpotifyTaste(user.accessToken)))

    // Fuse tags and generate topic
    const fused = fuseTags(perUser, body.mood, body.instrumental)

    const topic =
      `An anthem for ${body.teamName} at HackMIT. Mood: ${body.mood}. ${body.insideJokes ? `Inside jokes: ${body.insideJokes}` : ""}`.slice(
        0,
        480,
      )

    // Generate with Suno
    const sunoResponse = await fetch(`${SUNO_BASE}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUNO_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        tags: fused.tagStr,
        make_instrumental: fused.makeInstrumental,
      }),
    })

    if (!sunoResponse.ok) {
      throw new Error(`Suno API error: ${sunoResponse.status}`)
    }

    const sunoData = await sunoResponse.json()

    return NextResponse.json({
      clipId: sunoData.id,
      tags: fused.tagStr,
      make_instrumental: fused.makeInstrumental,
      explain: fused.explain,
    })
  } catch (error) {
    console.error("Team anthem generation error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate team anthem",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"

const SUNO_BASE = "https://studio-api.prod.suno.com/api/v2/external/hackmit"
const SUNO_TOKEN = process.env.SUNO_TOKEN

export async function GET(request: NextRequest, { params }: { params: { clipId: string } }) {
  try {
    if (!SUNO_TOKEN) {
      return NextResponse.json({ error: "Missing SUNO_TOKEN" }, { status: 500 })
    }

    const { clipId } = params

    const response = await fetch(`${SUNO_BASE}/clips?ids=${clipId}`, {
      headers: {
        Authorization: `Bearer ${SUNO_TOKEN}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Suno API error: ${response.status}`)
    }

    const data = await response.json()

    // Return first clip if array, otherwise return as-is
    if (Array.isArray(data) && data.length > 0) {
      return NextResponse.json(data[0])
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Clip fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch clip",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

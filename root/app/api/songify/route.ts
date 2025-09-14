import { type NextRequest, NextResponse } from "next/server"

const SUNO_BASE = "https://studio-api.prod.suno.com/api/v2/external/hackmit"
const SUNO_TOKEN = process.env.SUNO_TOKEN

interface SongifyBody {
  repoUrl: string
  tags?: string
  mood: string
  teamName?: string
}

const MOOD_MAP: Record<string, any> = {
  "lock-in": { tags: ["electronic", "synthwave", "driving"] },
  "debug-spiral": { tags: ["lo-fi", "minimal", "chill"] },
  "help-pls": { tags: ["ambient pop", "uplifting", "light pads"] },
  "free-swag-run": { tags: ["house", "pop", "bright", "groove"] },
  "food-and-yap": { tags: ["bossa nova", "jazzy", "warm", "acoustic"] },
  "monster-energy": { tags: ["dnb", "hard techno", "aggressive"] },
}

async function fetchRepoData(repoUrl: string) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i)
  if (!match) {
    throw new Error("Invalid GitHub URL. Expected https://github.com/owner/repo")
  }

  const [, owner, repo] = match

  // Fetch README
  let readme = ""
  for (const branch of ["main", "master"]) {
    try {
      const readmeRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`)
      if (readmeRes.ok) {
        readme = await readmeRes.text()
        break
      }
    } catch (error) {
      // Try next branch
    }
  }

  // Parse README
  const titleMatch = readme.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : ""

  const blocks = readme.replace(/\r/g, "").split("\n\n")
  const firstPara = blocks.find((block) => block.trim() && !block.startsWith("#")) || ""
  const tldr = firstPara.replace(/[\n\r]+/g, " ").slice(0, 240)

  // Fetch commits
  let commits: string[] = []
  try {
    const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=50`)
    if (commitsRes.ok) {
      const commitsData = await commitsRes.json()
      commits = commitsData
        .map((c: any) => c.commit?.message?.split("\n")[0] || "")
        .filter((msg: string) => msg.length > 0)
    }
  } catch (error) {
    // Ignore API errors, use README only
  }

  return { readmeTitle: title, readmeTLDR: tldr, commits }
}

function buildLyrics(readmeTldr: string, readmeTitle: string, commits: string[]) {
  const chorus = (readmeTldr || readmeTitle || "ship it at HackMIT").slice(0, 120)

  // Filter out boring commits
  const skipPattern = /^(merge|wip|fix typo|bump|ci|chore|update readme)/i
  const cleaned = commits
    .filter((msg) => msg.length >= 8 && !skipPattern.test(msg))
    .map((msg) => msg.replace(/\s+/g, " ").trim())
    .slice(0, 14)

  const v1 =
    cleaned
      .slice(0, 6)
      .map((x) => `- ${x}`)
      .join("\n") || "- first commit, first light"
  const v2 =
    cleaned
      .slice(6, 12)
      .map((x) => `- ${x}`)
      .join("\n") || "- feature flags and hopeful logs"
  const bridge =
    cleaned
      .slice(12, 16)
      .map((x) => `- ${x}`)
      .join("\n") || "- tests are green, deploy at dawn"

  return [
    "[Verse 1]",
    v1,
    "",
    "[Chorus]",
    chorus,
    "build, refactor, iterate — we ship tonight",
    "",
    "[Verse 2]",
    v2,
    "",
    "[Bridge]",
    bridge,
  ].join("\n")
}

export async function POST(request: NextRequest) {
  try {
    if (!SUNO_TOKEN) {
      return NextResponse.json({ error: "Missing SUNO_TOKEN" }, { status: 500 })
    }

    const body: SongifyBody = await request.json()

    // Fetch repo data and build lyrics
    const repo = await fetchRepoData(body.repoUrl)
    const prompt = buildLyrics(repo.readmeTLDR, repo.readmeTitle, repo.commits)

    // Combine mood tags with provided tags
    const moodTags = (MOOD_MAP[body.mood] || MOOD_MAP["lock-in"]).tags.slice(0, 3)
    const providedTags = (body.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t)
    const finalTags = [...new Set([...providedTags, ...moodTags])].slice(0, 6).join(", ")

    // Generate with Suno
    const sunoResponse = await fetch(`${SUNO_BASE}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUNO_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        tags: finalTags,
      }),
    })

    if (!sunoResponse.ok) {
      throw new Error(`Suno API error: ${sunoResponse.status}`)
    }

    const sunoData = await sunoResponse.json()

    return NextResponse.json({
      clipId: sunoData.id,
      tags: finalTags,
      lyricsPreview: prompt.slice(0, 600),
      repoMeta: repo,
      titleHint: repo.readmeTitle || body.teamName || "HackMIT Track",
    })
  } catch (error) {
    console.error("Songify generation error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate repository song",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

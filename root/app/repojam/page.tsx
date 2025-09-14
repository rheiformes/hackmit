"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Github, Music, ArrowLeft, Loader2, ExternalLink, FileText, GitCommit } from "lucide-react"
import Link from "next/link"
import { JamAPI, MOODS, type RepoJamRequest } from "@/lib/api"

export default function RepoJamPage() {
  const [repoUrl, setRepoUrl] = useState("")
  const [customTags, setCustomTags] = useState("")
  const [mood, setMood] = useState("lock-in")
  const [teamName, setTeamName] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<any>(null)
  const [repoPreview, setRepoPreview] = useState<any>(null)

  const handleRepoUrlChange = (url: string) => {
    setRepoUrl(url)
    // Extract repo name for team name if not set
    const match = url.match(/github\.com\/[^/]+\/([^/]+)/)
    if (match && !teamName) {
      setTeamName(match[1].replace(/[-_]/g, " "))
    }
  }

  const handleGenerate = async () => {
    if (!repoUrl.trim()) {
      alert("Please enter a GitHub repository URL")
      return
    }

    console.log("[v0] Starting RepoJam generation")
    setIsGenerating(true)
    try {
      const request: RepoJamRequest = {
        repoUrl: repoUrl.trim(),
        tags: customTags.trim() || undefined,
        mood,
        teamName: teamName.trim() || undefined,
      }

      console.log("[v0] RepoJam request:", request)
      const result = await JamAPI.generateRepoJam(request)
      console.log("[v0] RepoJam result:", result)
      setGenerationResult(result)
      setRepoPreview(result.repoMeta)
    } catch (error) {
      console.error("[v0] Generation failed:", error)
      alert(
        `Failed to generate music: ${error instanceof Error ? error.message : "Please check the repository URL and try again."}`,
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedMood = MOODS.find((m) => m.value === mood)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Github className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">RepoJam</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Description */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">Turn Your Code into Music</h2>
            <p className="text-muted-foreground text-lg">
              Transform your GitHub repository's README and commit messages into a personalized soundtrack
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Configuration Panel */}
            <div className="space-y-6">
              {/* Repository Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="w-5 h-5" />
                    GitHub Repository
                  </CardTitle>
                  <CardDescription>Enter the URL of your GitHub repository</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="repoUrl">Repository URL</Label>
                    <Input
                      id="repoUrl"
                      value={repoUrl}
                      onChange={(e) => handleRepoUrlChange(e.target.value)}
                      placeholder="https://github.com/username/repository"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll analyze your README and recent commit messages to create lyrics
                    </p>
                  </div>

                  {repoUrl && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Github className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-mono flex-1 truncate">{repoUrl}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Music Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Music Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mood">Musical Mood</Label>
                    <Select value={mood} onValueChange={setMood}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MOODS.map((moodOption) => (
                          <SelectItem key={moodOption.value} value={moodOption.value}>
                            <div>
                              <div className="font-medium">{moodOption.label}</div>
                              <div className="text-sm text-muted-foreground">{moodOption.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedMood && <p className="text-sm text-muted-foreground">{selectedMood.description}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customTags">Custom Tags (Optional)</Label>
                    <Input
                      id="customTags"
                      value={customTags}
                      onChange={(e) => setCustomTags(e.target.value)}
                      placeholder="electronic, indie, rock"
                    />
                    <p className="text-sm text-muted-foreground">
                      Comma-separated musical genres or styles to influence the sound
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teamName">Project Name (Optional)</Label>
                    <Input
                      id="teamName"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Auto-filled from repository name"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Generation Panel */}
            <div className="space-y-6">
              {/* Generate Button */}
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleGenerate}
                    disabled={!repoUrl.trim() || isGenerating}
                    className="w-full h-12 text-lg"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing Repository...
                      </>
                    ) : (
                      <>
                        <Music className="w-5 h-5 mr-2" />
                        Generate Repository Song
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Repository Preview */}
              {repoPreview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Repository Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {repoPreview.readmeTitle && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Project Title</p>
                        <p className="font-semibold">{repoPreview.readmeTitle}</p>
                      </div>
                    )}

                    {repoPreview.readmeTLDR && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Description</p>
                        <p className="text-sm">{repoPreview.readmeTLDR}</p>
                      </div>
                    )}

                    {repoPreview.commits && repoPreview.commits.length > 0 && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                          <GitCommit className="w-4 h-4" />
                          Recent Commits ({repoPreview.commits.length})
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {repoPreview.commits.slice(0, 5).map((commit: string, index: number) => (
                            <p key={index} className="text-xs font-mono bg-background p-2 rounded">
                              {commit}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Generation Result */}
              {generationResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="w-5 h-5" />
                      Your Repository Song is Ready!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Clip ID</p>
                      <p className="font-mono text-sm">{generationResult.clipId}</p>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Musical Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {generationResult.tags.split(", ").map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {generationResult.lyricsPreview && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Lyrics Preview</p>
                        <div className="text-sm whitespace-pre-line max-h-32 overflow-y-auto bg-background p-3 rounded font-mono">
                          {generationResult.lyricsPreview}
                        </div>
                      </div>
                    )}

                    <Button className="w-full bg-transparent" variant="outline">
                      <Music className="w-4 h-4 mr-2" />
                      Listen to Your Repository Song
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• README title becomes the main chorus</p>
                  <p>• Commit messages are transformed into verses</p>
                  <p>• Repository description sets the overall theme</p>
                  <p>• Musical mood influences the genre and energy</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

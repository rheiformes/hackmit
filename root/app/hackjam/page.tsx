"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Zap, ArrowLeft, Plus, X, Loader2 } from "lucide-react"
import Link from "next/link"
import { JamAPI, MOODS, type HackJamRequest } from "@/lib/api"
import { SpotifyAuthHandler } from "@/components/spotify-auth-handler"
import { GenerationStatus } from "@/components/generation-status"
import { StreamingSession } from "@/components/streaming-session"

interface ConnectedUser {
  id: string
  accessToken: string
  profile?: {
    display_name: string
    top_genres: string[]
  }
}

export default function HackJamPage() {
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [teamName, setTeamName] = useState("Our Team")
  const [mood, setMood] = useState("lock-in")
  const [insideJokes, setInsideJokes] = useState("")
  const [instrumental, setInstrumental] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("single")

  const handleConnectSpotify = async () => {
    try {
      console.log("[v0] Attempting to get Spotify auth URL")
      const { authorize_url } = await JamAPI.getSpotifyAuthUrl(`hackjam-${Date.now()}`)
      console.log("[v0] Got Spotify auth URL:", authorize_url)
      window.open(authorize_url, "_blank", "width=500,height=600")
    } catch (error) {
      console.error("[v0] Failed to get Spotify auth URL:", error)
      alert(`Failed to connect to Spotify: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleUserConnected = (user: ConnectedUser) => {
    setConnectedUsers((prev) => {
      // Check if user is already connected
      const existingIndex = prev.findIndex((u) => u.id === user.id)
      if (existingIndex >= 0) {
        // Update existing user
        const updated = [...prev]
        updated[existingIndex] = user
        return updated
      } else {
        // Add new user
        return [...prev, user]
      }
    })
  }

  const handleRemoveUser = (userId: string) => {
    setConnectedUsers((prev) => prev.filter((user) => user.id !== userId))
  }

  const handleGenerate = async () => {
    if (connectedUsers.length === 0) {
      alert("Please connect at least one Spotify account")
      return
    }

    console.log("[v0] Starting HackJam generation")
    setIsGenerating(true)
    try {
      const request: HackJamRequest = {
        users: connectedUsers.map((user) => ({ accessToken: user.accessToken })),
        mood,
        teamName,
        insideJokes,
        instrumental,
      }

      console.log("[v0] HackJam request:", request)
      const result = await JamAPI.generateHackJam(request)
      console.log("[v0] HackJam result:", result)
      setGenerationResult(result)
    } catch (error) {
      console.error("[v0] Generation failed:", error)
      alert(`Failed to generate music: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedMood = MOODS.find((m) => m.value === mood)

  return (
    <div className="min-h-screen bg-background">
      <SpotifyAuthHandler onUserConnected={handleUserConnected} />

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
                <Users className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">HackJam</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Description */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">Create Your Team Anthem</h2>
            <p className="text-muted-foreground text-lg">
              Connect your team's Spotify accounts and let AI fuse your musical tastes with hackathon vibes
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Configuration Panel */}
            <div className="space-y-6">
              {/* Spotify Connections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Members ({connectedUsers.length}/3)
                  </CardTitle>
                  <CardDescription>Connect 1-3 Spotify accounts to analyze musical taste</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {connectedUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{user.profile?.display_name || "Spotify User"}</p>
                        {user.profile?.top_genres && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.profile.top_genres.slice(0, 3).map((genre) => (
                              <Badge key={genre} variant="secondary" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveUser(user.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {connectedUsers.length < 3 && (
                    <Button onClick={handleConnectSpotify} className="w-full bg-transparent" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Connect Spotify Account
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Team Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input
                      id="teamName"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Enter your team name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mood">Hackathon Mood</Label>
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
                    <Label htmlFor="insideJokes">Inside Jokes (Optional)</Label>
                    <Textarea
                      id="insideJokes"
                      value={insideJokes}
                      onChange={(e) => setInsideJokes(e.target.value)}
                      placeholder="Any team inside jokes or references to include?"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="instrumental">Instrumental Only</Label>
                      <p className="text-sm text-muted-foreground">Generate music without vocals</p>
                    </div>
                    <Switch id="instrumental" checked={instrumental} onCheckedChange={setInstrumental} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Generation Panel */}
            <div className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single">Single Track</TabsTrigger>
                  <TabsTrigger value="session">Live Session</TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="space-y-6">
                  {/* Generate Button */}
                  <Card>
                    <CardContent className="pt-6">
                      <Button
                        onClick={handleGenerate}
                        disabled={connectedUsers.length === 0 || isGenerating}
                        className="w-full h-12 text-lg"
                        size="lg"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Generating Your Anthem...
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5 mr-2" />
                            Generate Team Anthem
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Generation Result */}
                  {generationResult && (
                    <GenerationStatus
                      clipId={generationResult.clipId}
                      title={`${teamName} Anthem`}
                      tags={generationResult.tags}
                      onComplete={(result) => {
                        console.log("Generation complete:", result)
                      }}
                      onError={(error) => {
                        console.error("Generation error:", error)
                      }}
                    />
                  )}
                </TabsContent>

                <TabsContent value="session" className="space-y-6">
                  <StreamingSession
                    users={connectedUsers}
                    mood={mood}
                    teamName={teamName}
                    insideJokes={insideJokes}
                    instrumental={instrumental}
                    maxTracks={5}
                    maxMinutes={10}
                  />
                </TabsContent>
              </Tabs>

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pro Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Connect multiple accounts for richer musical fusion</p>
                  <p>• Try different moods to match your hackathon energy</p>
                  <p>• Add inside jokes for personalized lyrics</p>
                  <p>• Use Live Session for continuous background music</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

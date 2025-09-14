"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Play, Square, Music, Users, Zap } from "lucide-react"
import { useGenerationStream } from "@/hooks/use-generation-stream"
import { AudioPlayer } from "./audio-player"

interface StreamingSessionProps {
  users: any[]
  mood: string
  teamName: string
  insideJokes?: string
  instrumental?: boolean
  maxTracks?: number
  maxMinutes?: number
}

export function StreamingSession({
  users,
  mood,
  teamName,
  insideJokes,
  instrumental,
  maxTracks = 5,
  maxMinutes = 10,
}: StreamingSessionProps) {
  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionStats, setSessionStats] = useState({ tracksGenerated: 0, timeElapsed: 0 })

  const { isStreaming, tracks, currentTrack, sessionInfo, startStream, stopStream } = useGenerationStream({
    onTrackUpdate: (track) => {
      console.log("Track update:", track)
    },
    onSessionEnd: (tracksGenerated) => {
      setSessionStats((prev) => ({ ...prev, tracksGenerated }))
      setSessionStarted(false)
    },
    onError: (error) => {
      console.error("Stream error:", error)
      alert(`Stream error: ${error}`)
      setSessionStarted(false)
    },
  })

  const handleStartSession = async () => {
    if (users.length === 0) {
      alert("Please connect at least one Spotify account")
      return
    }

    setSessionStarted(true)
    setSessionStats({ tracksGenerated: 0, timeElapsed: 0 })

    const requestBody = {
      users: users.map((user) => ({ accessToken: user.accessToken })),
      mood,
      teamName,
      insideJokes: insideJokes || "",
      instrumental,
      maxTracks,
      maxMinutes,
      delayBetweenSec: 2.0,
      saveEach: false,
    }

    await startStream("/api/hackjam-stream", requestBody)
  }

  const handleStopSession = () => {
    stopStream()
    setSessionStarted(false)
  }

  return (
    <div className="space-y-6">
      {/* Session Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Continuous Generation Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">
                {teamName} • {mood} mode
              </p>
              <p className="text-sm text-muted-foreground">
                {users.length} member{users.length !== 1 ? "s" : ""} • Up to {maxTracks} tracks • {maxMinutes} min
                session
              </p>
            </div>

            {!sessionStarted ? (
              <Button onClick={handleStartSession} disabled={users.length === 0} size="lg">
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            ) : (
              <Button onClick={handleStopSession} variant="destructive" size="lg">
                <Square className="w-4 h-4 mr-2" />
                Stop Session
              </Button>
            )}
          </div>

          {sessionInfo && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Session Tags</p>
              <div className="flex flex-wrap gap-1">
                {sessionInfo.tags?.split(", ").map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {isStreaming && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Session Progress</span>
                <span>
                  {tracks.length}/{maxTracks} tracks
                </span>
              </div>
              <Progress value={(tracks.length / maxTracks) * 100} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Track Being Generated */}
      {currentTrack && isStreaming && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Track {currentTrack.index} - {currentTrack.stage}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentTrack.stage === "streaming" && currentTrack.stream_url && (
              <AudioPlayer
                title={currentTrack.title || `Track ${currentTrack.index}`}
                streamUrl={currentTrack.stream_url}
                imageUrl={currentTrack.image_url}
                tags={sessionInfo?.tags}
                clipId={currentTrack.clipId || ""}
                isGenerating={true}
              />
            )}

            {currentTrack.stage === "complete" && currentTrack.audio_url && (
              <AudioPlayer
                title={currentTrack.title || `Track ${currentTrack.index}`}
                audioUrl={currentTrack.audio_url}
                imageUrl={currentTrack.image_url}
                duration={currentTrack.duration}
                tags={sessionInfo?.tags}
                clipId={currentTrack.clipId || ""}
              />
            )}

            {currentTrack.stage === "submitted" && (
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Analyzing musical preferences...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generated Tracks */}
      {tracks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generated Tracks ({tracks.length})</h3>
          {tracks.map((track, index) => (
            <AudioPlayer
              key={track.clipId}
              title={track.title || `Track ${track.index}`}
              audioUrl={track.audio_url}
              imageUrl={track.image_url}
              duration={track.duration}
              tags={sessionInfo?.tags}
              clipId={track.clipId || ""}
            />
          ))}
        </div>
      )}

      {/* Session Stats */}
      {sessionStats.tracksGenerated > 0 && !isStreaming && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Session Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{sessionStats.tracksGenerated}</p>
                <p className="text-sm text-muted-foreground">Tracks Generated</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{Math.round(sessionStats.timeElapsed / 60)}m</p>
                <p className="text-sm text-muted-foreground">Session Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

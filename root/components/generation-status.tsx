"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, Music, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { JamAPI } from "@/lib/api"
import { AudioPlayer } from "./audio-player"

interface GenerationStatusProps {
  clipId: string
  title?: string
  tags?: string
  onComplete?: (result: any) => void
  onError?: (error: string) => void
}

type GenerationStatus = "submitted" | "streaming" | "complete" | "error"

export function GenerationStatus({ clipId, title, tags, onComplete, onError }: GenerationStatusProps) {
  const [status, setStatus] = useState<GenerationStatus>("submitted")
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    let progressInterval: NodeJS.Timeout

    const pollStatus = async () => {
      try {
        const clipData = await JamAPI.getClip(clipId)
        const clipStatus = clipData.status?.toLowerCase()

        if (clipStatus === "complete") {
          setStatus("complete")
          setProgress(100)
          setResult(clipData)
          onComplete?.(clipData)
          clearInterval(interval)
          clearInterval(progressInterval)
        } else if (clipStatus === "streaming") {
          setStatus("streaming")
          setProgress(75)
          setResult(clipData)
        } else if (clipStatus === "error" || clipStatus === "failed") {
          setStatus("error")
          setError("Generation failed. Please try again.")
          onError?.("Generation failed")
          clearInterval(interval)
          clearInterval(progressInterval)
        }
      } catch (err) {
        console.error("Failed to poll status:", err)
        setStatus("error")
        setError("Failed to check generation status")
        onError?.("Failed to check status")
        clearInterval(interval)
        clearInterval(progressInterval)
      }
    }

    // Start polling
    interval = setInterval(pollStatus, 3000)
    pollStatus() // Initial check

    // Progress simulation
    progressInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
      setProgress((prev) => {
        if (status === "complete") return 100
        if (status === "streaming") return Math.min(prev + 1, 75)
        return Math.min(prev + 2, 60) // Slower progress until streaming
      })
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(progressInterval)
    }
  }, [clipId, status, onComplete, onError])

  const getStatusIcon = () => {
    switch (status) {
      case "submitted":
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />
      case "streaming":
        return <Music className="w-5 h-5 text-primary" />
      case "complete":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case "submitted":
        return "Analyzing musical preferences..."
      case "streaming":
        return "Generating your track..."
      case "complete":
        return "Your music is ready!"
      case "error":
        return error || "Generation failed"
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "submitted":
      case "streaming":
        return "default"
      case "complete":
        return "default"
      case "error":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (status === "complete" && result) {
    return (
      <AudioPlayer
        title={result.title || title || "Generated Track"}
        audioUrl={result.audio_url}
        streamUrl={result.stream_url}
        imageUrl={result.image_url}
        duration={result.duration}
        tags={tags}
        clipId={clipId}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Generation Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
          <span className="text-sm text-muted-foreground">{formatTime(elapsedTime)}</span>
        </div>

        <Progress value={progress} className="w-full" />

        <div className="text-sm text-muted-foreground space-y-1">
          <p>Clip ID: {clipId}</p>
          {tags && <p>Tags: {tags}</p>}
        </div>

        {status === "streaming" && result?.stream_url && (
          <div className="pt-4">
            <AudioPlayer
              title={result.title || title || "Preview"}
              streamUrl={result.stream_url}
              imageUrl={result.image_url}
              tags={tags}
              clipId={clipId}
              isGenerating={true}
            />
          </div>
        )}

        {status === "error" && (
          <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

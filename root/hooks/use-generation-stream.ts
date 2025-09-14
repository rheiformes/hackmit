"use client"

import { useState, useCallback } from "react"

interface StreamEvent {
  type: "session" | "track" | "error"
  event?: "start" | "end"
  stage?: "submitted" | "streaming" | "complete"
  clipId?: string
  index?: number
  title?: string
  stream_url?: string
  audio_url?: string
  image_url?: string
  duration?: number
  tags?: string
  explain?: any
  tracks_done?: number
  message?: string
}

interface UseGenerationStreamProps {
  onTrackUpdate?: (track: StreamEvent) => void
  onSessionEnd?: (tracksGenerated: number) => void
  onError?: (error: string) => void
}

export function useGenerationStream({ onTrackUpdate, onSessionEnd, onError }: UseGenerationStreamProps = {}) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [tracks, setTracks] = useState<StreamEvent[]>([])
  const [currentTrack, setCurrentTrack] = useState<StreamEvent | null>(null)
  const [sessionInfo, setSessionInfo] = useState<{ tags?: string; explain?: any } | null>(null)

  const startStream = useCallback(
    async (endpoint: string, requestBody: any) => {
      if (isStreaming) return

      setIsStreaming(true)
      setTracks([])
      setCurrentTrack(null)
      setSessionInfo(null)

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787"
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          throw new Error(`Stream failed: ${response.status} ${response.statusText}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("No response body reader available")
        }

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const eventData: StreamEvent = JSON.parse(line.slice(6))

                if (eventData.type === "session") {
                  if (eventData.event === "start") {
                    setSessionInfo({
                      tags: eventData.tags,
                      explain: eventData.explain,
                    })
                  } else if (eventData.event === "end") {
                    setIsStreaming(false)
                    onSessionEnd?.(eventData.tracks_done || 0)
                  }
                } else if (eventData.type === "track") {
                  setCurrentTrack(eventData)
                  onTrackUpdate?.(eventData)

                  if (eventData.stage === "complete") {
                    setTracks((prev) => {
                      const existingIndex = prev.findIndex((t) => t.clipId === eventData.clipId)
                      if (existingIndex >= 0) {
                        const updated = [...prev]
                        updated[existingIndex] = eventData
                        return updated
                      }
                      return [...prev, eventData]
                    })
                  }
                } else if (eventData.type === "error") {
                  onError?.(eventData.message || "Stream error occurred")
                  setIsStreaming(false)
                  break
                }
              } catch (parseError) {
                console.error("Failed to parse stream event:", parseError)
              }
            }
          }
        }
      } catch (error) {
        console.error("Stream error:", error)
        onError?.(error instanceof Error ? error.message : "Stream failed")
        setIsStreaming(false)
      }
    },
    [isStreaming, onTrackUpdate, onSessionEnd, onError],
  )

  const stopStream = useCallback(() => {
    setIsStreaming(false)
  }, [])

  return {
    isStreaming,
    tracks,
    currentTrack,
    sessionInfo,
    startStream,
    stopStream,
  }
}

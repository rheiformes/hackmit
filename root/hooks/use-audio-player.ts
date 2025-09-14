"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface UseAudioPlayerProps {
  src?: string
  autoPlay?: boolean
  loop?: boolean
  volume?: number
}

export function useAudioPlayer({ src, autoPlay = false, loop = false, volume = 1 }: UseAudioPlayerProps = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize audio element
  useEffect(() => {
    if (typeof window === "undefined") return

    const audio = new Audio()
    audio.preload = "metadata"
    audio.crossOrigin = "anonymous"
    audioRef.current = audio

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration)
    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleEnded = () => setIsPlaying(false)
    const handleError = () => {
      setError("Failed to load audio")
      setIsLoading(false)
      setIsPlaying(false)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("loadstart", handleLoadStart)
    audio.addEventListener("canplay", handleCanPlay)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)

    // Set initial properties
    audio.loop = loop
    audio.volume = volume

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("durationchange", handleDurationChange)
      audio.removeEventListener("loadstart", handleLoadStart)
      audio.removeEventListener("canplay", handleCanPlay)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
      audio.pause()
    }
  }, [loop, volume])

  // Update src when it changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !src) return

    setError(null)
    audio.src = src

    if (autoPlay) {
      play()
    }
  }, [src, autoPlay])

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    try {
      await audio.play()
      setIsPlaying(true)
      setError(null)
    } catch (err) {
      setError("Failed to play audio")
      setIsPlaying(false)
    }
  }, [])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    setIsPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current
      if (!audio) return

      audio.currentTime = Math.max(0, Math.min(time, duration))
    },
    [duration],
  )

  const setVolume = useCallback((vol: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = Math.max(0, Math.min(vol, 1))
  }, [])

  const mute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = !audio.muted
  }, [])

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,

    // Controls
    play,
    pause,
    toggle,
    seek,
    setVolume,
    mute,

    // Audio element ref
    audioRef,
  }
}

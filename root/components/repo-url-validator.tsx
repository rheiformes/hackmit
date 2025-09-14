"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface RepoUrlValidatorProps {
  url: string
  onValidationChange: (isValid: boolean) => void
}

export function RepoUrlValidator({ url, onValidationChange }: RepoUrlValidatorProps) {
  const [status, setStatus] = useState<"idle" | "valid" | "invalid" | "checking">("idle")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!url.trim()) {
      setStatus("idle")
      onValidationChange(false)
      return
    }

    const validateUrl = () => {
      // Basic GitHub URL validation
      const githubUrlPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/

      if (!githubUrlPattern.test(url.trim())) {
        setStatus("invalid")
        setMessage("Please enter a valid GitHub repository URL")
        onValidationChange(false)
        return
      }

      setStatus("valid")
      setMessage("Valid GitHub repository URL")
      onValidationChange(true)
    }

    const timeoutId = setTimeout(validateUrl, 500)
    return () => clearTimeout(timeoutId)
  }, [url, onValidationChange])

  if (status === "idle") return null

  const getIcon = () => {
    switch (status) {
      case "valid":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "invalid":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "checking":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getVariant = () => {
    switch (status) {
      case "valid":
        return "default" as const
      case "invalid":
        return "destructive" as const
      default:
        return "secondary" as const
    }
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      {getIcon()}
      <Badge variant={getVariant()} className="text-xs">
        {message}
      </Badge>
    </div>
  )
}

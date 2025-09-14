"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music, Github, Users, Zap, Sparkles, Headphones } from "lucide-react"
import Link from "next/link"
import { StrawberryAccent, JamJarAccent } from "@/components/strawberry-accent"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Accents */}
      <StrawberryAccent className="top-20 right-10 rotate-12" />
      <JamJarAccent className="bottom-32 left-8 -rotate-6" />
      <StrawberryAccent className="top-1/3 left-1/4 rotate-45 scale-75" />

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg">
                <Music className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Jam</h1>
                <p className="text-xs text-muted-foreground">Music for Hackers</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#hackjam" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                HackJam
              </Link>
              <Link href="#repojam" className="text-muted-foreground hover:text-primary transition-colors font-medium">
                RepoJam
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Music Generation
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
            Music Generator for <span className="text-primary">Hackers</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty leading-relaxed">
            Transform your Spotify taste and GitHub repos into personalized soundtracks. Perfect for hackathons, coding
            sessions, and shipping with style.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg">
              <Music className="w-4 h-4 mr-2" />
              Start Creating
            </Button>
            <Button size="lg" variant="outline" className="border-2 hover:bg-accent/5 bg-transparent">
              <Github className="w-4 h-4 mr-2" />
              View on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-gradient-to-b from-card/30 to-background relative z-10">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">Two Flavors of Musical Magic</h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Whether you're jamming with your team or celebrating your code, we've got the perfect soundtrack
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* HackJam Card */}
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">HackJam</CardTitle>
                    <CardDescription className="text-base">Team vibes, personalized</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Connect 1-3 Spotify accounts and choose your mood (lock-in, debug-spiral, free-swag-run) to generate
                  the perfect team anthem. Features continuous session mode for non-stop vibes.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm font-medium">
                    lock-in
                  </span>
                  <span className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm font-medium">
                    debug-spiral
                  </span>
                  <span className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm font-medium">
                    monster-energy
                  </span>
                </div>
                <Link href="/hackjam">
                  <Button className="w-full group-hover:bg-primary/90 transition-colors">
                    <Zap className="w-4 h-4 mr-2" />
                    Try HackJam
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* RepoJam Card */}
            <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl flex items-center justify-center">
                    <Github className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">RepoJam</CardTitle>
                    <CardDescription className="text-base">Your code, your soundtrack</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Transform your README and commit messages into song lyrics, then generate a matching track. Give your
                  projects their own soundtrack and ship with style.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm font-medium">
                    README → Lyrics
                  </span>
                  <span className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm font-medium">
                    Commits → Verses
                  </span>
                </div>
                <Link href="/repojam">
                  <Button className="w-full bg-transparent group-hover:bg-accent/10" variant="outline">
                    <Github className="w-4 h-4 mr-2" />
                    Try RepoJam
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 relative z-10">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">How the Magic Happens</h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powered by AI and your unique digital fingerprint
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-2">Analyze Your Taste</h4>
              <p className="text-muted-foreground">
                Jam analyzes your Spotify listening history and GitHub activity to understand your unique style
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-2">AI Generation</h4>
              <p className="text-muted-foreground">
                Jam fuses your musical preferences with hackathon vibes to create something uniquely yours
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-2">Instant Playback</h4>
              <p className="text-muted-foreground">
                Stream your track immediately while it's generating, then download the final high-quality version
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-card/30 relative z-10">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <Music className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Jam</span>
          </div>
          <p className="text-muted-foreground mb-4">
            Built for hackers, by a hacker. Made with love for HackMIT and the developer community.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

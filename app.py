import os
import re
from typing import List, Dict, Any, Optional

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import time
import pathlib

import base64
from urllib.parse import urlencode

import json
from fastapi.responses import StreamingResponse



# --- env & constants ---
load_dotenv()
SUNO_BASE = "https://studio-api.prod.suno.com/api/v2/external/hackmit"
SUNO_TOKEN = os.getenv("SUNO_TOKEN")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
PORT = int(os.getenv("PORT", "8787"))

if not SUNO_TOKEN:
    raise RuntimeError("Missing SUNO_TOKEN in environment")

# --- app setup ---
app = FastAPI(title="HackTrack Studio Backend (Python)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # loosen for hackathon convenience
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- models ---
class SpotifyUser(BaseModel):
    accessToken: str

class TeamAnthemBody(BaseModel):
    users: List[SpotifyUser]
    mood: str = "lock-in"
    teamName: str = "our team"
    insideJokes: str = ""
    instrumental: Optional[bool] = None 


class SongifyBody(BaseModel):
    repoUrl: str
    tags: Optional[str] = None
    mood: str = "lock-in"
    teamName: Optional[str] = None

# --- helpers ---
def jfetch(method: str, url: str, **kwargs) -> Any:
    """requests wrapper that raises nice errors and returns JSON"""
    resp = requests.request(method, url, timeout=30, **kwargs)
    try:
        data = resp.json() if resp.text else {}
    except Exception:
        data = {"raw": resp.text}
    if not resp.ok:
        msg = data.get("detail") if isinstance(data, dict) else str(data)
        raise HTTPException(status_code=resp.status_code, detail=f"{url} -> {msg}")
    return data

def fetch_spotify_taste(access_token: str) -> Dict[str, Any]:
    headers = {"Authorization": f"Bearer {access_token}"}

    # top artists --> genres
    artists = jfetch("GET", "https://api.spotify.com/v1/me/top/artists?limit=20&time_range=short_term", headers=headers)
    genres: List[str] = []
    for a in artists.get("items", []) or []:
        for g in a.get("genres", []) or []:
            if g:
                genres.append(g.lower())

    # top tracks --> audio-features centroid (robust)
    tracks = jfetch("GET", "https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term", headers=headers)
    raw_ids = [t.get("id") for t in (tracks.get("items") or [])]
    ids = [i for i in raw_ids if isinstance(i, str) and len(i) == 22 and i.isalnum()]

    features = {"tempo": 0.0, "energy": 0.0, "danceability": 0.0, "valence": 0.0, "count": 0}
    if ids:
        for i in range(0, len(ids), 100):
            chunk = ids[i:i+100]
            try:
                af = jfetch("GET", "https://api.spotify.com/v1/audio-features",
                            headers=headers, params={"ids": ",".join(chunk)})
            except HTTPException:
                continue
            for f in af.get("audio_features") or []:
                if not f:
                    continue
                features["tempo"] += f.get("tempo") or 0.0
                features["energy"] += f.get("energy") or 0.0
                features["danceability"] += f.get("danceability") or 0.0
                features["valence"] += f.get("valence") or 0.0
                features["count"] += 1

    # Fallback: if new accounts have no top data, use recently played
    if not genres and features["count"] == 0:
        recent = fetch_recent_genres_and_features(access_token)
        genres = recent["genres"]
        features = recent["features"]

    if features["count"] > 0:
        for k in ("tempo", "energy", "danceability", "valence"):
            features[k] /= features["count"]
    
    # If we still have no features but we DO have genres, estimate via recommendations
    if features["count"] == 0 and genres:
        rec_feats = features_from_recommendations(access_token, genres)
        if rec_feats["count"] > 0:
            features = rec_feats

    # final safety defaults so generation always has something to lean on (edge case sholdn't be reached tho??)
    if features["count"] == 0:
        features = {"tempo": 110.0, "energy": 0.55, "danceability": 0.55, "valence": 0.5, "count": 1}


    return {"genres": genres, "features": features}


MOOD_MAP: Dict[str, Dict[str, Any]] = {
    "lock-in":        {"tags": ["electronic", "synthwave", "driving"],        "delta": {"tempo": +10, "energy": +0.2,  "danceability": +0.1},  "instrumental": True},
    "debug-spiral":   {"tags": ["lo-fi", "minimal", "chill"],                  "delta": {"tempo": -15, "energy": -0.2, "danceability": -0.05}, "instrumental": True},
    "help-pls":       {"tags": ["ambient pop", "uplifting", "light pads"],     "delta": {"tempo": 0,   "energy": +0.05,"danceability": 0.0},   "instrumental": False},
    "free-swag-run":  {"tags": ["house", "pop", "bright", "groove"],           "delta": {"tempo": +20, "energy": +0.25,"danceability": +0.2},  "instrumental": False},
    "food-and-yap":   {"tags": ["bossa nova", "jazzy", "warm", "acoustic"],    "delta": {"tempo": 0,   "energy": -0.05,"danceability": +0.05}, "instrumental": False},
    "monster-energy": {"tags": ["dnb", "hard techno", "aggressive"],           "delta": {"tempo": +30, "energy": +0.35,"danceability": +0.1},  "instrumental": False},
}

def fuse_tags(per_user: List[Dict[str, Any]], mood: str, force_instrumental: Optional[bool]) -> Dict[str, Any]:
    #genre tallies
    freq: Dict[str, int] = {}
    for u in per_user:
        seen = set()
        for g in u.get("genres", []):
            if not g:
                continue
            key = g.strip().lower()
            if key and key not in seen:
                seen.add(key)
                freq[key] = freq.get(key, 0) + 1

    top_genres = [g for g, _ in sorted(freq.items(), key=lambda kv: kv[1], reverse=True)[:4]]

    # mood and instrumental
    mood_cfg = MOOD_MAP.get(mood, MOOD_MAP["lock-in"])
    tags = list(dict.fromkeys(top_genres + mood_cfg["tags"]))  # dedup keep order
    make_instrumental = mood_cfg["instrumental"] if force_instrumental is None else bool(force_instrumental)

    # 3) averaged features + mood deltas (just for explain)
    agg = {"tempo": 0.0, "energy": 0.0, "danceability": 0.0, "valence": 0.0, "n": 0}
    for u in per_user:
        f = u.get("features", {})
        if f.get("count", 0) > 0:
            agg["tempo"] += f.get("tempo", 0.0)
            agg["energy"] += f.get("energy", 0.0)
            agg["danceability"] += f.get("danceability", 0.0)
            agg["valence"] += f.get("valence", 0.0)
            agg["n"] += 1
    if agg["n"] > 0:
        agg["tempo"] /= agg["n"]
        agg["energy"] /= agg["n"]
        agg["danceability"] /= agg["n"]
        agg["valence"] /= agg["n"]

    delta = mood_cfg.get("delta", {"tempo": 0, "energy": 0, "danceability": 0})
    adjusted = {
        "tempo": max(60, min(200, round((agg["tempo"] or 110) + (delta.get("tempo") or 0)))),
        "energy": max(0, min(1, (agg["energy"] or 0.5) + (delta.get("energy") or 0))),
        "danceability": max(0, min(1, (agg["danceability"] or 0.5) + (delta.get("danceability") or 0))),
        "valence": agg["valence"] or 0.5,
    }

    # rip suno tag limit <100 chars :((
    tag_str = ", ".join(tags[:6])
    return {"tagStr": tag_str, "makeInstrumental": make_instrumental, "explain": {"topGenres": top_genres[:4], "adjusted": adjusted}}

def parse_readme(md: str) -> Dict[str, str]:
    if not md:
        return {"title": "", "tldr": ""}
    m = re.search(r"^#\s+(.+)$", md, flags=re.MULTILINE)
    title = (m.group(1).strip() if m else "")
    # first paragraph that isn't a header??
    blocks = [b.strip() for b in md.replace("\r", "").split("\n\n")]
    first_para = next((b for b in blocks if b and not b.startswith("#")), "")
    tldr = re.sub(r"[\n\r]+", " ", first_para)[:240]
    return {"title": title, "tldr": tldr}

def fetch_repo_data(repo_url: str) -> Dict[str, Any]:
    m = re.search(r"github\.com/([^/]+)/([^/#?]+)", repo_url, flags=re.I)
    if not m:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL. Expect https://github.com/owner/repo")
    owner, repo = m.group(1), m.group(2)

    headers_raw = {"Authorization": f"Bearer {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
    readme = ""
    for branch in ("main", "master"):
        url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/README.md"
        r = requests.get(url, headers=headers_raw, timeout=20)
        if r.ok:
            readme = r.text
            break

    api_headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        api_headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"

    commits = []
    try:
        data = jfetch("GET", f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=50", headers=api_headers)
        commits = [ (c.get("commit", {}) or {}).get("message","").split("\n")[0] for c in (data or []) if c.get("commit") ]
        commits = [c for c in commits if c]
    except HTTPException:
        # ignore if rate-limited or not found just use readme and deal with this later oop
        pass

    meta = parse_readme(readme)
    return {"readmeTitle": meta["title"], "readmeTLDR": meta["tldr"], "commits": commits}

def build_lyrics(readme_tldr: str, readme_title: str, commits: List[str]) -> str:
    chorus = (readme_tldr or readme_title or "ship it at HackMIT").strip()[:120]
    cleaned = []
    skip = re.compile(r"^(merge|wip|fix typo|bump|ci|chore|update readme)", re.I)
    for m in commits or []:
        if len(m) < 8:
            continue
        if skip.match(m):
            continue
        cleaned.append(re.sub(r"\s+", " ", m).strip())
        if len(cleaned) >= 14:
            break

    v1 = "\n".join(f"- {x}" for x in cleaned[:6]) or "- first commit, first light"
    v2 = "\n".join(f"- {x}" for x in cleaned[6:12]) or "- feature flags and hopeful logs"
    bridge = "\n".join(f"- {x}" for x in cleaned[12:16]) or "- tests are green, deploy at dawn"

    return "\n".join([
        "[Verse 1]",
        v1, "",
        "[Chorus]",
        chorus,
        "build, refactor, iterate — we ship tonight", "",
        "[Verse 2]",
        v2, "",
        "[Bridge]",
        bridge
    ])

def wait_for_complete_clip(clip_id: str, timeout_sec: int = 180, interval_sec: int = 5):
    """Poll Suno /clips until status == 'complete' or timeout. Returns clip dict (may be non-complete on timeout)."""
    deadline = time.time() + max(5, timeout_sec)
    headers = {"Authorization": f"Bearer {SUNO_TOKEN}"}
    last = None
    while time.time() < deadline:
        data = jfetch("GET", f"{SUNO_BASE}/clips", headers=headers, params={"ids": clip_id})
        last = data[0] if isinstance(data, list) and data else data
        if last and last.get("status") == "complete":
            return last
        time.sleep(max(1, interval_sec))
    return last or {}


SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "")

def _spotify_basic_auth_header():
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Missing Spotify client credentials in env")
    token_bytes = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode("utf-8")
    b64 = base64.b64encode(token_bytes).decode("utf-8")
    return {"Authorization": f"Basic {b64}"}

def spotify_authorize_url(state: str = "hacktrack", scopes: str = "user-top-read user-read-email user-read-recently-played"):
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI")
    params = {
        "client_id": SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "scope": scopes,
        "state": state,
        "show_dialog": "true",
    }
    return "https://accounts.spotify.com/authorize?" + urlencode(params)

def spotify_exchange_code(code: str):
    headers = {"Content-Type": "application/x-www-form-urlencoded", **_spotify_basic_auth_header()}
    data = {"grant_type": "authorization_code", "code": code, "redirect_uri": SPOTIFY_REDIRECT_URI}
    return jfetch("POST", "https://accounts.spotify.com/api/token", headers=headers, data=data)

def spotify_refresh(refresh_token: str):
    headers = {"Content-Type": "application/x-www-form-urlencoded", **_spotify_basic_auth_header()}
    data = {"grant_type": "refresh_token", "refresh_token": refresh_token}
    return jfetch("POST", "https://accounts.spotify.com/api/token", headers=headers, data=data)

def summarize_spotify_taste(access_token: str):
    headers = {"Authorization": f"Bearer {access_token}"}
    me = jfetch("GET", "https://api.spotify.com/v1/me", headers=headers)
    taste = fetch_spotify_taste(access_token)  

    # top 5 genres by frequency
    freq = {}
    for g in taste["genres"]:
        if not g: continue
        k = g.lower().strip()
        freq[k] = freq.get(k, 0) + 1
    top_genres = [g for g,_ in sorted(freq.items(), key=lambda kv: kv[1], reverse=True)[:5]]

    return {
        "profile": {
            "id": me.get("id"),
            "display_name": me.get("display_name"),
            "email": me.get("email"),
            "country": me.get("country"),
            "product": me.get("product"),
        },
        "top_genres": top_genres,
        "features_centroid": taste.get("features"),
    }

def fetch_recent_genres_and_features(access_token: str) -> Dict[str, Any]:
    """Use recently played tracks to infer genres (via artist genres) and compute features centroid."""
    headers = {"Authorization": f"Bearer {access_token}"}
    #  this will be <= 50 recently played tracks
    recent = jfetch("GET", "https://api.spotify.com/v1/me/player/recently-played",
                    headers=headers, params={"limit": 50})

    items = recent.get("items") or []
    if not items:
        return {"genres": [], "features": {"tempo": 0.0, "energy": 0.0, "danceability": 0.0, "valence": 0.0, "count": 0}}

    track_ids, artist_ids = [], []
    for it in items:
        tr = (it.get("track") or {})
        tid = tr.get("id")
        if isinstance(tid, str) and len(tid) == 22 and tid.isalnum():
            track_ids.append(tid)
        for ar in tr.get("artists") or []:
            aid = ar.get("id")
            if isinstance(aid, str) and len(aid) == 22 and aid.isalnum():
                artist_ids.append(aid)

    # dedup vals
    track_ids = list(dict.fromkeys(track_ids))
    artist_ids = list(dict.fromkeys(artist_ids))

    # batch fetch artists --> genres
    genres: List[str] = []
    for i in range(0, len(artist_ids), 50):
        chunk = artist_ids[i:i+50]
        try:
            arts = jfetch("GET", "https://api.spotify.com/v1/artists",
                          headers=headers, params={"ids": ",".join(chunk)})
        except HTTPException:
            continue
        for a in arts.get("artists") or []:
            for g in (a.get("genres") or []):
                if g:
                    genres.append(g.lower())

    # audio feats centroid from recent tracks
    features = {"tempo": 0.0, "energy": 0.0, "danceability": 0.0, "valence": 0.0, "count": 0}
    for i in range(0, len(track_ids), 100):
        chunk = track_ids[i:i+100]
        try:
            af = jfetch("GET", "https://api.spotify.com/v1/audio-features",
                        headers=headers, params={"ids": ",".join(chunk)})
        except HTTPException:
            continue
        for f in af.get("audio_features") or []:
            if not f:
                continue
            features["tempo"] += f.get("tempo") or 0.0
            features["energy"] += f.get("energy") or 0.0
            features["danceability"] += f.get("danceability") or 0.0
            features["valence"] += f.get("valence") or 0.0
            features["count"] += 1

    if features["count"] > 0:
        for k in ("tempo", "energy", "danceability", "valence"):
            features[k] /= features["count"]

    return {"genres": genres, "features": features}


def features_from_recommendations(access_token: str, genres: List[str]) -> Dict[str, Any]:
    """Approximate features by asking Spotify for recs seeded by genres, then averaging audio features."""
    if not genres:
        return {"tempo": 0.0, "energy": 0.0, "danceability": 0.0, "valence": 0.0, "count": 0}
    headers = {"Authorization": f"Bearer {access_token}"}
    seeds = list(dict.fromkeys([g.split()[0].lower() for g in genres]))[:5]  # 1-word seeds, max 5
    try:
        rec = jfetch("GET", "https://api.spotify.com/v1/recommendations",
                     headers=headers, params={"seed_genres": ",".join(seeds), "limit": 50})
    except HTTPException:
        return {"tempo": 0.0, "energy": 0.0, "danceability": 0.0, "valence": 0.0, "count": 0}

    ids = [ (t.get("id") or "") for t in (rec.get("tracks") or []) if isinstance(t.get("id"), str) ]
    ids = [i for i in ids if len(i) == 22 and i.isalnum()]
    if not ids:
        return {"tempo": 0.0, "energy": 0.0, "danceability": 0.0, "valence": 0.0, "count": 0}

    feats = {"tempo": 0.0, "energy": 0.0, "danceability": 0.0, "valence": 0.0, "count": 0}
    for i in range(0, len(ids), 100):
        chunk = ids[i:i+100]
        try:
            af = jfetch("GET", "https://api.spotify.com/v1/audio-features",
                        headers=headers, params={"ids": ",".join(chunk)})
        except HTTPException:
            continue
        for f in af.get("audio_features") or []:
            if not f: continue
            feats["tempo"] += f.get("tempo") or 0.0
            feats["energy"] += f.get("energy") or 0.0
            feats["danceability"] += f.get("danceability") or 0.0
            feats["valence"] += f.get("valence") or 0.0
            feats["count"] += 1

    if feats["count"] > 0:
        for k in ("tempo", "energy", "danceability", "valence"):
            feats[k] /= feats["count"]
    return feats



def poll_clip(clip_id: str, target: str = "complete", timeout_sec: int = 180, interval: float = 2.5) -> dict:
    """Poll Suno /clips until target status or timeout. Returns the clip object (may be last seen)."""
    deadline = time.time() + max(5, timeout_sec)
    last = {}
    while time.time() < deadline:
        data = jfetch(
            "GET",
            f"{SUNO_BASE}/clips",
            headers={"Authorization": f"Bearer {SUNO_TOKEN}"},
            params={"ids": clip_id},
        )
        if isinstance(data, list) and data:
            last = data[0]
            status = (last.get("status") or "").lower()
            if status == target:
                return last
            # If caller wants streaming URL ASAP
            if target == "streaming" and status in ("streaming", "complete"):
                return last
            # If target is complete and we already got complete, return
            if target == "complete" and status == "complete":
                return last
        time.sleep(interval)
    return last  # timeout: best-effort return


# --- routes ---

@app.post("/api/team-anthem")
def team_anthem(body: TeamAnthemBody):
    if not body.users:
        raise HTTPException(status_code=400, detail="No users provided")

    per_user = [fetch_spotify_taste(u.accessToken) for u in body.users]
    fused = fuse_tags(per_user, body.mood, body.instrumental)

    topic = f"An anthem for {body.teamName} at HackMIT. Mood: {body.mood}. " \
            f"{('Inside jokes: ' + body.insideJokes) if body.insideJokes else ''}"
    topic = topic[:480]

    gen = jfetch(
        "POST",
        f"{SUNO_BASE}/generate",
        headers={"Authorization": f"Bearer {SUNO_TOKEN}", "Content-Type": "application/json"},
        json={
            "topic": topic,
            "tags": fused["tagStr"],
            "make_instrumental": fused["makeInstrumental"],
        },
    )

    return {
        "clipId": gen.get("id"),
        "tags": fused["tagStr"],
        "make_instrumental": fused["makeInstrumental"],
        "explain": fused["explain"],
    }

@app.get("/api/clip/{clip_id}")
def get_clip(clip_id: str):
    data = jfetch(
        "GET",
        f"{SUNO_BASE}/clips",
        headers={"Authorization": f"Bearer {SUNO_TOKEN}"},
        params={"ids": clip_id},
    )
    # return array of clip objs
    if isinstance(data, list) and data:
        return data[0]
    return data

@app.post("/api/songify")
def songify(body: SongifyBody):
    repo = fetch_repo_data(body.repoUrl)
    prompt = build_lyrics(repo["readmeTLDR"], repo["readmeTitle"], repo["commits"])

    mood_tags = (MOOD_MAP.get(body.mood) or MOOD_MAP["lock-in"])["tags"][:3]
    provided = [t.strip() for t in (body.tags or "").split(",") if t and t.strip()]
    final_tags = ", ".join(list(dict.fromkeys((provided + mood_tags)))[:6])

    gen = jfetch(
        "POST",
        f"{SUNO_BASE}/generate",
        headers={"Authorization": f"Bearer {SUNO_TOKEN}", "Content-Type": "application/json"},
        json={
            "prompt": prompt,#custom lyrics
            "tags": final_tags
        },
    )

    return {
        "clipId": gen.get("id"),
        "tags": final_tags,
        "lyricsPreview": prompt[:600],
        "repoMeta": repo,
        "titleHint": repo["readmeTitle"] or body.teamName or "HackMIT Track",
    }


from pydantic import BaseModel

class DebugAnthemBody(BaseModel):
    tags: str
    topic: Optional[str] = None
    make_instrumental: Optional[bool] = None


@app.post("/api/team-anthem-debug")
def team_anthem_debug(body: DebugAnthemBody):
    topic = (body.topic or "An anthem for HackMIT hackers.").strip()[:480]
    tag_str = ", ".join([t.strip() for t in body.tags.split(",") if t.strip()])[:100]

    gen = jfetch(
        "POST",
        f"{SUNO_BASE}/generate",
        headers={"Authorization": f"Bearer {SUNO_TOKEN}", "Content-Type": "application/json"},
        json={
            "topic": topic,
            "tags": tag_str,
            **({"make_instrumental": body.make_instrumental} if body.make_instrumental is not None else {})
        },
    )
    return {"clipId": gen.get("id"), "tags": tag_str, "topic": topic, "make_instrumental": body.make_instrumental}


from pydantic import BaseModel
from typing import Optional

class WaitAndSaveBody(BaseModel):
    clipId: str
    timeoutSec: Optional[int] = 180 # how long to wait for "complete"
    download: Optional[bool] = True  # save the MP3 locally or not

@app.post("/api/wait-and-save")
def wait_and_save(body: WaitAndSaveBody):
    clip = wait_for_complete_clip(body.clipId, timeout_sec=body.timeoutSec or 180, interval_sec=5)
    status = clip.get("status")
    audio_url = clip.get("audio_url")
    saved_path = None

    if status != "complete":
        # didn’t finish in time; return whatever we have so caller can decide
        return {
            "clipId": body.clipId,
            "status": status,
            "audio_url": audio_url,
            "message": "Timeout before completion",
        }

    if body.download and audio_url:
        downloads_dir = pathlib.Path("downloads")
        downloads_dir.mkdir(exist_ok=True)
        fname = downloads_dir / f"hacktrack_{body.clipId}.mp3"
        # follow redirects to CDN
        resp = requests.get(audio_url, timeout=180, allow_redirects=True)
        resp.raise_for_status()
        fname.write_bytes(resp.content)
        saved_path = str(fname.resolve())

    return {
        "clipId": body.clipId,
        "status": status,                # should be "complete"
        "audio_url": audio_url,          # permanent MP3 URL
        "saved_path": saved_path,        # local path if downloaded=True
        "duration": (clip.get("metadata") or {}).get("duration"),
        "title": clip.get("title"),
        "image_url": clip.get("image_url"),
    }


from fastapi import Query

@app.get("/api/clip/{clip_id}/wait")
def wait_clip_get(clip_id: str,
                  timeoutSec: int = Query(180),
                  download: bool = Query(False)):
    body = WaitAndSaveBody(clipId=clip_id, timeoutSec=timeoutSec, download=download)
    return wait_and_save(body)  # reuse logic


@app.get("/")
def root():
    return {
        "ok": True,
        "message": "HackTrack Studio backend is running.",
        "try": [
            "GET  /docs",
            "POST /api/team-anthem-debug",
            "GET  /api/clip/{clipId}",
            "POST /api/songify"
        ]
    }

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

from fastapi import Query
from pydantic import BaseModel
from typing import Optional

@app.get("/api/spotify/authorize")
def spotify_authorize(state: str = Query("hacktrack"), scopes: str = Query("user-top-read user-read-email user-read-recently-played user-library-read")):
    return {"authorize_url": spotify_authorize_url(state=state, scopes=scopes)}

@app.get("/api/spotify/callback")
def spotify_callback(code: str = Query(...), state: Optional[str] = Query(None)):
    tokens = spotify_exchange_code(code)  # { access_token, refresh_token, expires_in, scope, token_type }
    return {"state": state, **tokens}

class RefreshBody(BaseModel):
    refresh_token: str

@app.post("/api/spotify/refresh")
def spotify_refresh_route(body: RefreshBody):
    return spotify_refresh(body.refresh_token)

class TasteBody(BaseModel):
    accessToken: str

@app.post("/api/spotify/me")
def spotify_me(body: TasteBody):
    return summarize_spotify_taste(body.accessToken)

@app.post("/api/spotify/me-min")
def spotify_me_min(body: dict):
    access_token = body.get("accessToken")
    if not access_token:
        raise HTTPException(400, "accessToken required")
    headers = {"Authorization": f"Bearer {access_token}"}
    me = jfetch("GET", "https://api.spotify.com/v1/me", headers=headers)
    artists = jfetch("GET", "https://api.spotify.com/v1/me/top/artists?limit=10&time_range=short_term", headers=headers)
    top_genres = []
    for a in artists.get("items", []) or []:
        top_genres += (a.get("genres") or [])
    # dedup + take a few
    top_genres = list(dict.fromkeys([g.lower() for g in top_genres if g]))[:5]
    return {"profile": {"id": me.get("id"), "display_name": me.get("display_name")}, "top_genres": top_genres}

@app.post("/api/spotify/recent")
def spotify_recent(body: dict):
    access_token = body.get("accessToken")
    if not access_token:
        raise HTTPException(400, "accessToken required")
    return fetch_recent_genres_and_features(access_token)


class HackJamOnceBody(BaseModel):
    users: List[SpotifyUser]
    mood: str = "lock-in"
    teamName: str = "our team"
    insideJokes: str = ""
    instrumental: Optional[bool] = None
    count: int = 1                 # how many tracks to generate
    wait: bool = True              # wait for final MP3s?
    download: bool = True          # save MP3s to /downloads
    timeoutSec: int = 180
    delayBetweenSec: float = 1.0   # small pacing between requests

@app.post("/api/hackjam-once")
def hackjam_once(body: HackJamOnceBody):
    if not body.users:
        raise HTTPException(400, "At least one Spotify user accessToken is required")

    # 1) Gather per-user taste and fuse into tags/mode
    per_user = [fetch_spotify_taste(u.accessToken) for u in body.users]
    fused = fuse_tags(per_user, body.mood, body.instrumental)

    topic_base = f"An anthem for {body.teamName} at HackMIT. Mood: {body.mood}. "
    if body.insideJokes:
        topic_base += f"Inside jokes: {body.insideJokes[:120]}"
    topic_base = topic_base[:480]

    results = []
    for i in range(max(1, body.count)):
        # 2) Fire Suno generation
        gen = jfetch(
            "POST",
            f"{SUNO_BASE}/generate",
            headers={"Authorization": f"Bearer {SUNO_TOKEN}", "Content-Type": "application/json"},
            json={
                "topic": (topic_base + f" Track {i+1}").strip()[:480],
                "tags": fused["tagStr"],
                "make_instrumental": fused["makeInstrumental"],
            },
        )
        clip_id = gen.get("id")
        if not clip_id:
            raise HTTPException(500, "Suno did not return a clip id")

        item = {"clipId": clip_id, "tags": fused["tagStr"], "explain": fused["explain"], "index": i+1}

        if body.wait:
            # 3) Wait for final and optionally save
            final = poll_clip(clip_id, target="complete", timeout_sec=body.timeoutSec)
            item.update({
                "status": final.get("status"),
                "title": final.get("title"),
                "image_url": final.get("image_url"),
                "audio_url": final.get("audio_url"),
                "duration": (final.get("metadata") or {}).get("duration"),
            })
            if body.download and item.get("audio_url", "").endswith(".mp3"):
                mp3 = requests.get(item["audio_url"], timeout=60)
                mp3.raise_for_status()
                os.makedirs("downloads", exist_ok=True)
                path = os.path.abspath(os.path.join("downloads", f"hackjam_{clip_id}.mp3"))
                with open(path, "wb") as f:
                    f.write(mp3.content)
                item["saved_path"] = path
            time.sleep(body.delayBetweenSec)
        results.append(item)

    return {"count": len(results), "tracks": results, "make_instrumental": fused["makeInstrumental"]}

class HackJamStreamBody(BaseModel):
    users: List[SpotifyUser]
    mood: str = "lock-in"
    teamName: str = "our team"
    insideJokes: str = ""
    instrumental: Optional[bool] = None
    maxTracks: int = 10
    maxMinutes: int = 15
    delayBetweenSec: float = 1.0
    saveEach: bool = False

def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"

@app.post("/api/hackjam-stream")
def hackjam_stream(body: HackJamStreamBody):
    if not body.users:
        raise HTTPException(400, "At least one Spotify user accessToken is required")

    per_user = [fetch_spotify_taste(u.accessToken) for u in body.users]
    fused = fuse_tags(per_user, body.mood, body.instrumental)
    topic_base = f"An anthem for {body.teamName} at HackMIT. Mood: {body.mood}. "
    if body.insideJokes:
        topic_base += f"Inside jokes: {body.insideJokes[:120]}"
    topic_base = topic_base[:480]

    start_time = time.time()

    def gen():
        # session start
        yield _sse({"type": "session", "event": "start", "tags": fused["tagStr"], "explain": fused["explain"]})
        tracks_done = 0

        while tracks_done < max(1, body.maxTracks) and (time.time() - start_time) < body.maxMinutes * 60:
            # submit a new generation
            gen = jfetch(
                "POST",
                f"{SUNO_BASE}/generate",
                headers={"Authorization": f"Bearer {SUNO_TOKEN}", "Content-Type": "application/json"},
                json={
                    "topic": (topic_base + f" Track {tracks_done+1}").strip()[:480],
                    "tags": fused["tagStr"],
                    "make_instrumental": fused["makeInstrumental"],
                },
            )
            clip_id = gen.get("id")
            if not clip_id:
                yield _sse({"type": "error", "message": "No clip id from Suno"})
                break

            yield _sse({"type": "track", "stage": "submitted", "clipId": clip_id, "index": tracks_done+1})

            # get streaming URL asap
            st = poll_clip(clip_id, target="streaming", timeout_sec=90)
            if st:
                yield _sse({
                    "type": "track",
                    "stage": "streaming",
                    "clipId": clip_id,
                    "index": tracks_done+1,
                    "stream_url": st.get("audio_url"),
                    "image_url": st.get("image_url"),
                    "title": st.get("title") or f"HackJam Track {tracks_done+1}",
                })

            # wait until complete
            fin = poll_clip(clip_id, target="complete", timeout_sec=180)
            payload = {
                "type": "track",
                "stage": "complete",
                "clipId": clip_id,
                "index": tracks_done+1,
                "audio_url": fin.get("audio_url"),
                "title": fin.get("title"),
                "image_url": fin.get("image_url"),
                "duration": (fin.get("metadata") or {}).get("duration"),
            }

            # optional save
            if body.saveEach and payload.get("audio_url", "").endswith(".mp3"):
                try:
                    mp3 = requests.get(payload["audio_url"], timeout=60)
                    mp3.raise_for_status()
                    os.makedirs("downloads", exist_ok=True)
                    path = os.path.abspath(os.path.join("downloads", f"hackjam_{clip_id}.mp3"))
                    with open(path, "wb") as f:
                        f.write(mp3.content)
                    payload["saved_path"] = path
                except Exception as e:
                    payload["save_error"] = str(e)

            yield _sse(payload)

            tracks_done += 1
            time.sleep(max(0.2, body.delayBetweenSec))

        yield _sse({"type": "session", "event": "end", "tracks_done": tracks_done})

    return StreamingResponse(gen(), media_type="text/event-stream")

class RepoJamOnceBody(BaseModel):
    repoUrl: str
    tags: Optional[str] = None
    mood: str = "lock-in"
    teamName: Optional[str] = None
    wait: bool = True
    download: bool = True
    timeoutSec: int = 180

@app.post("/api/repojam-once")
def repojam_once(body: RepoJamOnceBody):
    # 1) Build lyrics from repo
    repo = fetch_repo_data(body.repoUrl)
    prompt = build_lyrics(repo["readmeTLDR"], repo["readmeTitle"], repo["commits"])

    mood_tags = (MOOD_MAP.get(body.mood) or MOOD_MAP["lock-in"])["tags"][:3]
    provided = [t.strip() for t in (body.tags or "").split(",") if t and t.strip()]
    final_tags = ", ".join(list(dict.fromkeys((provided + mood_tags)))[:6])

    # 2) Generate
    gen = jfetch(
        "POST",
        f"{SUNO_BASE}/generate",
        headers={"Authorization": f"Bearer {SUNO_TOKEN}", "Content-Type": "application/json"},
        json={"prompt": prompt, "tags": final_tags},
    )
    clip_id = gen.get("id")
    out = {
        "clipId": clip_id,
        "tags": final_tags,
        "lyricsPreview": prompt[:600],
        "repoMeta": repo,
        "titleHint": repo["readmeTitle"] or body.teamName or "HackMIT Track",
    }

    if body.wait and clip_id:
        fin = poll_clip(clip_id, target="complete", timeout_sec=body.timeoutSec)
        out.update({
            "status": fin.get("status"),
            "title": fin.get("title"),
            "image_url": fin.get("image_url"),
            "audio_url": fin.get("audio_url"),
            "duration": (fin.get("metadata") or {}).get("duration"),
        })
        if body.download and out.get("audio_url", "").endswith(".mp3"):
            mp3 = requests.get(out["audio_url"], timeout=60)
            mp3.raise_for_status()
            os.makedirs("downloads", exist_ok=True)
            path = os.path.abspath(os.path.join("downloads", f"repojam_{clip_id}.mp3"))
            with open(path, "wb") as f:
                f.write(mp3.content)
            out["saved_path"] = path

    return out


# --- local run entrypoint ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=True)

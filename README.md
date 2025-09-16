> DEMO: https://www.youtube.com/watch?v=AKqbpe2-a5A

> ENDPOINT: https://hackmit-jam.vercel.app/ (some features might not work bc i ran out of api credits 💀)

<img width="1094" height="555" alt="Screenshot 2025-09-14 at 3 38 22 AM" src="https://github.com/user-attachments/assets/0cef9cf0-c6cd-42ea-8b43-20f5eebd0b92" />

# Jam - HackMIT 2025

## Docs:

### Inspiration

All hackathons have a soundtrack; it's the keyboards clacking, free redbull popping, and devs in the zone. I wanted to build something that turns all that chaotic energy into actual music! Like, what if your team could have an instant anthem for those 3am hackMIT sprints? What if your messy commit history could literally become a hyper track? introducing... jam! 👀 creating a soundtrack from your hackathon!

### What it does

jam is basically "turn vibes into music" but for hackers. Two modes:
- HackJam: Takes 1-3 people's Spotify tastes, mixes them with whatever hackathon mood you're in (lock-in mode, debug spiral, free swag hunt, etc.), and spits out a custom team anthem. You can get one banger or keep it streaming new tracks until you tell it to stop.
- RepoJam: Ever make any emotional git commits to your porject? me too. This feature reads your GitHub repo's README and recent commits, turns all that into lyrics, and generates a track that actually matches your developer vibe. Love or hate it; but worth trying out

### How its built


- Suno: Suno API for the actual music generation! (/generate + /clips) with real-time streaming
- Spotify: Full OAuth flow plus some track/genre analytics with dev API; grabs top artists/tracks, recent plays, saved music, then fills gaps with recommendations and mood nudges
- Backend: Python FastAPI because it's fast to prototype and handles async nicely. Vercel hosting + front end templates
- GitHub: Pulls README + commit history and parses it into actual song structure


### Learnings

- APIs fail, users have weird data, things break
- streaming UX is everything; people want to hear something immediately, even if it's not perfect. 
- how OAuth works (*silent screams*)
- building by yourself is possible, but building with others is almost always better! i'd have liked to do this project with others, and while some unexpected situations early on prevented that, i learned how to make the most of it by meeting new people and gaining feedback on the process from those around me (eg with OAuth/permissions issues; resolved with the advice of some new hackathon friends! and getting feedback on the UX from others!)

## Features
<img width="1094" height="555" alt="Screenshot 2025-09-14 at 3 38 22 AM" src="https://github.com/user-attachments/assets/49701f13-ccde-497e-8921-58441dee008d" />

<img width="1124" height="624" alt="Screenshot 2025-09-14 at 3 38 29 AM" src="https://github.com/user-attachments/assets/37dd3114-82b6-4dc9-90fd-3c25653d5393" />

<img width="835" height="629" alt="Screenshot 2025-09-14 at 3 41 53 AM" src="https://github.com/user-attachments/assets/347233e7-5750-49eb-9f4e-abaaa3a68847" />

<img width="888" height="582" alt="Screenshot 2025-09-14 at 3 42 19 AM" src="https://github.com/user-attachments/assets/01a3654e-7b49-4cae-9c40-05cdb60ac8f8" />

<img width="964" height="608" alt="Screenshot 2025-09-14 at 3 42 31 AM" src="https://github.com/user-attachments/assets/c1954939-a278-43e5-b58f-e5d6ccdacf77" />

<img width="703" height="762" alt="Screenshot 2025-09-14 at 10 54 35 AM" src="https://github.com/user-attachments/assets/bd14030a-cfc8-4564-be22-614e67d0be69" />

<img width="199" height="292" alt="Screenshot 2025-09-14 at 10 54 56 AM" src="https://github.com/user-attachments/assets/a81f0d0f-db9d-43e1-8966-ba37baf66e51" />

<img width="914" height="773" alt="Screenshot 2025-09-14 at 11 13 52 AM" src="https://github.com/user-attachments/assets/9e7e34f8-d20c-44cd-b29f-86176b39f138" />

<img width="635" height="718" alt="Screenshot 2025-09-14 at 11 14 18 AM" src="https://github.com/user-attachments/assets/177d1bbd-cb94-4592-9de3-a0393c529e86" />

<img width="501" height="634" alt="Screenshot 2025-09-16 at 6 10 12 PM" src="https://github.com/user-attachments/assets/4347cc62-e8de-4b41-bf59-fe4531fc1f29" />






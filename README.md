# AION 2 In-Game World Timers Overlay

An always-on-top, transparent HUD overlay for **AION 2** that tracks world bosses, spacetime rifts, artifact sieges, dimensional invasions, shugo festivals, and server resets—all automatically synchronized and converted to your **local machine time**.

---

## 🚀 Download Standalone Executable (No Install Needed)

👉 **[Download the Latest Portable `.exe` from GitHub Releases](https://github.com/Byanski/aion2timeroverlay/releases)**

1. Download **`AION2-World-Timers-Overlay.exe`**.
2. Double-click to launch—**no installation, no Node.js, and no extra dependencies required**!

---

## ✨ Features

- **Local Machine Time Synchronized**: All in-game server schedules (US East, US West, Europe, Korea KR, Taiwan TW, UTC) are converted down to the second into your local PC clock with automatic Daylight Saving Time detection.
- **Always-On-Top Gaming HUD**: Floats seamlessly over AION 2 in Fullscreen Borderless or Windowed mode.
- **Ghost Mode (Click-Through + Semi-Transparency)**:
  - Toggle with <kbd>F10</kbd> or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd>.
  - When locked, mouse clicks pass directly through to the game window so you never miss a spell or target, and the overlay automatically becomes **semi-transparent** (configurable from 15% to 80% opacity) so your view is unobstructed.
  - Unlock anytime to drag, scroll, search, or mark bosses killed.
- **Audio Chimes & Warnings**:
  - Synthesized Web Audio alerts: 5-minute warning, 1-minute warning, and spawn fanfare!
  - Volume slider and individual toggle per alert level.
- **Hero "Next Up" Banner**:
  - Always highlights the immediate next upcoming event or active world boss with full location and local time details.
  - Dynamic progress bar indicates how close the event is.
- **Full AION 2 Schedule Included**:
  - **Watcher Kaira**: Daily every 3 hours (Chaotic Lower Reshanta - Abandoned Island).
  - **Guardian Lord Nahma**: Fridays & Sundays at 21:00 server time.
  - **Executors (Tamasa & Argo)**: Mondays, Thursdays, Saturdays at 21:30 server time.
  - **Spacetime Rifts**: Every 3 hours on the hour (00:00, 03:00, 06:00, etc.) with portal open/active windows.
  - **Artifact Sieges**: Mondays, Thursdays, Saturdays at 21:00 server time.
  - **Dimensional Invasions**: Hourly at :30 past the hour.
  - **Shugo Festival Minigames**: Hourly at :00 (Jump Jump, Hidden Lugi, Goldrin).
  - **Daily & Weekly Resets**: Tracks daily reset and Wednesday weekly Abyss rank tallies.
- **Interactive Field Boss Respawn Stopwatch**:
  - Click `+ Custom Boss` or `Reset Cooldown` to track field bosses (Queen Ant, King Chiton, etc.) when slain.
- **Compact HUD Mode**:
  - Click `⤢` to collapse the overlay into a sleek mini status bar showing just the next upcoming event.
- **📦 Hidden Cubes Hunter Tab (Corpus.gg Companion)**:
  - **Offline High-Res Maps**: Built-in 2048x2048 interactive game maps for **Verteron (Elyos)** and **Altgard (Asmodian)**. Works completely offline with zero external network lag!
  - **All 154 Cube Spawn Groups Tracked**: 95 Verteron groups and 59 Altgard groups with exact percentage coordinates and potential spawn spot counts (10 to 20 spots per group).
  - **🎧 Acoustic Sound Guide (Detection Radar)**:
    - Click anywhere on the map (or right-click) with Sound Radar active to simulate in-game cube audio detection.
    - Accurately checks candidate spawn groups within hearing distance (~50m-55m) and renders an animated sonar wave with connecting detection rays and clickable jump chips.
  - **Interactive Checklist & Map Sync**:
    - Mark cubes as found/unfound from the map pin inspector or from the checklist.
    - Search by landmark name (e.g. *Altamia Canyon*, *Pilgrim's Rest*, *Moslan Forest*) or group code.
    - Progress bars and completion stats are automatically saved in local storage.
  - **Smooth Pan & Zoom Controls**:
    - Mouse drag to pan, wheel scroll to zoom centered on your cursor, plus mini zoom HUD buttons.
- **Configurable Styling**:
  - Sliders for normal opacity and in-game ghost mode opacity.

---

## 🎮 Hotkey Controls

| Hotkey | Action |
| --- | --- |
| <kbd>F10</kbd> or <kbd>Ctrl+Shift+X</kbd> | Toggle **Click-Through Ghost Mode** (semi-transparent + pass clicks into game) |
| <kbd>Ctrl+Shift+H</kbd> | Toggle **Show / Hide** Overlay window |
| Drag top header | Move overlay anywhere on your screen (position is saved automatically) |

---

## 🛠️ Running From Source (Optional)

If you prefer running directly with Node.js:
```bash
git clone git@github.com:Byanski/aion2timeroverlay.git
cd aion2timeroverlay
npm install
npm start
```
Or double-click `run-overlay.bat`.

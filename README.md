# AION 2 In-Game World Timers Overlay

An always-on-top, transparent HUD overlay for **AION 2** that tracks world bosses, spacetime rifts, artifact sieges, dimensional invasions, shugo festivals, and server resets—all automatically synchronized and converted to your **local machine time**.

---

## ✨ Features

- **Local Machine Time Synchronized**: All in-game server schedules (KR, NA, EU, TW, UTC) are converted down to the second into your local PC clock.
- **Always-On-Top Gaming HUD**: Floats seamlessly over AION 2 in Fullscreen Borderless or Windowed mode.
- **Ghost Mode (Click-Through)**:
  - Toggle with <kbd>F10</kbd> or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd>.
  - When locked, mouse clicks pass directly through to the game window so you never miss a spell or target.
  - Unlock anytime to drag, scroll, search, or mark bosses killed.
- **Audio Chimes & Warnings**:
  - Synthesized Web Audio alerts: 5-minute warning, 1-minute warning, and spawn fanfare!
  - Volume slider and individual toggle per alert level.
- **Hero "Next Up" Banner**:
  - Always highlights the immediate next upcoming event or active world boss.
  - Dynamic progress bar indicates how close the event is.
- **Full AION 2 Schedule Included**:
  - **Watcher Kaira**: Daily every 3 hours (Chaotic Lower Reshanta - Abandoned Island).
  - **Guardian Lord Nahma**: Fridays & Sundays at 21:00 server time.
  - **Executors (Tamasa & Argo)**: Mondays, Thursdays, Saturdays at 21:30 server time.
  - **Spacetime Rifts**: Every 3 hours on the hour (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00).
  - **Artifact Sieges**: Mondays, Thursdays, Saturdays at 21:00 server time.
  - **Dimensional Invasions**: Hourly at :30 past the hour.
  - **Shugo Festival Minigames**: Hourly at :00 (Jump Jump, Hidden Lugi, Goldrin).
  - **Daily & Weekly Resets**: Tracks dungeon entry and weekly Abyss rank tallies.
- **Interactive Field Boss Respawn Stopwatch**:
  - Click `+ Custom Boss` or `Reset Cooldown` to track field bosses (Queen Ant, King Chiton, etc.) when slain.
- **Compact HUD Mode**:
  - Click `⤢` to collapse the overlay into a sleek mini status bar showing just the next upcoming event.
- **Configurable Styling**:
  - Adjust glassmorphism background opacity from 25% to 100%.

---

## 🚀 How to Launch

Double-click `run-overlay.bat` in this folder:
```cmd
run-overlay.bat
```
Or start via command line:
```bash
npm start
```

---

## 🎮 Hotkey Controls

| Hotkey | Action |
| --- | --- |
| <kbd>F10</kbd> or <kbd>Ctrl+Shift+X</kbd> | Toggle **Click-Through Ghost Mode** (unlock to interact, lock to pass clicks to game) |
| <kbd>Ctrl+Shift+H</kbd> | Toggle **Show / Hide** Overlay window |
| Drag top header | Move overlay anywhere on your screen (position is saved automatically) |

# ⏳ CHRONOS VELOCITY
> **Global Archives // Volume 1**

[![Live Demo](https://img.shields.io/badge/Status-Online-success)](https://dialga-press.github.io/chronos-velocity/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vibe](https://img.shields.io/badge/Vibe-Time%20Travel-purple)](https://dialga-press.github.io/chronos-velocity/)

**Chronos Velocity** is an open-source, interactive storytelling engine inspired by *Time Patrol Bon (TP-BON)*, *Steins;Gate*, and classic text adventures. It is a journey through the events that shaped humankind—from the salt flats of Bolivia to the burning ruins of Hampi.

**[🔴 PLAY THE LIVE VERSION HERE](https://dialga-press.github.io/chronos-velocity/)**

---

## 📜 The Concept

We are building a **Dynamic Light Novel** where the story adapts to *you*.

Unlike static books, the narrative engine changes descriptions, dialogue, and available choices based on the **Archetype** you choose (Engineer, Artist, Doctor, etc.) and your real-world inputs (Nationality, Age).

*   **The Rule:** "Ash and Vapor." We only intervene in history to save what is already lost.
*   **The Goal:** To immerse users in the beauty and tragedy of history, preserving memory before it is erased.

---

## 🤝 Community-Driven Lore

This isn't just our story. It's yours. We actively incorporate user feedback into the canon lore.

> **✨ HALL OF FAME**
> 
> The device's AI, **SMYLNYX**, was born from a suggestion by our very first reader, **u/SHOT-MANAGER-7012**. 
> They suggested a distinct personality for the machine, and we wrote it into the code. Now, SMYLNYX guides every new traveler through the timeline.

**We want your ideas.**
*   Where should we go next?
*   What artifact should we steal?
*   How should the plot evolve?

Open an [Issue](https://github.com/Dialga-Press/chronos-velocity/issues) or start a Discussion to pitch your ideas on Reddit u/Miles_NYC. If we like it, **we will write it into the next Chapter.**

---

## 🚀 Features

*   **Dynamic Narrative Engine:** Text blocks render conditionally based on user stats (Tech, Arts, Guts, Social).
*   **The "Bio-Metric" Key:** The story reacts to your real-world inputs (e.g., typing "India" as your origin unlocks specific cultural dialogue).
*   **Day/Night Cycle:** 
    *   🌑 **Dark Mode:** "The Void" (Terminal aesthetic).
    *   ☀️ **Light Mode:** "The Journal" (Da Vinci Sketchbook aesthetic).
*   **No Backend:** Runs entirely in the browser using Vanilla JS and JSON logic. Zero tracking, 100% privacy.

---

## 🗺️ The Roadmap

### ✅ Volume 1: The Drop (Live)
*   **Location:** Salar de Uyuni, Bolivia.
*   **Event:** The initial synchronization.
*   **Asset:** 2008 Nissan X-Trail T31 (Pearl White).

### 🚧 Volume 2: The City of Victory (In Development)
*   **Location:** **Vijayanagara (Hampi)**, India.
*   **Date:** January 1565.
*   **Objective:** Infiltrate the capital just days before the Battle of Talikota. Witness the glory of the empire at its zenith before the fires begin.
*   **Mission:** Recover the lost astronomical charts of the Royal Library.

---

## 🛠️ Installation (For Developers)

Want to run the engine locally or fork it to write your own story?

1.  **Clone the repo:**
    ```bash
    git clone https://github.com/Dialga-Press/chronos-velocity.git
    ```
2.  **Navigate to the folder:**
    ```bash
    cd chronos-velocity
    ```
3.  **Run it:**
    *   Simply open `index.html` in your browser.
    *   OR use a simple local server (VS Code Live Server).

### Modding the Story
All narrative data is stored in `data/story.json`. You can edit this file to create your own chapters without touching a single line of JavaScript.

```json
{
  "focus": "ai", 
  "text_blocks": [
    { 
      "condition": "default", 
      "text": "Write your dialogue here..." 
    }
  ]
}

```
---

📄 License
The Code (Engine): MIT License. Use it to build your own text adventures!
The Story (Content): Copyright © 2026 Dialga-Press.
```html
<p align="center">
<i>"We aren't going to a place. We are going to a time." — SMYLNYX</i>
</p>
```

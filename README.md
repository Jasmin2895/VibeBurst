# ⚡ VibeBurst

> Transform any webpage's visual style instantly with AI-generated CSS — without touching a single line of JavaScript.

VibeBurst is a Chrome extension that generates 4 distinct visual style variations (Cyberpunk, Glassmorphism, Brutalist, Retro Wave) for any webpage using the Groq API. Hover to preview, click to apply. JS untouched. React state preserved.

Built for the [DEV Weekend Hackathon](https://dev.to/challenges/hackathon).

---

## How it works

1. Open any webpage
2. Click the VibeBurst extension icon
3. Hit **Generate Variations** — Groq's LLM reads the page structure and generates 4 CSS style overrides
4. Hover any style card to preview it live on the page
5. Click **Apply** to lock it in
6. Click **Reset** to restore the original styles

The extension injects a `<style>` tag into `document.head`. It never modifies HTML, JavaScript, or React state — only CSS visual properties (colors, backgrounds, fonts, borders, shadows).

---

## Setup

### 1. Get a Groq API Key
Free at [console.groq.com](https://console.groq.com) — takes 1 minute.

### 2. Add your key
Create a `.env` file in the project root:
```
PLASMO_PUBLIC_GROQ_API_KEY=your_key_here
```

### 3. Install & build
```bash
npm install
npm run build
```

### 4. Load in Chrome
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `build/chrome-mv3-prod` folder

### Development (hot reload)
```bash
npm run dev
```
Load the `build/chrome-mv3-dev` folder instead.

---

## Styles

| Style | Vibe | Key traits |
|---|---|---|
| **Cyberpunk** ⚡ | Dark, neon, digital | Black bg, cyan/magenta accents, monospace, glowing borders |
| **Glassmorphism** 🔮 | Light, airy, frosted | Backdrop blur, transparent panels, soft purple/teal accents |
| **Brutalist** 🧱 | Raw, bold, zero-BS | Pure B&W, thick borders, no radius, max contrast |
| **Retro Wave** 🌅 | 80s, warm, nostalgic | Sunset gradients, pink/purple palette, synthwave energy |

---

## Tech Stack

- [Plasmo](https://plasmo.com) — Chrome extension framework
- [Groq](https://groq.com) — Fast LLM inference (llama-3.3-70b-versatile)
- React 18 + TypeScript
- Tailwind CSS

---

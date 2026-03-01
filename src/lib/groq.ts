import type { GeneratedStyles } from "./styles"
import { STYLES } from "./styles"

const GROQ_API_KEY = process.env.PLASMO_PUBLIC_GROQ_API_KEY

export async function generateStyles(pageInfo: {
  title: string
  bodyText: string
  selectors: string[]
  bgColor: string
  textColor: string
}): Promise<GeneratedStyles> {
  if (!GROQ_API_KEY || GROQ_API_KEY === "your_groq_api_key_here") {
    throw new Error("GROQ_API_KEY not configured. Add it to your .env file.")
  }

  const classSelectors = pageInfo.selectors.filter((s) => s.startsWith("."))

  const stylePrompts = STYLES.map(
    (s) => `### ${s.name.toUpperCase()}\n${s.prompt}`
  ).join("\n\n")

  const prompt = `You are a CSS theme generator for a Chrome extension. Generate CSS that transforms a webpage's visual theme without breaking its layout.

STRICT RULES — violating these will break the page:
1. NEVER use the * selector — it destroys layout
2. NEVER modify: display, position, float, flex, grid, width, height, margin, padding, overflow, z-index, visibility, transform, transition, animation
3. NEVER set "color: black" or "color: #000" on a dark background — text becomes invisible
4. ALWAYS pair background-color with an appropriate contrasting color for that element
5. ONLY target these selectors: html, body, a, a:hover, h1, h2, h3, h4, h5, h6, p, button, input, textarea, select, code, pre, blockquote, header, nav, main, footer, article, section, aside, table, th, td, li, strong, em, label
6. DO NOT include any class selectors (starting with .) — they will be handled separately
7. header, nav, main, footer, section, aside MUST use a dark shade of the body background (±10% brightness) — NEVER use an accent/highlight color as their background. Accent colors are only for text, links, borders, and interactive elements like buttons.

CONTRAST RULES:
- Dark background (#000–#555)? → Use light text (#ddd–#fff)
- Light background (#aaa–#fff)? → Use dark text (#111–#444)
- Always verify body text will be readable before outputting

${stylePrompts}

EXAMPLES OF CORRECT vs BROKEN CSS:

BROKEN (never do this):
* { color: black !important; background: white !important; }

CORRECT (do this):
body { background-color: #0a0a1a; color: #e0e0ff; }
h1, h2, h3 { color: #00ffff; text-shadow: 0 0 10px #00ffff80; }
a { color: #ff00ff; }
button { background-color: #1a0a2e; color: #00ffff; border: 1px solid #00ffff; border-radius: 4px; }

Page context:
- Title: "${pageInfo.title}"
- Current background: ${pageInfo.bgColor}
- Current text color: ${pageInfo.textColor}

Return ONLY valid JSON with NO markdown fences, NO comments, NO explanation:
{
  "cyberpunk": {
    "css": "body { background-color: #0a0a1a; color: #c0c0ff; } h1, h2, h3 { color: #00ffff; text-shadow: 0 0 8px #00ffff60; } a { color: #ff00ff; } a:hover { color: #00ffff; } button { background-color: #1a0030; color: #00ffff; border: 1px solid #00ffff40; } code, pre { background-color: #0d0d2e; color: #00ff88; border: 1px solid #00ff8840; } input, textarea { background-color: #0d0d2e; color: #c0c0ff; border: 1px solid #6600cc; } header, nav { background-color: #050514; border-bottom: 1px solid #00ffff30; } footer { background-color: #050514; color: #6060a0; }",
    "colors": ["#00ffff", "#ff00ff", "#0a0a1a", "#00ff88"],
    "description": "Dark cyberpunk with neon cyan and magenta glows"
  },
  "glassmorphism": {
    "css": "...",
    "colors": ["#6c5ce7", "#a8edea", "#ffffff", "#e8e8f8"],
    "description": "..."
  },
  "brutalist": {
    "css": "...",
    "colors": ["#000000", "#ffffff", "#ff0000", "#ffff00"],
    "description": "..."
  },
  "retro": {
    "css": "...",
    "colors": ["#ff6b9d", "#ffd93d", "#1a0030", "#c77dff"],
    "description": "..."
  }
}`

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 4096
      })
    }
  )

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after")
      const seconds = retryAfter ? parseInt(retryAfter, 10) : 60
      const wait = isNaN(seconds) ? 60 : seconds
      throw Object.assign(new Error("Rate limit reached"), {
        code: "RATE_LIMIT",
        retryAfter: wait
      })
    }
    const error = await response.text()
    throw new Error(`Groq API error: ${response.status} — ${error}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content?.trim()

  if (!content) {
    throw new Error("Empty response from Groq")
  }

  // Strip any accidental markdown code fences
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  const parsed = JSON.parse(cleaned)

  for (const key of ["cyberpunk", "glassmorphism", "brutalist", "retro"] as const) {
    const style = parsed[key]
    if (!style?.css) continue

    const bodyMatch = style.css.match(/body\s*\{([^}]+)\}/)
    if (!bodyMatch) continue

    const decls = bodyMatch[1]
    const bgMatch = decls.match(/background-color\s*:\s*([^;]+)/)
    const colorMatch = decls.match(/(?:^|[;{\s])color\s*:\s*([^;]+)/)
    if (!bgMatch) continue

    const bg = bgMatch[1].trim()
    const color = colorMatch ? colorMatch[1].trim() : null

    // Replace any bright accent background-color on structural elements with body bg.
    // This prevents things like a hot-pink nav bar on retro wave themes.
    const structuralSelectors = ["header", "nav", "main", "footer", "section", "aside", "article"]
    structuralSelectors.forEach((sel) => {
      const re = new RegExp(`(${sel}\\s*\\{[^}]*)background-color\\s*:\\s*[^;]+`, "g")
      style.css = style.css.replace(re, `$1background-color: ${bg}`)
    })

    // Universal inherit rule — the most reliable cross-site fix.
    // Forces ALL block containers to inherit the body background regardless of
    // class names, CDN stylesheets, or specificity tricks.
    // Excludes interactive elements (button, input, etc.) so the AI's themed
    // colors on those are preserved.
    const inheritRule = [
      `html { background-color: ${bg} !important; }`,
      `div, section, article, main, aside, ul, ol, li, form, fieldset, figure, details, summary`,
      `{ background-color: inherit !important;${color ? ` color: inherit !important;` : ""} }`
    ].join(" ")
    style.css += ` ${inheritRule}`

    // Class selector overrides as a supplementary layer — catches elements
    // that use !important in their own stylesheets (inherit can't beat those).
    if (classSelectors.length) {
      const rule = `${classSelectors.join(", ")} { background-color: ${bg} !important;${color ? ` color: ${color} !important;` : ""} }`
      style.css += ` ${rule}`
    }
  }

  return parsed as GeneratedStyles
}

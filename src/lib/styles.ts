export type StyleName = "cyberpunk" | "glassmorphism" | "brutalist" | "retro"

export interface StyleDefinition {
  name: StyleName
  label: string
  description: string
  emoji: string
  colors: string[]
  prompt: string
}

export const STYLES: StyleDefinition[] = [
  {
    name: "cyberpunk",
    label: "Cyberpunk",
    description: "Neon glows, dark voids, digital edge",
    emoji: "⚡",
    colors: ["#00ffff", "#ff00ff", "#0a0a1a", "#1a0a2e"],
    prompt: `CYBERPUNK style: Dark background (#0a0a1a or #1a0a2e), neon cyan (#00ffff) and magenta (#ff00ff)
accents, electric yellow (#ffe600) highlights. Monospace fonts (Courier New, monospace).
Glowing box-shadows using neon colors. Thin neon borders. Text glows.
Background patterns can use subtle grid or scanline effects via CSS gradients.`
  },
  {
    name: "glassmorphism",
    label: "Glassmorphism",
    description: "Frosted glass, light blur, airy depth",
    emoji: "🔮",
    colors: ["#ffffff80", "#e8e8f0", "#6c5ce7", "#a8edea"],
    prompt: `GLASSMORPHISM style: Light, airy aesthetic. White/light backgrounds with transparency.
backdrop-filter: blur(10px) on panels. rgba backgrounds (white at 0.1-0.3 opacity).
Soft purple/lavender (#6c5ce7) or teal (#a8edea) accent colors. Subtle box-shadows.
Very thin borders (1px solid rgba(255,255,255,0.3)). Clean sans-serif fonts.
Gradient backgrounds with pastels.`
  },
  {
    name: "brutalist",
    label: "Brutalist",
    description: "Raw, bold, zero ornamentation",
    emoji: "🧱",
    colors: ["#000000", "#ffffff", "#ff0000", "#ffff00"],
    prompt: `BRUTALIST style: Maximum contrast. Pure black (#000000) and white (#ffffff).
Bold accent colors: red (#ff0000) or yellow (#ffff00). Thick solid borders (3-5px black).
No border-radius (sharp corners everywhere). Bold/Black font weight.
Large uppercase text where possible. No gradients, no shadows (or harsh box-shadows).
Monospace or Impact-style fonts. Raw, unpolished aesthetic.`
  },
  {
    name: "retro",
    label: "Retro Wave",
    description: "80s neon, warm gradients, nostalgia",
    emoji: "🌅",
    colors: ["#ff6b9d", "#ffd93d", "#c77dff", "#4cc9f0"],
    prompt: `RETRO WAVE / 80s style: Warm sunset gradients (pink #ff6b9d to purple #c77dff).
Neon yellow (#ffd93d) and sky blue (#4cc9f0) accents. Warm background colors (deep purple, midnight blue).
Slightly rounded corners. Retro fonts or serif with personality.
Gradient text effects. Warm glow shadows. Nostalgic color palette inspired by 80s synthwave.`
  }
]

export interface GeneratedStyle {
  css: string
  colors: string[]
  description: string
}

export interface GeneratedStyles {
  cyberpunk: GeneratedStyle
  glassmorphism: GeneratedStyle
  brutalist: GeneratedStyle
  retro: GeneratedStyle
}

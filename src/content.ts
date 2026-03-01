import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

const STYLE_TAG_ID = "vibeburst-injected-style"
const PREVIEW_TAG_ID = "vibeburst-preview-style"

// Strip CSS properties that can break layout before injection
const BLOCKED_PROPS = [
  "display", "position", "float", "flex", "grid", "grid-template",
  "grid-area", "grid-column", "grid-row", "flex-direction", "flex-wrap",
  "align-items", "justify-content", "align-content", "place-items",
  "width", "height", "min-width", "max-width", "min-height", "max-height",
  "margin", "padding", "overflow", "z-index", "visibility", "clip",
  "transform", "transition", "animation", "content", "white-space",
  "word-break", "word-wrap", "text-overflow", "vertical-align",
  "table-layout", "border-collapse", "border-spacing", "list-style",
  "cursor", "pointer-events", "user-select"
]

// Extra props blocked on class-based selectors to prevent outlining every div
const CLASS_BLOCKED_PROPS = ["border", "outline", "box-shadow"]

function cleanDeclarations(declarations: string, extraBlocked: string[] = []): string {
  const allBlocked = [...BLOCKED_PROPS, ...extraBlocked]
  return declarations
    .split(";")
    .map((d: string) => d.trim())
    .filter((d: string) => {
      if (!d) return false
      const prop = d.split(":")[0]?.trim().toLowerCase() ?? ""
      return !allBlocked.some(
        (blocked) => prop === blocked || prop.startsWith(blocked + "-")
      )
    })
    .join("; ")
}

function sanitizeCSS(css: string): string {
  // Remove the dangerous * selector block entirely
  let sanitized = css.replace(/\*\s*\{[^}]*\}/g, "")

  // Remove dangerous selectors like html * or body *
  sanitized = sanitized.replace(/(?:html|body)\s+\*\s*\{[^}]*\}/g, "")

  // Strip blocked properties, with selector-aware extra blocking for class selectors
  sanitized = sanitized.replace(/([^{}]+)\{([^}]*)\}/g, (match, selector, declarations) => {
    const sel = selector.trim()
    const isClassSelector = sel.includes(".")
    const extra = isClassSelector ? CLASS_BLOCKED_PROPS : []
    const cleaned = cleanDeclarations(declarations, extra)
    return `${sel} { ${cleaned} }`
  })

  return sanitized
}

function getOrCreateStyleTag(id: string): HTMLStyleElement {
  let el = document.getElementById(id) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement("style")
    el.id = id
    document.head.appendChild(el)
  }
  return el
}

function extractPageInfo() {
  const computedBody = window.getComputedStyle(document.body)
  const bgColor = computedBody.backgroundColor || "#ffffff"
  const textColor = computedBody.color || "#000000"

  const selectors = new Set<string>()
  const tags = [
    "body", "header", "nav", "main", "footer", "section", "article",
    "aside", "h1", "h2", "h3", "p", "a", "button", "input", "div",
    "span", "ul", "li", "form", "table"
  ]
  tags.forEach((t) => {
    if (document.querySelector(t)) selectors.add(t)
  })

  // Method 1: Scan actual stylesheets for class selectors that set a background-color.
  // This is comprehensive (catches every rule, not just the first N DOM elements)
  // and fast (no computed style calls per element).
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList
      try {
        rules = sheet.cssRules
      } catch {
        continue // cross-origin stylesheet — skip
      }
      if (!rules) continue
      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSStyleRule)) continue
        if (!rule.style.backgroundColor && !rule.style.background) continue
        const sel = rule.selectorText ?? ""
        sel.split(",").forEach((part) => {
          const s = part.trim()
          // Simple class selector: .foo
          if (s.startsWith(".") && s.length > 2 && s.length < 60 && !/[:\[>~+\s]/.test(s)) {
            selectors.add(s)
            return
          }
          // Compound selector: div.foo or article.bar — extract the class part
          const compound = s.match(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_-]+)$/i)
          if (compound) {
            selectors.add(compound[1])
          }
        })
      }
    }
  } catch { /* ignore */ }

  // Method 2: DOM scan — no element limit, but capped at 100ms to avoid jank.
  // Also checks inline style attributes, which catches CSS-in-JS injected backgrounds
  // and cross-origin stylesheet backgrounds we can't read via cssRules.
  const deadline = performance.now() + 100
  for (const el of Array.from(document.querySelectorAll("*"))) {
    if (performance.now() > deadline) break
    if (!el.className || typeof el.className !== "string") continue

    // Check inline style first (cheap), then computed style
    const inlineBg = (el as HTMLElement).style?.backgroundColor
    const hasBg = inlineBg
      ? inlineBg !== "transparent"
      : (() => {
          const bg = window.getComputedStyle(el).backgroundColor
          return bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent"
        })()

    if (hasBg) {
      el.className.split(" ").slice(0, 3).forEach((cls) => {
        if (cls && cls.length > 2 && cls.length < 40) {
          selectors.add(`.${cls}`)
        }
      })
    }
  }

  return {
    title: document.title,
    bodyText: document.body.innerText.slice(0, 200),
    selectors: Array.from(selectors),
    bgColor,
    textColor
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "EXTRACT_PAGE_INFO": {
      sendResponse(extractPageInfo())
      break
    }
    case "INJECT_CSS": {
      const tag = getOrCreateStyleTag(STYLE_TAG_ID)
      tag.textContent = sanitizeCSS(message.css)
      const preview = document.getElementById(PREVIEW_TAG_ID)
      if (preview) preview.remove()
      sendResponse({ ok: true })
      break
    }
    case "PREVIEW_CSS": {
      const tag = getOrCreateStyleTag(PREVIEW_TAG_ID)
      tag.textContent = sanitizeCSS(message.css)
      sendResponse({ ok: true })
      break
    }
    case "CLEAR_PREVIEW": {
      const tag = document.getElementById(PREVIEW_TAG_ID)
      if (tag) tag.remove()
      sendResponse({ ok: true })
      break
    }
    case "RESET_CSS": {
      ;[STYLE_TAG_ID, PREVIEW_TAG_ID].forEach((id) => {
        const tag = document.getElementById(id)
        if (tag) tag.remove()
      })
      sendResponse({ ok: true })
      break
    }
    case "GET_ACTIVE_STYLE": {
      const tag = document.getElementById(STYLE_TAG_ID)
      sendResponse({ hasStyle: !!tag?.textContent })
      break
    }
  }
  return true
})

import { useCallback, useEffect, useRef, useState } from "react"

import { generateStyles } from "~lib/groq"
import { STYLES, type GeneratedStyle, type GeneratedStyles, type StyleName } from "~lib/styles"

import "~style.css"

type Status = "idle" | "loading" | "ready" | "error"

function ColorSwatch({ colors }: { colors: string[] }) {
  return (
    <div className="flex gap-1 mt-1">
      {colors.slice(0, 4).map((c, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  )
}

function StyleCard({
  style,
  generated,
  isApplied,
  onApply,
  onPreview,
  onClearPreview
}: {
  style: (typeof STYLES)[0]
  generated: GeneratedStyle | null
  isApplied: boolean
  onApply: (name: StyleName, css: string) => void
  onPreview: (css: string) => void
  onClearPreview: () => void
}) {
  const colors = generated?.colors ?? style.colors
  const description = generated?.description ?? style.description

  return (
    <div
      className={`
        relative rounded-xl p-3 border cursor-pointer transition-all duration-150
        ${isApplied
          ? "border-violet-400 bg-violet-900/30 shadow-lg shadow-violet-500/20"
          : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
        }
      `}
      onMouseEnter={() => generated && onPreview(generated.css)}
      onMouseLeave={onClearPreview}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{style.emoji}</span>
            <span className="text-xs font-semibold text-white truncate">{style.label}</span>
            {isApplied && (
              <span className="text-[9px] bg-violet-500 text-white px-1 rounded font-bold">ON</span>
            )}
          </div>
          <p className="text-[10px] text-white/50 mt-0.5 leading-tight">{description}</p>
          <ColorSwatch colors={colors} />
        </div>
      </div>

      <button
        onClick={() => generated && onApply(style.name, generated.css)}
        disabled={!generated}
        className={`
          mt-2.5 w-full text-[10px] font-semibold py-1.5 rounded-lg transition-all
          ${generated
            ? isApplied
              ? "bg-violet-500 text-white hover:bg-violet-400"
              : "bg-white/10 text-white/80 hover:bg-white/20"
            : "bg-white/5 text-white/20 cursor-not-allowed"
          }
        `}
      >
        {isApplied ? "Applied ✓" : "Apply"}
      </button>
    </div>
  )
}

export default function VibeBurst() {
  const [status, setStatus] = useState<Status>("idle")
  const [styles, setStyles] = useState<GeneratedStyles | null>(null)
  const [appliedStyle, setAppliedStyle] = useState<StyleName | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check if any style is currently applied on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, { type: "GET_ACTIVE_STYLE" }, (res) => {
        if (chrome.runtime.lastError) return
        // Could track which style was applied if stored, for now just detect presence
      })
    })
  }, [])

  const sendToTab = useCallback((message: object): Promise<unknown> => {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) return resolve(null)
        chrome.tabs.sendMessage(tab.id, message, (res) => {
          if (chrome.runtime.lastError) resolve(null)
          else resolve(res)
        })
      })
    })
  }, [])

  const handleGenerate = async () => {
    setStatus("loading")
    setError(null)

    try {
      const pageInfo = (await sendToTab({ type: "EXTRACT_PAGE_INFO" })) as {
        title: string
        bodyText: string
        selectors: string[]
        bgColor: string
        textColor: string
      }

      if (!pageInfo) {
        throw new Error("Could not read page info. Try refreshing the page.")
      }

      const generated = await generateStyles(pageInfo)
      setStyles(generated)
      setStatus("ready")
    } catch (err) {
      const e = err as Error & { code?: string; retryAfter?: number }
      if (e.code === "RATE_LIMIT" && e.retryAfter) {
        setError(`Groq rate limit reached. Retrying in ${e.retryAfter}s...`)
        setRetryCountdown(e.retryAfter)
        countdownRef.current = setInterval(() => {
          setRetryCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownRef.current!)
              countdownRef.current = null
              setRetryCountdown(null)
              setError(null)
              setStatus("idle")
              return null
            }
            const next = prev - 1
            setError(`Groq rate limit reached. Retrying in ${next}s...`)
            return next
          })
        }, 1000)
      } else {
        setError(e.message || "Something went wrong")
      }
      setStatus("error")
    }
  }

  const handleApply = useCallback(
    async (name: StyleName, css: string) => {
      if (appliedStyle === name) {
        // Toggle off
        await sendToTab({ type: "RESET_CSS" })
        setAppliedStyle(null)
      } else {
        await sendToTab({ type: "INJECT_CSS", css })
        setAppliedStyle(name)
      }
    },
    [appliedStyle, sendToTab]
  )

  const handlePreview = useCallback(
    (css: string) => sendToTab({ type: "PREVIEW_CSS", css }),
    [sendToTab]
  )

  const handleClearPreview = useCallback(
    () => sendToTab({ type: "CLEAR_PREVIEW" }),
    [sendToTab]
  )

  const handleReset = async () => {
    await sendToTab({ type: "RESET_CSS" })
    setAppliedStyle(null)
  }

  return (
    <div className="w-[320px] bg-[#0d0d1a] text-white min-h-[400px] p-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-bold tracking-tight">
            <span className="text-violet-400">Vibe</span>
            <span className="text-white">Burst</span>
          </h1>
          <p className="text-[10px] text-white/40 mt-0.5">AI CSS style transformer</p>
        </div>
        <div className="text-2xl">⚡</div>
      </div>

      {/* Generate Button */}
      {status === "idle" || status === "error" ? (
        <div className="mb-4">
          <button
            onClick={handleGenerate}
            disabled={retryCountdown !== null}
            className={`w-full py-2.5 rounded-xl bg-gradient-to-r text-white text-sm font-semibold
              transition-all shadow-lg shadow-violet-500/25
              ${retryCountdown !== null
                ? "from-violet-800 to-fuchsia-800 opacity-50 cursor-not-allowed"
                : "from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95"
              }`}
          >
            {retryCountdown !== null ? `⏳ Wait ${retryCountdown}s...` : "✨ Generate Variations"}
          </button>
          {error && (
            <p className="mt-2 text-[10px] text-red-400 bg-red-500/10 rounded-lg p-2 leading-relaxed">
              {error}
            </p>
          )}
          <p className="text-[10px] text-white/30 text-center mt-2">
            Hover any card to preview · Click to apply
          </p>
        </div>
      ) : null}

      {/* Loading */}
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          <p className="text-xs text-white/50">Generating vibes with Groq...</p>
        </div>
      )}

      {/* Style Cards */}
      {status === "ready" && styles && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {STYLES.map((style) => (
              <StyleCard
                key={style.name}
                style={style}
                generated={styles[style.name]}
                isApplied={appliedStyle === style.name}
                onApply={handleApply}
                onPreview={handlePreview}
                onClearPreview={handleClearPreview}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              className="flex-1 py-2 rounded-xl bg-white/5 text-white/60 text-[11px]
                font-medium hover:bg-white/10 hover:text-white/80 transition-all"
            >
              ↻ Regenerate
            </button>
            {appliedStyle && (
              <button
                onClick={handleReset}
                className="flex-1 py-2 rounded-xl bg-red-500/10 text-red-400 text-[11px]
                  font-medium hover:bg-red-500/20 transition-all"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <p className="text-[9px] text-white/20 text-center">
          CSS only · JS untouched · React state preserved
        </p>
      </div>
    </div>
  )
}

import { api } from "@/lib/api/client"
import { classifyIntent } from "@/lib/ai/intent"
import { renderAnswer, runAggregator } from "@/lib/ai/aggregators"

export type AiChatContext = {
  org?: string
  loc?: string
  includeLowStock?: boolean
  includeOpenPOs?: boolean
  includeRecentSales?: boolean
}

export type AiChatSource = "data" | "docs" | "unknown"

export type AiChatRequest = {
  prompt: string
  context?: AiChatContext
}

export type AiChatResponse = {
  reply: string
  source: AiChatSource
  /** Optional link surfaced under the reply (glossary entries provide one). */
  link?: { href: string; label: string }
}

// F6 — the AI assistant in mock mode answers from deterministic JS:
// either an aggregator over the live data, or a glossary/nav entry.
// No LLM is invoked. The classifier picks; the answer renderer formats.
//
// When the real backend lands AND VITE_API_BASE_URL is set, calls go
// to /ai/chat and the server-side LLM (see docs/AI_CHAT_BACKEND.md)
// takes over with the full tool registry.
export async function aiChat({ prompt, context }: AiChatRequest): Promise<AiChatResponse> {
  if (api.isConfigured()) {
    return api.post<AiChatResponse>("/ai/chat", { prompt, context })
  }

  const intent = classifyIntent(prompt)

  if (intent.kind === "data") {
    const answer = runAggregator(intent.key, intent.period)
    return {
      reply: `${renderAnswer(answer)}\n\n_${answer.citation}_`,
      source: "data",
    }
  }

  if (intent.kind === "help") {
    return {
      reply: intent.entry.answer,
      source: "docs",
      link: intent.entry.link,
    }
  }

  return {
    reply:
      "I can answer questions about your orders, stock, sales, customers, and taxes — and help you find pages or features. Try one of the examples below.",
    source: "unknown",
  }
}

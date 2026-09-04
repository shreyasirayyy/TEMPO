// Real LLM extraction path for Smart Capture. Calls the backend's
// /api/ai/extract-capture (Groq-backed). If the backend has no GROQ_API_KEY
// configured, or the call fails for any reason (network, rate limit,
// malformed response), this returns null and the caller falls back to the
// deterministic regex parser in captureParser.ts -- Smart Capture always
// produces a result, real AI or not, and the confirm-before-save UI is
// identical either way.

import { api, ApiError } from '../apiClient'
import type { Extracted } from '../types'

type ExtractResponse = { source: 'llm'; extracted: Extracted }

export async function tryAiExtract(rawText: string): Promise<Extracted | null> {
  if (!rawText.trim()) return null
  try {
    const response = await api.post<ExtractResponse>('/api/ai/extract-capture', { rawText })
    return response.extracted
  } catch (error) {
    // Expected when GROQ_API_KEY isn't set, the backend is offline, or the
    // user isn't authenticated yet -- silent fallback, not a user-facing error.
    if (error instanceof ApiError) return null
    return null
  }
}

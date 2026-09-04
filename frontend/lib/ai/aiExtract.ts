// Real LLM extraction path for Smart Capture. Calls the backend's
// /api/ai/extract-capture (Groq-backed). If the backend has no GROQ_API_KEY
// configured, or the call fails for any reason (network, rate limit,
// malformed response), this returns null and the caller falls back to the
// deterministic regex parser in captureParser.ts -- Smart Capture always
// produces a result, real AI or not, and the confirm-before-save UI is
// identical either way.

import { api, ApiError } from '../apiClient'
import type { Extracted } from '../types'

type ExtractResponse = { source: 'llm'; items: Extracted[] }

// Multi-item extraction: a single paste may describe several distinct
// commitments ("DBMS report due tonight... also OS assignment due
// tomorrow..."), and the backend prompt now finds all of them in one call
// instead of the app having to pre-split the text itself. Returns an empty
// array (not null) on a clean "nothing found" response, and null on any
// failure so the caller falls back to the regex parser.
export async function tryAiExtractAll(rawText: string): Promise<Extracted[] | null> {
  if (!rawText.trim()) return null
  try {
    const response = await api.post<ExtractResponse>('/api/ai/extract-capture', { rawText })
    return Array.isArray(response.items) ? response.items : null
  } catch (error) {
    // Expected when GROQ_API_KEY isn't set, the backend is offline, or the
    // user isn't authenticated yet -- silent fallback, not a user-facing error.
    if (error instanceof ApiError) return null
    return null
  }
}

// Back-compat single-item wrapper, still used by the image capture path
// (screenshots stay single-item -- one screenshot is realistically one
// confirmation/commitment).
export async function tryAiExtract(rawText: string): Promise<Extracted | null> {
  const items = await tryAiExtractAll(rawText)
  return items && items.length > 0 ? items[0] : null
}
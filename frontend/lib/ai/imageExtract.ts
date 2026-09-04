// Real OCR/extraction path for screenshot capture. Sends the image (already
// a data URL from the file reader) to the backend's vision-capable Groq
// extraction endpoint. Returns null on any failure or an empty result so
// the caller falls back to the existing generic "screenshot upload:
// filename" placeholder flow -- screenshot capture never breaks, it just
// asks the student to fill in details manually when OCR isn't available.

import { api, ApiError } from '../apiClient'
import type { Extracted } from '../types'

type ImageExtractResponse = { source: 'llm'; extracted: Extracted }

function isEmptyResult(extracted: Extracted): boolean {
  return extracted.kind === 'task' && !extracted.title.trim()
}

export async function tryAiExtractFromImage(imageDataUrl: string): Promise<Extracted | null> {
  try {
    const response = await api.post<ImageExtractResponse>('/api/ai/extract-capture-image', { imageDataUrl })
    if (isEmptyResult(response.extracted)) return null
    return response.extracted
  } catch (error) {
    if (error instanceof ApiError) return null
    return null
  }
}

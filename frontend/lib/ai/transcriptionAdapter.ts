// Backend seam for voice capture. Recording is real (browser MediaRecorder);
// transcription now calls Groq's Whisper endpoint via the backend when
// GROQ_API_KEY is configured. Falls back to a placeholder string if the
// backend isn't configured or the call fails, so voice capture never breaks
// -- it just asks the student to type what they said instead.

import { api, ApiError } from '../apiClient'

type TranscribeResponse = { source: 'llm'; text: string }

const FALLBACK_TEXT = 'Voice recording captured. Add the details Tempo should remember, then review before saving.'

export async function transcribeAudio(audio: Blob): Promise<string> {
  try {
    const response = await api.postRaw<TranscribeResponse>('/api/ai/transcribe-audio', audio, audio.type || 'audio/webm')
    return response.text.trim() || FALLBACK_TEXT
  } catch (error) {
    if (error instanceof ApiError) return FALLBACK_TEXT
    return FALLBACK_TEXT
  }
}

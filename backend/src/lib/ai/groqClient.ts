// Thin wrapper around the Groq chat-completions API (OpenAI-compatible
// schema). This is the one place a real LLM call happens in Tempo — Smart
// Capture and Application Memory extraction route through here instead of
// the regex parsers when a key is configured.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY)
}

export class GroqError extends Error {}

/**
 * Sends audio to Groq's Whisper transcription endpoint (OpenAI-compatible
 * /audio/transcriptions, multipart form-data). Throws GroqError on any
 * failure so callers can fall back gracefully.
 */
export async function groqTranscribeAudio(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new GroqError('GROQ_API_KEY is not set on the backend.')

  const model = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3'
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mimeType }), filename)
  form.append('model', model)

  let response: Response
  try {
    response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
  } catch (error) {
    throw new GroqError(`Could not reach Groq: ${error instanceof Error ? error.message : 'network error'}`)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new GroqError(`Groq transcription failed (${response.status}): ${body.slice(0, 300)}`)
  }

  const data = (await response.json().catch(() => null)) as { text?: string } | null
  if (typeof data?.text !== 'string') throw new GroqError('Groq transcription response had no text.')
  return data.text
}

/**
 * Vision-capable extraction: sends an image (data URL) alongside the same
 * extraction instructions used for text capture, so a screenshot of a
 * confirmation email or assignment portal can be read and structured in one
 * call instead of needing a separate OCR step first.
 */
export async function groqExtractJSONFromImage(systemPrompt: string, imageDataUrl: string, extraText?: string): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new GroqError('GROQ_API_KEY is not set on the backend.')

  const model = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'

  let response: Response
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: extraText || 'Read this image and extract the commitment described in it.' },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    })
  } catch (error) {
    throw new GroqError(`Could not reach Groq: ${error instanceof Error ? error.message : 'network error'}`)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new GroqError(`Groq vision request failed (${response.status}): ${body.slice(0, 300)}`)
  }

  const data = (await response.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new GroqError('Groq vision response had no message content.')

  try {
    return JSON.parse(content)
  } catch {
    throw new GroqError('Groq vision response was not valid JSON.')
  }
}
/**
 * Sends a single-turn extraction prompt and returns the parsed JSON object
 * the model replied with. Throws GroqError on any failure (missing key,
 * network error, non-200, unparsable JSON) so callers can fall back to the
 * deterministic regex parser rather than surface a raw API error to a
 * student mid-capture.
 */
export async function groqExtractJSON(systemPrompt: string, userContent: string): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new GroqError('GROQ_API_KEY is not set on the backend.')
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

  let response: Response
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
    })
  } catch (error) {
    throw new GroqError(`Could not reach Groq: ${error instanceof Error ? error.message : 'network error'}`)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new GroqError(`Groq request failed (${response.status}): ${body.slice(0, 300)}`)
  }

  const data = (await response.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new GroqError('Groq response had no message content.')

  try {
    return JSON.parse(content)
  } catch {
    throw new GroqError('Groq response was not valid JSON.')
  }
}

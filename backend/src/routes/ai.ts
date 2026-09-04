import { Router, raw } from 'express'
import { requireAuth } from '../middleware/auth'
import { groqExtractJSON, groqTranscribeAudio, groqExtractJSONFromImage, isGroqConfigured, GroqError } from '../lib/ai/groqClient'

export const aiRouter = Router()
aiRouter.use(requireAuth)

const CAPTURE_SYSTEM_PROMPT = `You are the Smart Capture extraction engine for Tempo, a student planning app.
Given a piece of unstructured text (pasted message, screenshot transcript, or voice-note transcript), decide whether it
describes a TASK (assignment, exam, chore, personal commitment) or an APPLICATION (internship/job/scholarship/hackathon
application, interview, or offer).

Respond with ONLY a single JSON object, no prose, matching exactly one of these shapes:

Task:
{
  "kind": "task",
  "title": "short task title",
  "category": "Academic" | "Career" | "Learning" | "Personal",
  "due": "human readable date label, e.g. 'Tonight 11:59 PM' or '' if unknown",
  "dueAtISO": "ISO 8601 datetime string, or null if unknown",
  "effort": "estimate like '2h' or '45m', or '' if you cannot reasonably infer it",
  "uncertainFields": ["array of field names you were NOT confident about, from: due, effort"]
}

Application:
{
  "kind": "application",
  "company": "company name, or '' if unknown",
  "role": "role/position, or '' if unknown",
  "status": "Needs Review" | "Form Started" | "In Progress" | "Applied" | "Interview" | "Offer" | "Rejected",
  "deadline": "human readable date label, or '' if unknown",
  "deadlineAtISO": "ISO 8601 datetime string, or null if unknown",
  "appliedOn": "human readable date label if the text says when they applied, else ''",
  "link": "URL mentioned in the text, or ''",
  "followUpDate": "human readable date label if a follow-up is implied, else ''",
  "uncertainFields": ["array of field names you were NOT confident about, from: company, role, deadline, status, appliedOn, link"]
}

Rules:
- Never invent a company, role, or date that is not supported by the text. Leave it '' / null and list it in uncertainFields instead.
  Guessing a plausible-sounding deadline, company, or effort when the text does not state one is a hard failure -- '' / null
  plus uncertainFields is always correct when you are not sure, even if that makes the result look incomplete.
- Only set status to "Applied" if the text clearly indicates submission already happened.
- The current date/time is provided in the user message so you can resolve relative dates like "tonight" or "Friday".`

// Same per-item task/application shapes as CAPTURE_SYSTEM_PROMPT, but the
// response is a JSON array so one paste containing several commitments
// ("DBMS report due tonight... also OS assignment due tomorrow...") comes
// back as multiple items in one call, instead of the app needing to guess
// how to split the text itself.
const MULTI_CAPTURE_SYSTEM_PROMPT = `You are the Smart Capture extraction engine for Tempo, a student planning app.
Given a piece of unstructured text (pasted message, screenshot transcript, or voice-note transcript), find EVERY distinct
commitment mentioned -- the text may describe one thing or several separate tasks/applications in the same paste (e.g. an
assignment AND an exam AND an interview prep session mentioned in the same message). Extract each one as its own item.

Respond with ONLY a single JSON object of the shape {"items": [...]}, no prose. Each entry in "items" must match exactly
one of these shapes:

Task:
{
  "kind": "task",
  "title": "short task title",
  "category": "Academic" | "Career" | "Learning" | "Personal",
  "due": "human readable date label, e.g. 'Tonight 11:59 PM' or '' if unknown",
  "dueAtISO": "ISO 8601 datetime string, or null if unknown",
  "effort": "estimate like '2h' or '45m', or '' if you cannot reasonably infer it",
  "uncertainFields": ["array of field names you were NOT confident about, from: due, effort"]
}

Application:
{
  "kind": "application",
  "company": "company name, or '' if unknown",
  "role": "role/position, or '' if unknown",
  "status": "Needs Review" | "Form Started" | "In Progress" | "Applied" | "Interview" | "Offer" | "Rejected",
  "deadline": "human readable date label, or '' if unknown",
  "deadlineAtISO": "ISO 8601 datetime string, or null if unknown",
  "appliedOn": "human readable date label if the text says when they applied, else ''",
  "link": "URL mentioned in the text, or ''",
  "followUpDate": "human readable date label if a follow-up is implied, else ''",
  "uncertainFields": ["array of field names you were NOT confident about, from: company, role, deadline, status, appliedOn, link"]
}

Rules:
- Never invent a company, role, deadline, or effort that is not clearly supported by the text. If it's not stated, use
  '' / null and add the field name to that item's uncertainFields -- do not fill in a plausible-sounding guess.
- Only set status to "Applied" if the text clearly indicates submission already happened.
- Do not split one commitment into two items (e.g. don't create a separate item for "submit" and "prepare" if the text
  describes a single assignment). Only split when the text genuinely names distinct commitments.
- If the text describes only one commitment, "items" should contain exactly one entry -- don't invent extra items to
  pad the array.
- If you truly find nothing extractable, return {"items": []}.
- The current date/time is provided in the user message so you can resolve relative dates like "tonight" or "Friday".`

function todayContext(): string {
  const now = new Date()
  return `Current date/time (ISO): ${now.toISOString()}`
}

function toEpoch(iso: unknown): number | null {
  if (typeof iso !== 'string') return null
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : ms
}

aiRouter.get('/status', (_req, res) => {
  res.json({ groqConfigured: isGroqConfigured() })
})

const HOME_SUMMARY_SYSTEM_PROMPT = `You are Tempo's Home screen assistant for a college student planning app.
You'll be given a compact JSON snapshot of the student's current situation (top priorities, usable time left today,
planning mode, an at-risk course if any, urgent applications if any, a learning track if any).

Write ONE short, warm, specific sentence (max ~30 words) telling the student what matters most right now and why --
in the style of: "You have a DBMS report due tonight, but only 2.5 usable hours remain. Protect this before flexible
tasks." or "You have 45 minutes before class. Your UX Research skill gap makes this a better use of the window than
another tutorial."

Rules:
- Reference ONLY facts present in the JSON. Never invent a course name, company, deadline, or number that isn't there.
- If multiple things compete for attention, pick the single most urgent one and say why it beats the others.
- If nothing in the JSON is urgent, say something calm and short like "Nothing urgent right now -- good time to make progress on something flexible."
- Respond with ONLY a JSON object: { "summary": "..." }. No prose outside the JSON.`

aiRouter.post('/home-summary', async (req, res) => {
  const signals = req.body?.signals
  if (!signals || typeof signals !== 'object') return res.status(400).json({ error: 'signals object is required.' })
  if (!isGroqConfigured()) return res.status(503).json({ error: 'GROQ_API_KEY is not configured on the backend.' })

  try {
    const raw = await groqExtractJSON(HOME_SUMMARY_SYSTEM_PROMPT, JSON.stringify(signals))
    const obj = raw as Record<string, unknown>
    const summary = typeof obj?.summary === 'string' ? obj.summary.trim() : ''
    if (!summary) return res.status(502).json({ error: 'Groq returned an empty summary.' })
    res.json({ source: 'llm', summary })
  } catch (error) {
    const message = error instanceof GroqError ? error.message : 'Home summary generation failed.'
    res.status(502).json({ error: message })
  }
})

const CAREER_SYSTEM_PROMPT = `You are Tempo's Career skill-context engine for a student planning app.
Given a target role/career direction (and optionally skills the student already has evidence for), identify the 4-6 most
relevant skills for that role and assess each one using evidence-based states, NOT fake percentages.

Respond with ONLY a JSON object:
{
  "requiredSkills": [ { "name": "skill name", "level": "Strong" | "Learning" | "Gap" | "Needs work", "evidence": "short reason for this level, or 'No structured evidence yet' if none was provided" } ],
  "evidenceExpectations": ["what would count as evidence of applied skill X", ...],
  "recommendedLearningAreas": ["skill names worth prioritising learning, excluding ones already Strong"]
}

Rules:
- If the student's existing skills/evidence are given, use them to set levels for matching skills instead of guessing "Gap" for everything.
- Skills not mentioned as already strong should default to "Gap" unless the role clearly implies foundational familiarity.
- Keep skill names short (2-4 words), role-specific, and non-generic where possible (e.g. "UX Research" not just "Research").
- Do not invent evidence that wasn't given.`

aiRouter.post('/career-analysis', async (req, res) => {
  const { targetRole, existingSkills } = req.body ?? {}
  if (typeof targetRole !== 'string' || !targetRole.trim()) return res.status(400).json({ error: 'targetRole is required.' })
  if (!isGroqConfigured()) return res.status(503).json({ error: 'GROQ_API_KEY is not configured on the backend.' })

  try {
    const userContent = JSON.stringify({ targetRole: targetRole.trim(), existingSkills: Array.isArray(existingSkills) ? existingSkills : [] })
    const raw = await groqExtractJSON(CAREER_SYSTEM_PROMPT, userContent)
    const obj = raw as Record<string, unknown>
    const requiredSkills = Array.isArray(obj?.requiredSkills)
      ? (obj.requiredSkills as Record<string, unknown>[])
          .filter((skill) => typeof skill?.name === 'string' && skill.name.trim())
          .slice(0, 8)
          .map((skill) => ({
            name: String(skill.name).slice(0, 60),
            level: ['Strong', 'Learning', 'Gap', 'Needs work'].includes(String(skill.level)) ? skill.level : 'Gap',
            evidence: typeof skill.evidence === 'string' ? skill.evidence.slice(0, 200) : 'No structured evidence yet',
          }))
      : []
    if (!requiredSkills.length) return res.status(502).json({ error: 'Groq returned no usable skills.' })

    res.json({
      source: 'llm',
      analysis: {
        targetRole: targetRole.trim(),
        requiredSkills,
        evidenceExpectations: Array.isArray(obj?.evidenceExpectations) ? (obj.evidenceExpectations as unknown[]).filter((s) => typeof s === 'string').slice(0, 8) : [],
        skillGaps: requiredSkills.filter((s) => s.level === 'Gap' || s.level === 'Needs work').map((s) => s.name),
        recommendedLearningAreas: Array.isArray(obj?.recommendedLearningAreas) && (obj.recommendedLearningAreas as unknown[]).every((s) => typeof s === 'string')
          ? (obj.recommendedLearningAreas as string[]).slice(0, 8)
          : requiredSkills.filter((s) => s.level !== 'Strong').map((s) => s.name),
      },
    })
  } catch (error) {
    const message = error instanceof GroqError ? error.message : 'Career analysis failed.'
    res.status(502).json({ error: message })
  }
})

aiRouter.post('/transcribe-audio', raw({ type: '*/*', limit: '15mb' }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Audio body is required.' })
  if (!isGroqConfigured()) return res.status(503).json({ error: 'GROQ_API_KEY is not configured on the backend.' })

  const mimeType = req.headers['content-type'] || 'audio/webm'
  const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : 'webm'

  try {
    const text = await groqTranscribeAudio(req.body, `voice-note.${ext}`, mimeType)
    res.json({ source: 'llm', text })
  } catch (error) {
    const message = error instanceof GroqError ? error.message : 'Transcription failed.'
    res.status(502).json({ error: message })
  }
})

const IMAGE_CAPTURE_SYSTEM_PROMPT = `${CAPTURE_SYSTEM_PROMPT}

You are being given an IMAGE instead of plain text (a screenshot of a confirmation email, assignment portal, application
form, or similar). Read the visible text in the image yourself, then extract from it using the exact same rules and JSON
shapes described above. If the image is unreadable, unrelated to a task/application, or contains no extractable
commitment, respond with {"kind": "task", "title": "", "category": "Personal", "due": "", "dueAtISO": null, "effort": "",
"uncertainFields": ["title", "due", "effort"]} so the caller can detect the empty result and fall back gracefully.`

aiRouter.post('/extract-capture-image', async (req, res) => {
  const { imageDataUrl } = req.body ?? {}
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'imageDataUrl (a data:image/... URL) is required.' })
  }
  if (!isGroqConfigured()) return res.status(503).json({ error: 'GROQ_API_KEY is not configured on the backend.' })

  try {
    const raw = await groqExtractJSONFromImage(IMAGE_CAPTURE_SYSTEM_PROMPT, imageDataUrl, `${todayContext()}\n\nExtract the commitment from this image.`)
    const obj = raw as Record<string, unknown>

    if (obj?.kind === 'task') {
      return res.json({
        source: 'llm',
        extracted: {
          kind: 'task',
          title: String(obj.title ?? ''),
          category: ['Academic', 'Career', 'Learning', 'Personal'].includes(String(obj.category)) ? obj.category : 'Academic',
          due: String(obj.due ?? ''),
          dueAt: toEpoch(obj.dueAtISO),
          effort: String(obj.effort ?? ''),
          uncertainFields: Array.isArray(obj.uncertainFields) ? obj.uncertainFields : [],
        },
      })
    }

    if (obj?.kind === 'application') {
      const validStatuses = ['Needs Review', 'Form Started', 'In Progress', 'Applied', 'Interview', 'Offer', 'Rejected']
      return res.json({
        source: 'llm',
        extracted: {
          kind: 'application',
          company: String(obj.company ?? ''),
          role: String(obj.role ?? ''),
          status: validStatuses.includes(String(obj.status)) ? obj.status : 'Needs Review',
          deadline: String(obj.deadline ?? ''),
          deadlineAt: toEpoch(obj.deadlineAtISO),
          appliedOn: String(obj.appliedOn ?? ''),
          link: String(obj.link ?? ''),
          questions: [],
          submittedItems: [],
          followUpDate: String(obj.followUpDate ?? ''),
          uncertainFields: Array.isArray(obj.uncertainFields) ? obj.uncertainFields : [],
        },
      })
    }

    return res.status(502).json({ error: 'Groq returned an unrecognized extraction shape.' })
  } catch (error) {
    const message = error instanceof GroqError ? error.message : 'Image extraction failed.'
    res.status(502).json({ error: message })
  }
})

// Shared normalizer for one raw LLM item -> the app's Extracted shape.
// Used by both the single-item image route (unchanged) and the new
// multi-item text route below, so validation/fallback rules stay identical.
function normalizeExtracted(obj: Record<string, unknown>, fallbackTitle: string): Record<string, unknown> | null {
  if (obj?.kind === 'task') {
    return {
      kind: 'task',
      title: String(obj.title ?? '').slice(0, 200) || fallbackTitle,
      category: ['Academic', 'Career', 'Learning', 'Personal'].includes(String(obj.category)) ? obj.category : 'Academic',
      due: String(obj.due ?? ''),
      dueAt: toEpoch(obj.dueAtISO),
      effort: String(obj.effort ?? ''),
      uncertainFields: Array.isArray(obj.uncertainFields) ? obj.uncertainFields : [],
    }
  }
  if (obj?.kind === 'application') {
    const validStatuses = ['Needs Review', 'Form Started', 'In Progress', 'Applied', 'Interview', 'Offer', 'Rejected']
    return {
      kind: 'application',
      company: String(obj.company ?? ''),
      role: String(obj.role ?? ''),
      status: validStatuses.includes(String(obj.status)) ? obj.status : 'Needs Review',
      deadline: String(obj.deadline ?? ''),
      deadlineAt: toEpoch(obj.deadlineAtISO),
      appliedOn: String(obj.appliedOn ?? ''),
      link: String(obj.link ?? ''),
      questions: [],
      submittedItems: [],
      followUpDate: String(obj.followUpDate ?? ''),
      uncertainFields: Array.isArray(obj.uncertainFields) ? obj.uncertainFields : [],
    }
  }
  return null
}

aiRouter.post('/extract-capture', async (req, res) => {
  const { rawText } = req.body ?? {}
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({ error: 'rawText is required.' })
  }
  if (!isGroqConfigured()) {
    return res.status(503).json({ error: 'GROQ_API_KEY is not configured on the backend.' })
  }

  try {
    const raw = await groqExtractJSON(MULTI_CAPTURE_SYSTEM_PROMPT, `${todayContext()}\n\nText to extract from:\n"""${rawText.trim()}"""`)
    const obj = raw as Record<string, unknown>
    const rawItems = Array.isArray(obj?.items) ? obj.items : null

    if (!rawItems) return res.status(502).json({ error: 'Groq returned an unrecognized extraction shape.' })

    const items = rawItems
      .map((item) => normalizeExtracted(item as Record<string, unknown>, rawText.trim().slice(0, 80)))
      .filter((item): item is Record<string, unknown> => item !== null)

    if (items.length === 0) return res.status(502).json({ error: 'Groq did not find anything extractable in this text.' })

    return res.json({ source: 'llm', items })
  } catch (error) {
    const message = error instanceof GroqError ? error.message : 'Extraction failed.'
    res.status(502).json({ error: message })
  }
})
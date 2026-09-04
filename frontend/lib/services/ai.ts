import type { CareerAnalysis } from './career'

export type AiProvider = {
  analyzeCareerGoal: (title: string) => Promise<CareerAnalysis>
  transcribeAudio: (audio: Blob) => Promise<string>
}

export function getAiProvider(): AiProvider | null {
  // Provider selection belongs here; the local prototype uses explicit adapters.
  return null
}

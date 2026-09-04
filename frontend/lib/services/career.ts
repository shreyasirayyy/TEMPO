import type { Goal, SkillLevel } from '@/lib/types'
import { api, ApiError } from '@/lib/apiClient'

export type CareerSkill = { name: string; level: SkillLevel; evidence: string }
export type CareerAnalysis = {
  targetRole: string
  requiredSkills: CareerSkill[]
  evidenceExpectations: string[]
  skillGaps: string[]
  recommendedLearningAreas: string[]
}

// Fallback catalog -- used when GROQ_API_KEY isn't configured or the LLM
// call fails, so career analysis always returns something rather than an
// error. The LLM path (below) is what actually adapts to an arbitrary role
// instead of matching one of these four buckets.
const ROLE_SKILL_CATALOG: Array<{ matches: string[]; skills: string[] }> = [
  { matches: ['frontend', 'web', 'ui'], skills: ['JavaScript', 'HTML/CSS', 'Accessibility', 'Testing', 'APIs'] },
  { matches: ['backend', 'api', 'server'], skills: ['API design', 'Databases', 'Authentication', 'Testing', 'Observability'] },
  { matches: ['data', 'analyst', 'machine learning'], skills: ['Python', 'SQL', 'Statistics', 'Data communication', 'Experiment design'] },
  { matches: ['product', 'manager'], skills: ['User research', 'Prioritisation', 'Product writing', 'Metrics', 'Stakeholder communication'] },
]

function fallbackAnalysis(title: string, existing?: Goal[]): CareerAnalysis {
  const normalized = title.trim()
  const lower = normalized.toLowerCase()
  const matched = ROLE_SKILL_CATALOG.find((entry) => entry.matches.some((term) => lower.includes(term)))
  const skills = matched?.skills ?? ['Communication', 'Problem solving', 'Project delivery', 'Technical literacy']
  const known = new Map((existing ?? []).flatMap((goal) => goal.skills.map((skill) => [skill.name.toLowerCase(), skill] as const)))
  const requiredSkills = skills.map((name) => {
    const prior = known.get(name.toLowerCase())
    return { name, level: prior?.level ?? 'Gap', evidence: prior?.evidence ?? 'No structured evidence yet' }
  })
  return {
    targetRole: normalized,
    requiredSkills,
    evidenceExpectations: skills.map((skill) => `Evidence of applied ${skill.toLowerCase()} work`),
    skillGaps: requiredSkills.filter((skill) => skill.level === 'Gap' || skill.level === 'Needs work').map((skill) => skill.name),
    recommendedLearningAreas: requiredSkills.filter((skill) => skill.level !== 'Strong').map((skill) => skill.name),
  }
}

type CareerAnalysisResponse = { source: 'llm'; analysis: CareerAnalysis }

/**
 * §12 Career -- analyzes an arbitrary target role via Groq (any role the
 * student types, not just the four hardcoded buckets below) and reuses the
 * student's existing skill evidence to set levels intelligently. Falls back
 * to the deterministic keyword-matched catalog if Groq isn't configured or
 * the call fails, so this never throws or returns nothing.
 */
export async function analyzeCareerGoal(title: string, existing?: Goal[]): Promise<CareerAnalysis> {
  const normalized = title.trim()
  try {
    const existingSkills = (existing ?? []).flatMap((goal) => goal.skills.map((skill) => ({ name: skill.name, level: skill.level, evidence: skill.evidence })))
    const response = await api.post<CareerAnalysisResponse>('/api/ai/career-analysis', { targetRole: normalized, existingSkills })
    return response.analysis
  } catch (error) {
    if (error instanceof ApiError) return fallbackAnalysis(normalized, existing)
    return fallbackAnalysis(normalized, existing)
  }
}

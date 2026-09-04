import type { Application, CaptureItem, Extracted, TimelineEvent } from '../types'
import { makeId } from '../id'

export function buildApplicationFromExtraction(extracted: Extracted, capture: CaptureItem): Application {
  if (extracted.kind !== 'application') {
    throw new Error('buildApplicationFromExtraction expects an application-kind extraction')
  }

  const timeline: TimelineEvent[] = []
  if (extracted.appliedOn) timeline.push({ id: makeId('t'), label: 'Applied', date: extracted.appliedOn })
  if (extracted.deadline) timeline.push({ id: makeId('t'), label: 'Deadline', date: extracted.deadline })
  if (extracted.followUpDate) timeline.push({ id: makeId('t'), label: 'Suggested follow-up', date: extracted.followUpDate, note: '7 days after application' })

  return {
    id: makeId('app'),
    company: extracted.company,
    role: extracted.role,
    status: extracted.status,
    deadline: extracted.deadline,
    deadlineAt: extracted.deadlineAt,
    appliedOn: extracted.appliedOn,
    link: extracted.link,
    questions: extracted.questions,
    submittedItems: extracted.submittedItems,
    proof: capture.proof,
    followUpDate: extracted.followUpDate,
    timeline,
  }
}

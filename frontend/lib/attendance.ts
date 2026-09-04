// ---------------------------------------------------------------------------
// Real attendance math instead of a flat +/-1 percentage-point hack. A course
// tracks how many classes have been held and how many of those were
// attended; percentage and "how many more do I need" are always derived from
// those two numbers so they can never drift out of sync with each other.
// ---------------------------------------------------------------------------

export function computeAttendancePct(attended: number, held: number): number {
  if (held <= 0) return 100
  return Math.round((attended / held) * 100)
}

// Smallest number of the remaining classes (0..classesLeft) the student needs
// to attend, back-to-back, to reach targetPct. Returns classesLeft (i.e. "all
// of them") if even a perfect run isn't mathematically enough this term.
export function computeNeedToAttend(attended: number, held: number, classesLeft: number, targetPct: number): number {
  for (let n = 0; n <= classesLeft; n++) {
    const projectedHeld = held + n
    const projectedAttended = attended + n
    if (projectedHeld > 0 && (projectedAttended / projectedHeld) * 100 >= targetPct) return n
  }
  return classesLeft
}

// True when attending every remaining class this term still wouldn't reach
// the target — a genuinely different situation from "attend N more classes".
export function isTargetUnreachable(attended: number, held: number, classesLeft: number, targetPct: number): boolean {
  const bestCaseHeld = held + classesLeft
  const bestCaseAttended = attended + classesLeft
  if (bestCaseHeld <= 0) return false
  return (bestCaseAttended / bestCaseHeld) * 100 < targetPct
}

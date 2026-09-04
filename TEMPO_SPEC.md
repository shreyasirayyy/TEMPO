# Tempo — Product Spec

"Your priorities, in rhythm."

Tempo is an AI-powered, priority-aware, adaptive planning platform built for
college students who are constantly balancing academics, assignments, exams,
attendance, projects, learning goals, internships, applications, career
growth, and personal commitments.

Tempo is NOT just a to-do list, calendar, timetable, or chatbot.

The core idea is:

CAPTURE → UNDERSTAND → PRIORITISE → PLAN → ADAPT → EXPLAIN → FOCUS

The student can throw almost anything into Tempo — a screenshot, pasted
text, voice note, PDF/file, application confirmation, deadline, assignment,
learning resource, etc. Tempo uses AI to understand what the student means,
extract the important information, identify the context, connect it to the
student's existing goals/commitments, suggest what matters most, and help
build a realistic plan. However, AI should NOT silently take control. AI
suggests and explains; deterministic planning rules validate feasibility,
conflicts, deadlines and available time; the student always has the final
approval and can override priorities.

See `README.md` for what of this is actually implemented vs. simulated in
this codebase.

## 1. Home — the intelligent "what matters now?" layer
Home is Tempo's daily intelligence layer: today's tasks, upcoming deadlines,
fixed classes, usable time, attendance risk, active learning goals, career
priorities, and planning mode all surface together — what matters now, what
to protect, what can wait, what changed.

## 2. Smart Capture — the main AI entry point
Screenshot, camera, paste text, voice, or file input. AI extracts task or
application info, detects multiple commitments in one input, and always
shows a review/confirm state before saving. Unknown information stays
unknown rather than being fabricated.

## 3. Application Memory
Applications are first-class objects (company, role, status, deadline,
follow-up date, etc.), reviewed before saving, and connected to the rest of
Tempo — an approaching deadline raises priority, which Home highlights and
Plan/Fix My Day can act on.

## 4. Priority Engine
Ranks by deadline proximity, impact, effort, dependencies, available time,
planning mode, and more — never deadline alone. Produces a score, priority
level, and human-readable "why". Architecture: AI suggests → deterministic
rules validate → user approves.

## 5–6. Gentle Mode / Pressure Mode
Two real planning strategies over the same context — Gentle favours
breathing room and sustainable workload; Pressure protects critical work
earlier and tolerates tighter schedules. Neither ignores deadlines or
creates impossible schedules.

## 7. Plan
Converts priorities into real time blocks using actual usable-time math from
intervals (not naive subtraction), day/week views, and full CRUD. Fixed
commitments are protected; flexible work can move.

## 8. Fix My Day
The core adaptive experience: when something changes, Tempo proposes the
minimum necessary changes to the existing plan (keep / protect / move),
using structured metadata (fixed/flexible, priority, duration, deadline) —
never task-name matching or hardcoded times — and explains what changed and
why before the user approves.

## 9. Explainability
Every important recommendation has a human-readable "why" — why this
priority, why scheduled now, why another task moved.

## 10–13. Growth: Learning, Career, Academics, Applications
- **Learning**: goal-based, session-scheduled (not just recommended),
  compared against target role / skill level / available time.
- **Career**: target role, skills as evidence-based states (Strong /
  Learning / Gap / Needs Work), not fake percentages.
- **Academics**: subjects, classes, assignments, exams, attendance risk
  feeding directly into planning (e.g. "attend the next 4 classes to
  recover above 75%").

## 14. One connected context engine
The core innovation: combining deadline + attendance + career goal + skill
gap + learning time + application status + effort + available time +
planning mode to answer "what matters next, given this student's actual
situation" — not treating every task independently.

## 15. Focus
Contextual execution: start/pause/resume/end sessions tied to a specific
task or learning session; completions feed back into future planning.

## 16. Calendar / external commitments
Future: Google/Apple Calendar sync as fixed constraints for replanning.
Never shown as "Connected" without a real connection.

## 17. Insights
Surfaces planning patterns (overload, postponed tasks, deadline clustering,
learning consistency) to help the student understand their own habits —
not generic productivity scoring.

## 18. Personalisation
Becomes more relevant based on persistent context (planning mode, target
role, skill gaps, workload, preferences) — without ever silently removing
user control.

## 19. User control is a core product rule
Tempo is AI-assisted, not AI-controlled. AI suggests/classifies/explains;
rules validate feasibility; the user approves, edits, rejects, or overrides.
Nothing important silently alters the student's commitments.

## 20. The central Tempo experience

```
DROP ANYTHING
   ↓
TEMPO UNDERSTANDS IT
   ↓
TEMPO STRUCTURES IT
   ↓
TEMPO DECIDES WHAT MATTERS
   ↓
TEMPO BUILDS A REALISTIC PLAN
   ↓
LIFE CHANGES
   ↓
FIX MY DAY ADAPTS THE PLAN
   ↓
TEMPO EXPLAINS WHY
   ↓
STUDENT EXECUTES THROUGH FOCUS
```

The goal is not maximum productivity — it's better decisions with less
decision fatigue. Tempo answers: "I already planned my day — what do I
change now?"

# Competitive Analysis: Superpowers, GSD, BMAD

Slug: lessons from the three most adopted AI workflow tools —
what MonkeyBars should steal, what it should avoid, and where it
already holds an edge.

## Context

Three tools dominate the AI coding-agent workflow space:
**Superpowers** (obra, 172k stars, 14 skills), **GSD / Get Shit Done**
(86 commands, 33 agents, ~58K lines of prompts), and **BMAD Method**
(bmad-code-org, 45.9k stars, 34+ workflows, 12+ agents). All three
are process-heavy. All three are more ambitious in scope than
MonkeyBars. The question is whether their additional weight buys
genuine value or is ceremony.

## Tool Profiles

### Superpowers (obra/superpowers)

A complete software development methodology delivered as a
multi-platform plugin (6 runtimes). Core loop:
brainstorming → git worktrees → writing plans → subagent-driven
development → finishing branch. 14 composable skills, 3,100 lines of
methodology. Skills auto-trigger via a session-start hook that
injects the bootstrap skill with `<EXTREMELY_IMPORTANT>` tags.

Process weight: **heavy methodology, low user friction**. The user
says "build X" and the skills chain automatically. The process is
invisible to the user but consumes context.

### GSD (get-shit-done)

Full project lifecycle system. 86 commands, 33 specialized agents,
~58K lines of prompt content. Core loop:
new-project → discuss-phase → plan-phase → execute-phase →
verify-work → ship. Plans are literally the prompts fed to executor
subagents (plans-as-prompts pattern). Wave-based parallel execution.
Context budget modeling with explicit degradation curves.

Process weight: **very heavy system, moderate user friction**. User
runs ~5 slash commands per phase. Complexity is in the prompt library,
not the user's workflow. ~12K tokens of fixed overhead per turn.

### BMAD Method (bmad-code-org/BMAD-METHOD)

Structured prompt library applying agile ceremony to AI development.
6+ named agent personas (PM, Architect, Developer, etc.), progressive
document chain (PRD → architecture → epics/stories), scale-adaptive
tracks (Quick Flow for bugs, full method for medium, enterprise for
large). "Party Mode" runs multi-persona debate in one chat.

Process weight: **heavy ceremony, medium-high user friction**. Fresh
chat per workflow, many docs to review before coding starts.

## Genuinely Valuable Ideas MonkeyBars Should Consider

Ranked by assessed impact, not by how flashy they are.

### 1. Subagent Dispatch With Fresh Context

**Source:** Superpowers (subagent-driven-development), GSD
(wave-based executor agents).

Both tools spawn fresh subagents per task. This is not process
theater — it is a principled solution to context degradation. A
subagent starts with a clean context window, receives exactly the
information it needs, performs one focused job, and returns a summary.
The orchestrating agent retains coordination context without being
polluted by implementation details.

MonkeyBars' current answer to context rot is "hand off and start a
fresh session." This is manual, requires user intervention, and loses
the orchestration context. Subagent dispatch is the automated,
superior version of the same idea.

**Recommendation:** Update skill bodies for `complete-task` and
`start-session` to instruct the agent to delegate implementation and
review substeps to subagents. This aligns with the existing
`subagent-review-delegation.md` todo but broadens scope to include
implementation dispatch, not just review. The instruction is
target-agnostic — each coding agent interprets "delegate to a
subagent" natively.

**Caveat:** Subagent support varies across targets. OpenCode has the
Task tool, Claude Code supports subagents, Codex support is unclear.
Any skill-body instructions must degrade gracefully when subagents are
unavailable.

### 2. Anti-Rationalization Engineering

**Source:** Superpowers (every discipline skill).

Superpowers' most distinctive feature is adversarial skill design.
Every discipline skill includes a table of excuses AI agents make
("too simple to test", "I'll add tests after", "deleting hours of
work is wasteful") with explicit counters. Skills are pressure-tested
by running scenarios without the skill, observing the agent's
rationalizations, then writing the skill to close each loophole.

This addresses a measured LLM failure mode that MonkeyBars does not
acknowledge: agents will rationalize skipping disciplines. MonkeyBars
commands are instructions ("run preflight", "update status") but
include no defenses against the agent deciding to shortcut them.

**Recommendation:** Add anti-rationalization sections to the most
critical commands: `complete-task` (agents skip preflight or
advance), `workflow-check` (agents auto-fix instead of reporting),
`context-boundary` (agents continue when they should hand off).
These should be developed empirically by running the workflow without
the defenses and cataloguing the observed shortcuts.

**Caveat:** Anti-rationalization content adds to skill size and
context consumption. MonkeyBars skills are currently compact (~50
lines per command body). Adding rationalization tables would push
them toward Superpowers' 150-300 line range. The tradeoff is worth
it only for commands where agent shortcutting has been observed.

### 3. Multi-Stage Review With Institutional Distrust

**Source:** Superpowers (subagent-driven-development).

Superpowers' spec reviewer is told: "The implementer finished
suspiciously quickly. Their report may be incomplete, inaccurate, or
optimistic." A separate subagent independently reads the code and
verifies against the spec, without trusting the implementer's
self-report. Only after spec compliance passes does a code quality
reviewer run.

This addresses the well-documented LLM self-validation problem:
agents claim success and move on without verifying. MonkeyBars'
`/review-work` is invoked manually after the fact, not integrated
into the task loop.

**Recommendation:** If subagent dispatch is adopted (item 1), the
review stage should include explicit distrust framing. The reviewer
subagent should receive the spec/acceptance criteria and the actual
code diff, but NOT the implementer's status report. It should form
its own verdict independently.

### 4. Testing Methodology

**Source:** Superpowers (test-driven-development skill, 371 lines).

Superpowers enforces strict TDD as an "iron law": no production code
without a failing test first, delete code written before tests, 11
rationalization rebuttals, 13 red flags. Whether or not you agree
with strict TDD, the absence of ANY testing methodology in MonkeyBars
is a gap. The preflight system runs existing checks but does not
instruct the agent to write tests.

**Recommendation:** This is a values decision, not a technical one.
MonkeyBars could:
(a) Add a lightweight testing skill ("write tests before marking a
task complete") without Superpowers' dogmatic enforcement.
(b) Add testing guidance to the `phase.md` template (each task's
verify field should reference a test).
(c) Leave testing to the project's own AGENTS.md and focus on
workflow tracking.

Option (b) is the most MonkeyBars-aligned: it extends the existing
template structure rather than adding a new skill.

### 5. Scale-Adaptive Process Selection

**Source:** BMAD (Quick Flow / BMad Method / Enterprise tracks).

BMAD acknowledges that not every task needs the same process weight.
A bug fix gets Quick Flow (skip planning, just fix it). A medium
feature gets the full method. A large system gets enterprise
ceremony. MonkeyBars' 12 commands apply uniformly regardless of task
scale.

**Recommendation:** MonkeyBars already has `/fix-bug` as a
lightweight interrupt. Extend this pattern with explicit sizing
guidance in `/initialize-monkeybars` or `/brainstorm-plan`: small
scope (1-3 tasks) can skip formal phasing and use a single flat task
list; medium scope uses the standard plan → phase → task loop; large
scope uses the full workflow with formal reviews. This is a
skill-body change, not a CLI change.

### 6. Context Budget Modeling

**Source:** GSD (explicit degradation curves).

GSD models context quality as a function of consumption: 0-30% is
peak quality, 50-70% is degrading, 70%+ is poor. Plans are sized to
target ~50% consumption. Split signals fire at specific thresholds.
MonkeyBars' `/context-boundary` is heuristic-based ("worktree state,
task adjacency, context weight") without quantified thresholds.

**Recommendation:** Add specific threshold guidance to
`context-boundary`: recommend handoff when estimated context
consumption exceeds 50%, strongly recommend at 70%. The thresholds
themselves are heuristic (agents cannot precisely measure their own
context usage), but naming specific numbers is more actionable than
"evaluate context weight."

## Ideas to Avoid

### Enterprise Agile Ceremony (BMAD)

BMAD's progressive document chain (brainstorming report → product
brief → PRD → UX spec → architecture doc → epics/stories →
implementation readiness check → sprint planning → story files)
front-loads 8+ documents before any code is written. This is
disproportionate for most AI-assisted development. The "Scale-
Domain-Adaptive intelligence" that selects tracks is three if/else
branches, not actual intelligence.

MonkeyBars' plan → phase → task structure is already lighter.
Do not add more document types to the planning pipeline.

### 58K Lines of Prompt Content (GSD)

GSD's scale (~58K lines of prompts, 86 commands, 33 agents) makes
it hard to understand, modify, or debug when something goes wrong.
The ~12K token overhead per turn is a real cost. MonkeyBars' ~600
lines of command content is a strength, not a deficiency.

### Agent Personas (BMAD)

BMAD's named agent personas (PM "John", Architect "Winston",
Developer "Amelia") add personality but no measurable capability.
The LLM does not produce better architecture because you told it to
roleplay as "Winston." Do not add persona framing to MonkeyBars
commands.

### Crypto Tokens (GSD)

GSD links a $GSD token on Solana in its README. Do not.

## Where MonkeyBars Already Holds an Edge

### Deterministic CLI Validation

MonkeyBars' `check` command cross-validates status.md, phase files,
plan.md, and git state with typed severity findings. No other tool
has equivalent cross-file consistency checking with a CLI that
returns structured results. GSD's `gsd-sdk` handles state operations
but does not cross-validate. Superpowers has no CLI validation at
all.

### Single-Source Generator Architecture

The workflow-src → monkeybars/ pipeline is architecturally cleaner
than GSD's installer transforms, BMAD's per-module packaging, or
Superpowers' manual multi-platform file maintenance. Changes to
canonical content automatically propagate to all three targets. This
is an engineering quality that compounds over time.

### Advisory Hook Contract

MonkeyBars' hooks are explicitly read-only and non-intrusive.
Superpowers' session-start hook injects content with
`<EXTREMELY_IMPORTANT>` tags. GSD has a prompt guard hook that
scans writes. MonkeyBars' restraint here is a defensible design
choice: hooks that never block never break.

### Compact Skill Bodies

MonkeyBars' commands average ~50 lines of body content. Superpowers
averages ~225 lines. GSD workflows run to 1,600+ lines. Compact
skills consume less context, leaving more room for the user's actual
code. The challenge is keeping skills compact while adding the
defenses described above.

## Acceptance Criteria

This document is a research artifact. It does not require
implementation. Acceptance:

- Filed in `docs/agents/todo/` and committed.
- Individual items above are promoted to separate todo files or plan
  phases when the team decides to act on them.
- Items that overlap existing todos (e.g., subagent review delegation)
  reference this document for additional context.

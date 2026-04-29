# Subagent Review Delegation

Slug: delegate review/verification steps to subagents so the main
agent context stays lean.

## Context

Several MonkeyBars commands include review-heavy steps that pull
significant content into the main agent's context: reading phase
files, running git diffs, checking acceptance criteria, validating
invariants via `monkeybars check`. That content is only needed to
produce a pass/fail verdict but stays in context for the rest of the
session, contributing to context bloat — the exact problem MonkeyBars'
context-boundary model is designed to mitigate.

Coding agents across all three targets (OpenCode, Claude Code, Codex)
support subagent/task delegation where a child agent runs in a
separate context, performs work, and returns a summary to the parent.
Review steps are a natural fit: self-contained, read-heavy, with a
well-defined output shape.

## Candidate Review Steps

| Command | Step | What the subagent would do |
|---|---|---|
| `complete-task` | Preflight verification | Read phase file, run `monkeybars check`, diff against acceptance criteria, return verdict |
| `create-phase` | Phase file review | Read generated phase file, validate structure and task breakdown, return summary |
| `start-session` | Orientation read | Read phase file + status + recent git log, return compact briefing |
| `context-boundary` | Context health assessment | Evaluate remaining context budget, summarize what was accomplished, return recommendation |

## Recommendation

Update the skill bodies for the candidate commands to instruct the
agent to delegate review substeps to a subagent (OpenCode Task tool,
Claude subagent, Codex equivalent). The subagent receives a focused
prompt and returns a structured summary. The main agent acts on the
summary without loading the raw review material.

This is a skill-body change, not a CLI or generator change. The
adapter generator does not need to emit subagent-specific syntax
because the instruction is target-agnostic ("delegate this step to a
subagent") and each agent interprets it natively.

## Open Questions

- Should the subagent prompt be a separate template inlined via
  `include_templates`, or just inline instructions in the command body?
- Should the skill body prescribe the exact subagent output shape (e.g.
  a structured checklist) or leave it open-ended?
- Do any targets have subagent limitations that would make this
  unreliable (e.g. subagent can't run CLI tools, can't read files
  outside a sandbox)?

## Acceptance Criteria

- At least `complete-task` and `start-session` delegate their
  review/orientation steps to a subagent in the generated skill bodies.
- The main agent context after a `complete-task` run does not contain
  the full diff or phase-file contents — only the subagent's summary.
- The pattern works across OpenCode, Claude Code, and Codex (or
  documents target-specific limitations).
- `bun run test` passes; `bun run generate` produces clean adapters.

# Agent instructions — Azaria

All agents (Claude Code, Codex, Cursor, Cline, Windsurf, others): read `CLAUDE.md` first. It is the
project context entry point: what Azaria is, the stack, verified commands, conventions, protected
decisions and the status checkpoint. The rules there apply to every agent runtime.

Then load the project skill in `.claude/skills/azaria-vue-supabase/SKILL.md` for how to add a
screen, an RPC function, a migration, a test, and how to verify before claiming done.

Shared engineering practices live in the owner's workflow library
(`<OneDrive>/Documents/Workflow and skills/`, see `CLAUDE.md`). If that folder is not on your
machine, follow `CLAUDE.md` and the project skill and note which library workflow you would have used.

Rules that apply regardless of runtime:

1. Spec wins: `Azaria_Master_Development_Prompt.md`. ADRs in `docs/architecture/ADR.md` are protected.
2. Work from `docs/superpowers/plans/2026-11-16-azaria-mvp.md`; tick tasks as you complete them.
3. Tests before claims: run the relevant check and report PASS/FAIL/BLOCKED honestly.
4. No secrets in the repo. No destructive commands against remote Supabase projects.
5. Do not push, deploy or create cloud resources unless the owner asks.
6. Commit messages: plain conventional commits (`feat:`, `fix:`, `docs:`, `test:`). No attribution lines.
7. Update the status checkpoint in `CLAUDE.md` at the end of a work session.

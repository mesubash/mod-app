# AI Guardrails — MOD

Binding for anything written in this repository. Inherited from the research
repo (`mesubash/mod`) so the two halves are held to one standard; rule 11 is
adapted for the product.

Binding rules for any AI-written code or document in this repo. Gitignored
working standard. Distilled 2026-08-15 from: Wikipedia:Signs of AI writing
(WP:AISIGNS), GitClear AI Code Quality 2025 (211M LOC), Zhu/Tsantalis/Rigby
"AI-Generated Smells" (arXiv), Sauvignon "AI Slop Has a Shape", Jain (Aviator),
Brito (Cheesecake Labs), Olawuwo (dev.to), plus the ponytail skill. Full
source list at bottom.

## Code rules

1. **Minimum code that solves the task.** LOC correlates with architectural
   decay (ρ=0.94). Every line is a liability.
2. **Search before writing.** Grep repo, then stdlib, then installed deps.
   Never re-implement what exists (most common AI slop). No near-duplicate
   helpers (`format_x`/`format_x2`).
3. **No speculative structure.** No interface/factory/class with one
   implementation, no config for constants, no scaffolding "for later",
   no Manager/Handler god classes, no layers the change doesn't need.
4. **Comments say WHY, never WHAT.** Delete any comment whose removal loses
   nothing. No narrating syntax, no section banners, no docstrings that
   restate the signature. Comment only intent, constraint, or surprise.
5. **No defensive padding.** Validate at trust boundaries only (here: PDF
   parsing = trust boundary; internal function args = not). Never catch-and-
   log-and-continue; let internal errors propagate loudly. Never re-check
   what the caller guarantees.
6. **No cargo-cult resilience.** Retries/backoff/logging only for a
   demonstrated failure mode.
7. **No leftovers.** No unused imports, dead helpers, debug prints,
   hardcoded paths outside one constants block, half-done renames.
8. **Verify every import/package exists** before use (19.7% of AI-suggested
   packages are hallucinated).
9. **Match repo conventions exactly** (naming, layout, existing patterns).
10. **Test the edges, not the happy path.** Off-by-one, empty, boundary.
    One small runnable check per non-trivial unit — no fixture forests.
11. **Deliberate shortcuts get a `ponytail:` comment** naming ceiling +
    upgrade path.
12. **Commit finished work.** No half-baked code that needs revisiting in
    two weeks (churn is the AI-code signature).
13. **Commit messages never mention the AI.** No self-reference, no
    Co-Authored-By AI trailers, no "generated with" lines. Terse, concrete,
    about what changed — nothing else.

## Document rules

1. **Facts, flat register.** No significance inflation: banned — "testament",
   "pivotal", "underscores", "highlights the importance", "plays a vital
   role", "evolving landscape", "marks a milestone", trailing "-ing"
   interpretation clauses ("...reflecting its growing role").
2. **Banned vocabulary defaults:** delve, tapestry, showcase, boasts,
   meticulous, garner, intricate, interplay, fostering, enduring, enhance,
   bolstered, vibrant, crucial, key (adj.), leverage, robust, seamless,
   comprehensive (unless literally exhaustive), "Additionally" (sentence-
   initial), deep dive.
3. **Plain copulas.** "is/are/has", not "serves as / stands as / features /
   represents / functions as".
4. **No rhetorical templates:** not-just-X-but-Y, it's-not-X-it's-Y,
   rule-of-three triplets, "Despite challenges... future prospects",
   Conclusion/recap sections, "In summary".
5. **Repeat the plain term** for the same referent; no synonym rotation.
6. **Structure discipline:** sentence-case headings, no skipped levels, no
   empty container headings, no title-as-heading, no horizontal-rule
   dividers between every section, no bold-label-colon bullet walls where
   prose works, minimal bold, no emoji decoration, no gratuitous mini-tables.
7. **Citations are real or absent.** Every URL resolves; every claim traces
   to a source actually read; no invented discourse ("experts argue",
   "observers note") — name the source or cut the claim. No vague
   quantity inflation (one source ≠ "several studies").
8. **No assistant residue:** no "I hope this helps", no knowledge-cutoff
   disclaimers, no "[Your Name]" placeholders, no "it's important to note",
   no compliance assurances ("ensured accuracy"), no describing what was
   preserved — only what changed.
9. **Specific beats generic.** Keep the sharp number/name; never trade
   specificity for grandeur.
10. **Em dashes rationed.** Prefer commas, parentheses, colons.
11. **Every claim traces to the research, or is marked open.** Numbers
    shown to a user, written in a document, or used to justify a design
    decision must come from `docs/product.md` (which cites the study) or be
    explicitly marked as unmeasured. Do not invent a statistic, a traveller
    count, or a percentage improvement. `docs/product.md` lists what the
    research supports, what it forbids, and what is open — if a claim is not
    in one of those three lists, it does not go in the product.

## Pre-delivery checklist (run on every artifact)

- [ ] Could a line/section be deleted with nothing lost? Delete it.
- [ ] Any helper duplicating repo/stdlib? Replace with the existing one.
- [ ] Any comment narrating code? Delete.
- [ ] Any banned word/template above? Rewrite plainly.
- [ ] Every citation/URL/import verified to exist?
- [ ] Edges tested (empty/boundary/off-by-one)?
- [ ] Leftovers (unused imports, debug prints, placeholders) removed?

## Sources

- Wikipedia:Signs of AI writing — <https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing>
- GitClear, AI Copilot Code Quality 2025 — <https://www.gitclear.com/ai_assistant_code_quality_2025_research> (summary: <https://www.jonas.rs/2025/02/09/report-summary-gitclear-ai-code-quality-research-2025.html>)
- Zhu, Tsantalis, Rigby, "AI-Generated Smells" — arXiv (Concordia University)
- Sauvignon, "AI Slop Has a Shape" — <https://lobsterone.ai/blog/ai-slop-patterns/>
- Jain, "AI Code Looks Right. That's the Problem." — <https://www.aviator.co/blog/how-to-avoid-ai-code-slop/>
- Olawuwo, "AI Slop Is Becoming a Software Engineering Problem" — dev.to
- Brito, "Reviewing Code Generated by AI" — Cheesecake Labs
- Chandra, "9 Dead Giveaways That AI Wrote This Code" — Level Up Coding
- ponytail skill (lazy ladder), local plugin

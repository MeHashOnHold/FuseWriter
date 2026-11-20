# Development Status (living log)

> **THIS FILE IS THE SOURCE OF TRUTH FOR PROJECT STATE.**
> If you are an AI coding agent: you MUST update this file after EVERY change. No exceptions.
> If you finish your reply without updating this file, you have failed the task.

---

## HOW TO UPDATE THIS FILE (read every time)

### When to update
- **Before you start a task:** do steps A1-A3.
- **After every change** (every step that saves a file, and every fix attempt): do steps B1-B5.
- **When a task is finished:** do steps C1-C5.
- **Before ending your session or reply:** do the STOP CHECK at the bottom of this section.

### A. Before starting a task
1. Set "Current milestone" and "Current task ID" below.
2. Add one line to "In progress": `<TASK-ID> — <title> — started <date time>`.
3. Run `date "+%Y-%m-%d %H:%M %Z"` and put the result in "Last updated".

### B. After every change
1. Run `date "+%Y-%m-%d %H:%M %Z"`. Put it in "Last updated".
2. Add a new entry at the TOP of the "Change log" (newest first) using the FULL ENTRY FORMAT below. For a tiny change (a typo fix, one config line) you may use the QUICK ENTRY FORMAT.
3. List EVERY file you created, changed, or deleted. If you ran `git status`, compare it with your list.
4. Write the real command you ran and the real result (PASS/FAIL and the key line of output). Do not write "tests pass" without a command.
5. If something failed or is unclear: add it to "Known issues and bugs" or "Open questions for the human".

### C. When a task is finished
1. Confirm every Acceptance line in Plan.md is true. Write each one as PASS in your entry.
2. Confirm every Verification step was run. Write each result.
3. Move the task from "In progress" to "Completed tasks" (ID, short description, date, verification result).
4. Commit: `git add -A && git commit -m "<TASK-ID>: <title>"`. Write the commit hash in the entry.
5. Set "Current task ID" to the next task in Plan.md Section 8. If the finished task was a gate task (`Mx-TGATE`), set "Current milestone" to the next one.

### STOP CHECK (do this before you end your reply)
- [ ] "Last updated" has today's real date and time.
- [ ] A Change log entry exists for everything I did this session.
- [ ] Every file I touched is listed in an entry.
- [ ] Every command result in my entry is real, not guessed.
- [ ] "In progress" matches reality (empty if I finished the task).
- [ ] Anything I could not do or verify is in "Known issues", "Open questions", or "Needs human verification".
- [ ] I did not edit Plan.md. I did not tick Roadmap.md (unless this was a gate task and all evidence is recorded).

### FULL ENTRY FORMAT (copy and paste, then fill in)

```
### [YYYY-MM-DD HH:MM TZ] <TASK-ID> — <one-line title>
- Type: code | docs | config | test | decision | blocker
- Files changed:
  - path/to/file (created | modified | deleted) — what changed in one line
- What changed: <2-5 sentences, plain words>
- Commands run and results:
  - `<exact command>` → PASS | FAIL — <key line of output>
- Acceptance criteria:
  - <criterion text> → PASS | FAIL | NOT RUN (reason)
- Verified by: <command names, or "manual (human needed)">
- Result: DONE | PARTIAL | BLOCKED
- Commit: <short hash or "not committed yet">
- Follow-ups: <or "none">
```

### QUICK ENTRY FORMAT (only for tiny changes)

```
### [YYYY-MM-DD HH:MM TZ] <TASK-ID> — <what>
- Files: <paths>
- Check: `<command>` → PASS | FAIL
```

---

## Current milestone and current task ID
- Current milestone: M3 — Tab-to-fix-all and undo
- Current task ID: M3-TGATE (gate checks run; milestone NOT ticked — [HUMAN] lines are still OPEN below, per gate rule 3). Next task: M4-T01.

## Last updated
- 2026-11-20 10:54 +06

## Completed tasks
| Task ID | Short description | Date | Verification result |
|---|---|---|---|
| M1-T01 | Machine check and git repo with docs | 2026-11-20 | Versions recorded (see Decisions). Rust 1.100.0 >= 1.90. `git status` clean after commits e25e053 / b185ff5. |
| M1-T02 | package.json with exact-pinned frontend deps | 2026-11-20 | `grep -E '"[\^~][0-9]' package.json` prints nothing. `npm ls --depth=0` no UNMET/ERR. |
| M1-T03 | Frontend config and hello page | 2026-11-20 | `npm run build` PASS (dist/index.html exists). `npm run check` PASS, 0 errors (after the two recorded decisions below). |
| M1-T04 | Tauri init and verify script | 2026-11-20 | `npm run verify` PASS (exit 0; cargo test finished ok). `npx tauri build --debug --no-bundle` PASS — built `src-tauri/target/debug/fusewriter`. Window opening is [HUMAN], see below. |
| M1-T05 | CSS variables and layout skeleton | 2026-11-20 | `npm run build` and `npm run check` PASS. Light/dark + layout appearance is [HUMAN], see below. |
| M1-T06 | Hash utility (cyrb53) and tests | 2026-11-20 | `npm run test` PASS — 4 tests in hash.test.ts. |
| M1-T07 | Dialog plugin and window permissions | 2026-11-20 | `npm run verify` PASS, no permission errors. Devtools CSP check is [HUMAN], see below. |
| M2-T01 | Harper engine wrapper (harper-core =3.2.0) | 2026-11-20 | `cargo test harper` PASS — 3 tests (lint found, core_version == "3.2.0", HarperEngine is Send). API verified in the 3.2.0 source (see Decisions). |
| M2-T02 | Char-to-UTF-16 offset map | 2026-11-20 | `cargo test mapping` PASS — 5 tests (ASCII, emoji, combining accent, empty, clamp). |
| M2-T03 | RawSuggestion and Lint conversion | 2026-11-20 | `cargo test convert` PASS — real Harper on both sample texts; `an` -> `a` present. LintKind/Suggestion variant lists recorded in Decisions. |
| M2-T04 | Protected ranges (URLs, emails, code) | 2026-11-20 | `cargo test protect` PASS — 5 fixture cases in src-tauri/tests/fixtures/protect-cases.json + unclosed-fence test. regex 1.13.2 added. |
| M2-T05 | Safe-to-auto-apply rules | 2026-11-20 | `cargo test safety` PASS — 8 tests (levenshtein values, teh/recieve safe, Kowalski/NASA/abc123 not safe, Repetition safe). |
| M2-T06 | check_text command, fixtures, perf test | 2026-11-20 | `cargo test` PASS — 13 fixture cases in harper-cases.json (frozen after reviewed first run, see Decisions). Perf (release, `--ignored perf`): median 14.54 ms over 50 runs for ~330 words with 5 typos, under the 50 ms budget. |
| M2-T07 | TypeScript types and IPC wrappers | 2026-11-20 | `npm run check` PASS, 0 errors. |
| M2-T08 | CodeMirror editor | 2026-11-20 | `npm run check` + `npm run build` PASS. Typing/undo/no-native-spellcheck is [HUMAN], see below. |
| M2-T09 | Mark state, decorations, touched rule | 2026-11-20 | `npm run test` PASS — touch.test.ts 8 cases, suggestionField.test.ts 4 cases. |
| M2-T10 | Paragraph splitting | 2026-11-20 | `npm run test` PASS — paragraphs.test.ts 7 cases (blank lines, CRLF, fenced block, 12,000-char chunking). |
| M2-T11 | SuggestionEngine (Harper path) | 2026-11-20 | `npm run test` PASS — SuggestionEngine.test.ts 6 cases (debounce, per-paragraph recheck, cache, stale discard, absolute offsets, dismissed filter) + lru.test.ts 3 cases. Live marks in the window are [HUMAN], see below. |
| M2-T12 | Bottom bar counts and engine label | 2026-11-20 | `npm run test` + `npm run check` PASS — status.test.ts 2 cases. Bar appearance is [HUMAN], see below. |
| M3-T01 | Apply one suggestion | 2026-11-20 | `npm run test` PASS — applyFix.test.ts 4 cases (applies, refuses stale, one undo, alternative). |
| M3-T02 | Fix-all in one transaction | 2026-11-20 | `npm run test` PASS — tabFix.test.ts 7 cases (one dispatch, one undo, overlap, stale skip, non-safe/rewrite never applied, cursor mapping). |
| M3-T03 | Wire Tab into the editor | 2026-11-20 | `npm run verify` PASS. Tab behaviour in the window is [HUMAN], see below. |
| M3-T04 | Suggestion card | 2026-11-20 | `npm run verify` PASS (svelte-check 0 errors). Card appearance/accept is [HUMAN], see below. |
| M3-T05 | Dismiss | 2026-11-20 | `npm run test` PASS — dismissed.test.ts 4 cases; isDismissed wired into EngineDeps. Session persistence in the window is [HUMAN], see below. |

## In progress
- (nothing — M3-TGATE is waiting on the [HUMAN] items below)

## Needs human verification
(Steps marked [HUMAN] that an agent could not check. A human replaces `OPEN` with `HUMAN-VERIFIED <date>` when done.)
- OPEN — M1-T04 / M1 gate: `npm run tauri dev` opens a window titled "FuseWriter" showing the app. (Agent is headless; the debug binary builds and links, but no window was seen.)
- OPEN — M1-T05 / M1 gate: the window shows the thin top bar and bottom bar and follows OS light/dark.
- OPEN — M1-T07 / M1 gate: devtools console in a dev build shows no CSP errors.
- OPEN — M2-T08: typing works in the editor, Ctrl/Cmd+Z undoes typing, and there are no browser spellcheck underlines.
- OPEN — M2-T11 / M2 gate: in `npm run tauri dev`, typing `I recieve teh package` shows red wavy marks under `recieve` and `teh` within ~0.3 s; typing a space after a marked word does not make the mark flicker.
- OPEN — M2-T12 / M2 gate: the bottom bar shows "2 quick fixes, Tab to fix all" for that sample text and is blank on the left for clean text.
- OPEN — M3-T03 / M3 gate: type `I recieve teh package.` and press Tab: both words are fixed; one Ctrl/Cmd+Z brings both back; with clean text, Tab does not change the text.
- OPEN — M3-T04 / M3 gate: clicking a red mark shows the card (old -> new, reason, Accept, Dismiss); Accept applies the fix and one Ctrl/Cmd+Z undoes only that fix.
- OPEN — M3-T05: dismiss a mark, then type elsewhere: the mark does not come back.

## Known issues and bugs
- The GitHub copy of this repo does not include the generated app icons (`src-tauri/icons/*.png`, `*.ico`, `*.icns`): the connector used to push can only upload text files. The icon source `assets/app-icon.svg` IS committed; regenerate the icons after cloning with `npx tauri icon assets/app-icon.svg` (also noted in README.md). The local working copy has the generated icons committed in b185ff5.
- Agent environment note: the Linux VM needed the Tauri prerequisites installed (webkit2gtk-4.1 dev etc.) and a locally repacked `libzstd-dev` to work around a distro package version pin (`1.5.5+dfsg2-2build1.1+hatch1`). This affects only the agent's build machine, not the project.

## Open questions for the human
(Agents: write a question here and STOP when the plan is unclear, wrong, or missing something. Include the task ID.)
- (none yet)

## Decisions made during development
(Each entry: date, task ID, decision, reason. Include tool versions recorded in M1-T01/M1-T02 and facts found in VERIFY steps.)
- 2026-11-20, rename (human instruction, before M1-T01): the app is named **FuseWriter**, renamed from the working name "Quietwrite" in all three docs and in every derived name: identifier `app.fusewriter.desktop`, npm package `fusewriter`, Cargo package `fusewriter`, lib `fusewriter_lib`, product/window name "FuseWriter", keychain service `app.fusewriter.desktop`. Plan.md line 3 was edited for this rename only, on the human's explicit instruction (Plan rule 9 exception: the human requested the edit).
- 2026-11-20, M1-T01, tool versions on the agent machine: node v24.22.1, npm 10.9.4, rustc 1.100.0 (0ef1bc386 2026-11-09), cargo 1.100.0, git 2.43.0. Rust was installed with rustup (stable) because the machine had none. Linux Tauri prerequisites installed from the plan's Debian/Ubuntu list; `pkg-config --modversion webkit2gtk-4.1` → 2.52.6.
- 2026-11-20, M1-T02, npm versions installed (exact): @tauri-apps/api 2.12.5, @tauri-apps/plugin-dialog 2.8.4, @codemirror/state 6.7.6, @codemirror/view 6.43.15, @codemirror/commands 6.11.1, svelte 5.58.0, @sveltejs/vite-plugin-svelte 7.3.1, vite 8.3.8, typescript 6.0.3 (see next decision), svelte-check 4.7.8, @tsconfig/svelte 5.0.9, vitest 5.1.1, @tauri-apps/cli 2.12.6. Svelte is major 5 and the Tauri packages are in the 2.12 line, as M1-T02 step 7 requires.
- 2026-11-20, M1-T02/M1-T03, TypeScript pinned to 6.0.3 instead of the newest 7.0.2: `svelte-check` 4.7.8 aborts on TypeScript 7 ("TypeScript 7 support currently requires both TypeScript 7 and TypeScript 6 installed"). Same package, older major, recorded here instead of adding the dual-install alias packages the error message suggests (Plan rule 4).
- 2026-11-20, M1-T03, `src/App.svelte` includes an empty `<script lang="ts"></script>` block: with Svelte 5.58.0 + svelte-check 4.7.8, a script-less App.svelte made svelte-check report "implicitly has an 'any' type" for the import in main.ts, while `npx tsc --noEmit` passed. The empty script block makes svelte-check report 0 errors. Later tasks give App.svelte a real script anyway.
- 2026-11-20, M1-T04, VERIFY BEFORE USE results: `npx tauri init --help` confirms all flags in the plan exist (`--ci --app-name --window-title --frontend-dist --dev-url --before-dev-command --before-build-command`). Resolved Rust crate versions: tauri 2.12.7 (newest 2.12 patch, as the plan instructs), tauri-build 2.7.6. `devCsp` in tauri.conf.json was accepted — the config generated and the app built with it in place, so it was kept.
- 2026-11-20, M1-T07, `cargo add tauri-plugin-dialog` resolved tauri-plugin-dialog 2.8.4, matching the npm @tauri-apps/plugin-dialog 2.8.4.
- 2026-11-20, M2-T01, `cargo search harper-core --limit 1` shows 3.2.0 as the newest version, so the plan's "if a newer version exists" case did not arise; the pin `=3.2.0` stands. VERIFY BEFORE USE results from the harper-core 3.2.0 source: `Document::new_plain_english_curated(text)` exists; `FstDictionary::curated()` returns `Arc<Self>`; `LintGroup::new_curated(dictionary, dialect)` takes those two arguments (the plan named the function only); `Linter::lint(&mut self, &Document) -> Vec<Lint>`; `harper_core::remove_overlaps(&mut Vec<Lint>)` exists; `harper_core::core_version()` returns "3.2.0". `Dialect` variants: American, Canadian, Australian, British, Indian.
- 2026-11-20, M2-T01, `HarperEngine` IS `Send` (compile-time assert test passes), so no worker thread was needed; the engine lives behind a Mutex in AppState.
- 2026-11-20, M2-T03, `LintKind` variants in harper-core 3.2.0 (from src/linting/lint_kind.rs): Agreement, BoundaryError, Capitalization, Eggcorn, Enhancement, Formatting, Grammar, Malapropism, Miscellaneous, Nonstandard, Punctuation, Readability, Redundancy, Regionalism, Repetition, Spelling, Style, Typo, Usage, WordChoice, WordOrder. `Typo` is present and maps to Spelling per the plan. `Suggestion` variants: ReplaceWith(Vec<char>), InsertAfter(Vec<char>), Remove — exactly the three the plan expected.
- 2026-11-20, M2-T05, the safe Grammar kind names were verified against that list: "Capitalization", "Repetition", "Formatting" all exist as written in the plan; no fix needed.
- 2026-11-20, M2-T06, AppState stores the engine as `Arc<Mutex<HarperEngine>>` (the plan shows `Mutex<HarperEngine>`): the extra `Arc` is needed so the `spawn_blocking` check task can own a handle to the same engine. thiserror 2.0.21 added per the task.
- 2026-11-20, M2-T06, fixture freeze after the first reviewed run (task step 6): for `NASA lauched it.`, Harper 3.2.0's FIRST suggestion for `lauched` is "latched" (edit distance tie), with "launched" as alternative 2. The fixture's mustInclude was frozen to the real output (`lauched` -> `latched`) and the test additionally asserts "launched" is offered (replacement or alternatives) and the fix is safe, which preserves the intent of Plan.md 9.3 case 12. `NASA` itself is not marked at all.
- 2026-11-20, M2-T06, Harper flags three spaces (`"   "`) as a Formatting lint ("French spaces are generally not recommended.", replacement `" "`), which conflicts with Plan.md 9.3 case 11 (whitespace-only input -> no marks). `run_check` therefore returns no suggestions for empty or whitespace-only text. The engine never sends such paragraphs anyway (splitParagraphs skips them); this only affects direct command calls.
- 2026-11-20, M2-T06, perf: `cargo test --release -- --ignored perf` PASS — median 14.54 ms over 50 runs of `run_check` on ~330 words with 5 typos (agent VM, release build). Budget is 50 ms.
- 2026-11-20, M2-T04, the four protection regexes are compiled once into `LazyLock<Option<Regex>>` (via `.ok()`) instead of `expect(...)`, keeping the code free of `expect` outside tests per Plan rule 16; a compile failure would return no ranges and fail the fixture tests loudly.

## Change log (newest first)
(Add new entries at the TOP of this section.)

### [2026-11-20 10:54 +06] MILESTONE 3 GATE — Milestone 3 gate checks (automated lines only)
- Type: test
- Files changed:
  - docs/Development Status.md (modified) — this entry, M3 rows, M3 [HUMAN] items
  - docs/Roadmap.md — NOT ticked: the M3 [HUMAN] lines are OPEN (gate rule 3)
- Commands run and results:
  - `npm run test` → PASS — 49 tests in 10 files
  - `npm run verify` → PASS (2026-11-20 10:54 +06: svelte-check 0 errors, Vitest 49/49, cargo fmt/clippy/test)
- Acceptance criteria:
  - Fix-all uses ONE transaction → PASS (dispatch counted in tabFix.test.ts)
  - One undo restores the original text → PASS
  - Tab returns false when nothing is pending → PASS
  - Rewrite and non-safe marks are never applied by Tab → PASS
  - Card shows old/new/reason/Accept/Dismiss [HUMAN] → NOT RUN — OPEN below
  - Accept is one undo step; Dismiss hides the mark for the session [HUMAN] → NOT RUN — OPEN below
- Result: PARTIAL (automated lines PASS; completes when the [HUMAN] lines are verified)
- Commit: see git log (short messages, per the human's 2026-11-20 request)
- Follow-ups: human runs the M3 window checks; then tick M3 in Roadmap.md. Next task: M4-T01.

### [2026-11-20 10:53 +06] M3-T01…M3-T05 — Tab-to-fix-all, suggestion card, dismiss
- Type: code
- Files changed:
  - src/lib/editor/applyFix.ts, applyFix.test.ts (created) — applyFix: one isolated transaction, stale marks dropped; 4 tests
  - src/lib/editor/tabFix.ts, tabFix.test.ts (created) — collectSafeFixes + fixAll in one dispatch, Tab keymap at Prec.highest; 7 tests
  - src/lib/editor/testHelpers.ts (created) — shared fake EditorView + mark factory for tests
  - src/lib/editor/createEditor.ts (modified) — tabFixKeymap added before the default keymap; click handler reports mark clicks (data-sid -> mark + coords)
  - src/lib/ui/SuggestionCard.svelte (created) — old -> new, reason, Accept, Dismiss, up to 3 alternative buttons
  - src/lib/editor/dismissed.ts, dismissed.test.ts (created) — session dismissal set keyed by kind|original|replacement|reason; 4 tests
  - src/App.svelte (modified) — card state and positioning inside .editor-wrap, close on Escape/outside click/scroll/doc change, Accept/Dismiss wired, engine now receives the real isDismissed
  - src/app.css (modified) — .suggestion-card styles per Plan M3-T04
- What changed: Tab now fixes every safe Harper mark in a single undoable transaction (and falls through when nothing is pending). Clicking a mark opens a card to accept the fix, accept an alternative, or dismiss the suggestion for the session; dismissed suggestions are filtered by the engine so they do not reappear.
- Commands run and results:
  - `npm run test` → PASS — 49 tests, 10 files
  - `npm run verify` → PASS — svelte-check 0 errors, cargo side unchanged and green
- Acceptance criteria:
  - M3-T01 tests pass → PASS. M3-T02 tests pass → PASS. M3-T03 build passes → PASS ([HUMAN] OPEN). M3-T04 build passes → PASS ([HUMAN] OPEN). M3-T05 tests pass → PASS ([HUMAN] OPEN)
- Result: DONE (automated parts)
- Commit: see git log
- Follow-ups: M3 [HUMAN] checks; M4-T01 next

### [2026-11-20 10:48 +06] MILESTONE 2 GATE — Milestone 2 gate checks (automated lines only)
- Type: test
- Files changed:
  - docs/Development Status.md (modified) — this entry, completed-tasks rows M2-T01…M2-T12, M2 decisions, M2 [HUMAN] items
  - docs/Roadmap.md — NOT ticked: the M2 [HUMAN] lines are OPEN (gate rule 3)
- What changed: Every automated M2 Roadmap line was checked against real command output. The milestone stays unticked until the human verifies the window behaviour.
- Commands run and results:
  - `cargo test --manifest-path src-tauri/Cargo.toml` → PASS — 20 unit tests + 1 fixture integration test (1 perf test ignored by default)
  - `cargo test --manifest-path src-tauri/Cargo.toml --release -- --ignored perf` → PASS — median 14.54 ms (budget 50 ms)
  - `npm run test` → PASS — 34 tests in 7 files
  - `npm run verify` → PASS (final run 2026-11-20 10:47 +06: svelte-check 0 errors, Vitest 34/34, cargo fmt --check, clippy -D warnings, cargo test)
- Acceptance criteria:
  - Harper =3.2.0 runs in Rust; fixture tests pass → PASS
  - Offsets are UTF-16; emoji test passes → PASS (fixture case "emoji utf16": teh at 3..6)
  - No marks inside URLs, emails, code (tests pass) → PASS
  - safeToAutoApply rules tested → PASS
  - Median Harper time for ~300 words under 50 ms (release), recorded → PASS — 14.54 ms
  - Marks shift with edits and are removed when edited (tests pass) → PASS
  - Engine caches by paragraph hash and discards stale results (tests pass) → PASS
  - Typing sample shows two red marks within ~0.3 s [HUMAN] → NOT RUN (headless agent) — OPEN below
  - Bottom bar shows the quick-fix text and is quiet when clean [HUMAN] → NOT RUN — OPEN below
- Verified by: commands above
- Result: PARTIAL (all automated lines PASS; milestone completes when the [HUMAN] lines are verified)
- Commit: see the M2-TGATE docs commit in git log
- Follow-ups: human runs the M2 window checks; then tick M2 in Roadmap.md. Next task: M3-T01.

### [2026-11-20 10:40 +06] M2-T01…M2-T12 — Editor with Harper marks (Rust pipeline + CodeMirror + engine)
- Type: code
- Files changed:
  - src-tauri/Cargo.toml (modified) — harper-core =3.2.0 (concurrent), regex 1.13.2, thiserror 2.0.21; src-tauri/Cargo.lock (modified)
  - src-tauri/src/types.rs (created) — RawSuggestion, RawKind, CheckResult (Section 6 shapes)
  - src-tauri/src/harper/mod.rs (created) — HarperEngine (LintGroup built once), 3 tests
  - src-tauri/src/harper/mapping.rs (created) — OffsetMap char -> UTF-16, 5 tests
  - src-tauri/src/harper/convert.rs (created) — Lint -> RawSuggestion with kind mapping, reason cleanup, safety wiring, 2 tests
  - src-tauri/src/harper/protect.rs (created) — protected_ranges + drop_protected, fixture-driven tests
  - src-tauri/src/harper/safety.rs (created) — levenshtein + safe_to_auto_apply, 8 tests
  - src-tauri/src/error.rs (created) — AppError with string codes, no user text
  - src-tauri/src/state.rs (created) — AppState with the engine behind Arc<Mutex>
  - src-tauri/src/commands/mod.rs, src-tauri/src/commands/check.rs (created) — run_check pipeline + check_text command (20,000-char limit, dialect map, spawn_blocking, elapsedMs)
  - src-tauri/src/lib.rs (modified) — module declarations, .manage(AppState), generate_handler![check_text]
  - src-tauri/tests/harper_cases.rs (created) — 13 fixture cases + ignored perf test; src-tauri/tests/fixtures/harper-cases.json, src-tauri/tests/fixtures/protect-cases.json (created)
  - src/lib/types.ts (created) — Section 6 TypeScript types exactly; src/lib/ipc.ts (created) — checkText wrapper
  - src/lib/editor/createEditor.ts (created) — CodeMirror 6 editor, native spellcheck off, theme from CSS variables
  - src/lib/editor/touch.ts, touch.test.ts (created) — the touched rule, 8 cases
  - src/lib/editor/suggestionField.ts, suggestionField.test.ts (created) — marksField, setMarks/removeMarks, mapMarks, 4 cases
  - src/lib/editor/marks.ts (created) — qw-spell/qw-grammar/qw-ai decorations
  - src/lib/editor/status.ts, status.test.ts (created) — countFixes, 2 cases
  - src/lib/engine/paragraphs.ts, paragraphs.test.ts (created) — splitParagraphs with fences and 5,000-char chunking, 7 cases
  - src/lib/engine/lru.ts, lru.test.ts (created) — Lru cache, 3 cases
  - src/lib/engine/SuggestionEngine.ts, SuggestionEngine.test.ts (created) — debounced per-paragraph engine, 6 cases
  - src/lib/ui/Icon.svelte, src/lib/ui/BottomBar.svelte (created) — icon set; bottom bar with fix counts, engine label, word count
  - src/App.svelte (modified) — editor mounted on #editor-host, engine wired, BottomBar replaces the static footer
- What changed: The full Harper path now exists end to end: Rust lints text with Harper 3.2.0, converts lints to UTF-16 RawSuggestions, drops marks inside URLs/emails/code, classifies Tab-safe fixes, and serves it all through the check_text command. The frontend has a CodeMirror editor whose marks live in a StateField (shifting with edits, removed when touched), a debounced per-paragraph SuggestionEngine with hash cache and stale-result discard, and a live bottom bar. Two reviewed deviations from a naive reading are recorded in Decisions: the lauched fixture freeze and the whitespace-only guard.
- Commands run and results:
  - `cargo test --manifest-path src-tauri/Cargo.toml harper` → PASS (3 tests)
  - `cargo test --manifest-path src-tauri/Cargo.toml mapping` → PASS (5 tests)
  - `cargo test --manifest-path src-tauri/Cargo.toml convert` → PASS (2 tests)
  - `cargo test --manifest-path src-tauri/Cargo.toml protect` → PASS (2 tests, 5 fixture cases)
  - `cargo test --manifest-path src-tauri/Cargo.toml safety` → PASS (8 tests)
  - `cargo test --manifest-path src-tauri/Cargo.toml` → PASS (20 unit + 1 integration)
  - `cargo test --manifest-path src-tauri/Cargo.toml --release -- --ignored perf` → PASS — median 14.54 ms
  - `npm run test` → PASS — 34 tests, 7 files
  - `npm run check` → PASS — 0 errors; `npm run build` → PASS
  - `npm run verify` → PASS (after a cargo fmt pass and one clippy needless_bool fix in safety.rs)
- Acceptance criteria:
  - M2-T01: 3 tests pass → PASS. M2-T02: all mapping tests pass → PASS. M2-T03: tests pass, variant lists recorded → PASS. M2-T04: all protect cases pass → PASS. M2-T05: all safety tests pass → PASS. M2-T06: fixture tests pass, perf passes in release, median recorded → PASS. M2-T07: type-check passes → PASS. M2-T08: build passes → PASS ([HUMAN] typing checks OPEN). M2-T09: all tests pass → PASS. M2-T10: tests pass → PASS. M2-T11: tests pass → PASS ([HUMAN] live marks OPEN). M2-T12: tests pass → PASS ([HUMAN] bar text OPEN)
- Verified by: commands above
- Result: DONE (automated parts); [HUMAN] parts listed under "Needs human verification"
- Commit: fce482b (Rust, M2-T01…T06), e618549 (frontend, M2-T07…T12)
- Follow-ups: M2 [HUMAN] checks; M3-T01 next

### [2026-11-20 10:05 +06] M1-TGATE — Milestone 1 gate checks (automated lines only)
- Type: test
- Files changed:
  - docs/Development Status.md (modified) — gate evidence, completed tasks, decisions, human-verification list
- What changed: Ran every automated line of the Roadmap M1 checklist. The [HUMAN] lines were added to "Needs human verification" and the milestone was NOT ticked in Roadmap.md, per gate rule 3.
- Commands run and results:
  - `npm run verify` → PASS — svelte-check 0 errors, vitest 4/4, cargo fmt --check / clippy -D warnings / cargo test all ok (test profile finished in 3m 25s, 0 tests in the Rust skeleton)
  - `npx tauri build --debug --no-bundle` → PASS — "Built application at: src-tauri/target/debug/fusewriter"
  - `grep -E '"[\^~][0-9]' package.json` → PASS — no output (all deps exact-pinned)
- Acceptance criteria:
  - The three docs exist in docs/ and are committed → PASS (local commit e25e053; GitHub snapshot push follows this session)
  - package-lock.json exists and no dependency uses ^ or ~ → PASS
  - npm run verify passes → PASS
  - npm run tauri dev opens a window titled "FuseWriter" [HUMAN] → NOT RUN (headless agent) — OPEN in Needs human verification
  - Light/dark follows the OS and the three-row layout is visible [HUMAN] → NOT RUN — OPEN
  - CSP allows only IPC; dialog plugin registered; no CSP errors in devtools [HUMAN] → PARTIAL — config and registration verified in code (tauri.conf.json CSP, lib.rs plugin init, capabilities dialog:default); devtools check OPEN
  - Tool versions recorded in Development Status.md → PASS (see Decisions)
- Verified by: commands above
- Result: PARTIAL (automated lines PASS; milestone gate stays open until the human verifies the [HUMAN] lines)
- Commit: this file is committed with the GitHub snapshot push of 2026-11-20
- Follow-ups: Human verifies the three OPEN items, then the M1 boxes in Roadmap.md can be ticked. Next task: M2-T01.

### [2026-11-20 09:36 +06] M1-T02…M1-T07 — Project skeleton (frontend, Tauri, layout, hash, dialog plugin)
- Type: code
- Files changed:
  - package.json / package-lock.json (created) — exact-pinned deps and scripts, including `verify` and `rust:check` (M1-T04)
  - vite.config.ts, svelte.config.js, tsconfig.json, index.html (created) — frontend config per Plan M1-T03, with FuseWriter titles
  - src/main.ts, src/App.svelte, src/vite-env.d.ts (created) — Svelte 5 mount; App is the three-row layout skeleton (M1-T05)
  - src/app.css (created) — CSS variables, light/dark, mark styles per Plan M1-T05
  - src/lib/engine/hash.ts, src/lib/engine/hash.test.ts (created) — cyrb53 hash + 4 tests (M1-T06)
  - assets/app-icon.svg (created) — icon source from Plan M1-T04; icons generated with `npx tauri icon`
  - src-tauri/Cargo.toml, src-tauri/Cargo.lock, src-tauri/build.rs, src-tauri/tauri.conf.json (created/modified by tauri init, then edited) — package `fusewriter`, lib `fusewriter_lib`, identifier `app.fusewriter.desktop`, CSP per plan
  - src-tauri/src/main.rs, src-tauri/src/lib.rs (created/modified) — run() with the dialog plugin registered (M1-T07); print-deny clippy attributes kept
  - src-tauri/capabilities/default.json (modified) — permissions `core:default`, `dialog:default`
  - src-tauri/icons/* (generated) — from assets/app-icon.svg (local commit only; see Known issues)
- What changed: Built the Milestone 1 skeleton exactly in the plan's task order. Two deviations were needed with the current (Nov 2026) tool versions and are recorded under Decisions: TypeScript 6.0.3 instead of 7.0.2, and an empty TS script block in App.svelte.
- Commands run and results:
  - `npm install --save-exact ...` (M1-T02 lists) → PASS — `npm ls --depth=0` shows all deps, no UNMET/ERR
  - `npm run build` → PASS — dist/index.html and assets produced
  - `npm run check` → PASS — "svelte-check found 0 errors and 0 warnings"
  - `npm run test` → PASS — hash.test.ts 4 passed
  - `npm run verify` → PASS — full chain including cargo clippy -D warnings and cargo test
- Acceptance criteria:
  - M1-T02: package-lock.json exists, no ^/~ → PASS
  - M1-T03: dist/index.html exists after build, svelte-check 0 errors → PASS
  - M1-T04: npm run verify exits 0 → PASS; tauri dev window [HUMAN] → NOT RUN (headless)
  - M1-T05: build and check pass → PASS; layout appearance [HUMAN] → NOT RUN
  - M1-T06: 4 hash tests pass → PASS
  - M1-T07: builds without permission errors → PASS; devtools CSP [HUMAN] → NOT RUN
- Verified by: commands above
- Result: DONE (with [HUMAN] steps recorded as OPEN)
- Commit: b185ff5 (local)
- Follow-ups: M1-TGATE entry above.

### [2026-11-20 09:28 +06] M1-T01 — Repo init, docs added, app renamed to FuseWriter
- Type: docs
- Files changed:
  - docs/Plan.md (created) — the human's build plan, with the name changed from Quietwrite to FuseWriter on the human's instruction (see Decisions)
  - docs/Development Status.md (created) — living log template from the plan
  - docs/Roadmap.md (created) — milestone checklists, name renamed to FuseWriter
  - .gitignore (created) — exactly the lines listed in Plan M1-T01
  - README.md (modified) — project summary, doc links, dev commands, icon regeneration note
- What changed: The human dropped the three plan docs as one pasted file and instructed that the app be renamed from the working name Quietwrite to FuseWriter. The docs were split into the three files under docs/ and every name reference was renamed (23 occurrences in the pasted file), including the config identifier and package/lib names used by later tasks.
- Commands run and results:
  - `node -v` → v24.22.1; `npm -v` → 10.9.4; `rustc --version` → rustc 1.100.0; `cargo --version` → cargo 1.100.0; `git --version` → git 2.43.0
  - `grep -i quietwrite docs/*.md` → PASS — no matches remain
  - `ls "docs"` → PASS — Plan.md, Development Status.md, Roadmap.md
- Acceptance criteria:
  - Five versions recorded → PASS (Decisions)
  - Rust >= 1.90 → PASS (1.100.0, installed via rustup)
  - git log shows the repo commits → PASS (33a893d initial, e25e053 docs)
  - docs/ has three files → PASS
  - git status is clean → PASS (after commits)
- Verified by: commands above
- Result: DONE
- Commit: e25e053 (local)
- Follow-ups: M1-T02.

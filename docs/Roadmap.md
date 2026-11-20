# Roadmap

> **RULE:** A milestone is marked complete ONLY after its WHOLE checklist is verified and the evidence is written in `docs/Development Status.md` (Change log entry titled `MILESTONE x GATE`).
> Agents: do not tick anything here except during a gate task (`Mx-TGATE`) and only after the evidence is recorded.
> Humans: items marked [HUMAN] need your confirmation in the "Needs human verification" list of Development Status.md.

Order of work: M1 -> M2 -> M3 -> M4 -> M5 -> M6 -> M7 -> M8.

---

## M1: Project skeleton and docs
**Goal:** A Tauri + Svelte + TypeScript project that builds, with working checks and pinned dependencies.
**Checklist:**
- [ ] The three docs exist in `docs/` and are committed.
- [ ] `package-lock.json` exists and no dependency uses `^` or `~`.
- [ ] `npm run verify` passes.
- [ ] `npm run tauri dev` opens a window titled "FuseWriter". [HUMAN]
- [ ] Light/dark follows the OS and the three-row layout is visible. [HUMAN]
- [ ] CSP allows only IPC; the dialog plugin is registered; no CSP errors in devtools. [HUMAN]
- [ ] Tool versions are recorded in Development Status.md.

Status: [ ] Not started   [ ] In progress   [ ] Complete
Evidence: (leave empty until complete; then write the Development Status.md entry date)

## M2: Editor with Harper marks
**Goal:** Typing shows red (spelling) and blue (grammar) marks from Harper, offline, with correct positions.
**Checklist:**
- [ ] Harper `=3.2.0` runs in Rust; the fixture tests pass.
- [ ] Offsets are UTF-16; the emoji test passes.
- [ ] No marks inside URLs, emails, or code (tests pass).
- [ ] `safeToAutoApply` rules are tested.
- [ ] Median Harper time for a 300-word paragraph is under 50 ms (release build); number recorded.
- [ ] Marks shift with edits and are removed when edited (tests pass).
- [ ] The engine caches by paragraph hash and discards stale results (tests pass).
- [ ] Typing `I recieve teh package` shows two red marks within ~0.3 s. [HUMAN]
- [ ] The bottom bar shows "N quick fixes, Tab to fix all" and is quiet when clean. [HUMAN]

Status: [ ] Not started   [ ] In progress   [ ] Complete
Evidence:

## M3: Suggestion engine with Tab-to-fix-all and undo
**Goal:** Tab fixes all safe issues in one undoable step; clicking a mark opens a card.
**Checklist:**
- [ ] Fix-all uses ONE transaction (test counts updates).
- [ ] One undo restores the original text (test passes).
- [ ] Tab returns false (not consumed) when nothing is pending (test passes).
- [ ] Rewrite marks and non-safe marks are never applied by Tab (test passes).
- [ ] The card shows old word, new word, reason, Accept, Dismiss. [HUMAN]
- [ ] Accept is one undo step; Dismiss hides the mark for the session. [HUMAN]

Status: [ ] Not started   [ ] In progress   [ ] Complete
Evidence:

## M4: Provider abstraction and cloud API rewrite
**Goal:** One provider interface; any OpenAI-compatible cloud API works; privacy is visible and enforced.
**Checklist:**
- [ ] Settings load/save with defaults; invalid URLs rejected (tests pass).
- [ ] The API key is stored only in the keychain; no command returns it (grep + tests).
- [ ] The SSE parser and streaming client pass tests; cancel works.
- [ ] Rust refuses cloud calls without consent, without a key, and for auto-origin unless allowed (tests pass).
- [ ] The engine badge shows engine and whether text leaves the device; cloud auto-check shows a warning state. [HUMAN]
- [ ] A basic rewrite streams from a real cloud API and applies in one undo step. [HUMAN]

Status: [ ] Not started   [ ] In progress   [ ] Complete
Evidence:

## M5: Diff view and modes
**Goal:** Five rewrite modes plus custom presets, word-level diff, per-change accept/reject, extra tools.
**Checklist:**
- [ ] Word diff and hunk tests pass (accept all = new text, reject all = original).
- [ ] Prompts for all modes exist and are tested.
- [ ] Placeholder protection and output validation tests pass.
- [ ] URL, code, and frozen words survive a rewrite (or the rewrite is refused). [HUMAN]
- [ ] The diff view allows per-change accept/reject; Apply is one undo step. [HUMAN]
- [ ] Custom presets can be added, edited, deleted, and persist. [HUMAN]
- [ ] Word count, reading time, readability tests pass; Summarize works with an AI engine. [HUMAN]

Status: [ ] Not started   [ ] In progress   [ ] Complete
Evidence:

## M6: Local model download and sidecar
**Goal:** Optional download of Gemma 4 E2B (default) or E4B; runs through a local llama.cpp server.
**Checklist:**
- [ ] `runtime-manifest.json` has real URLs and SHA-256 values; confirmed by the human.
- [ ] Download with progress, checksum check, and cancel pass tests.
- [ ] Archive extraction rejects path traversal (test passes).
- [ ] The server starts on 127.0.0.1 with a random API key, is health-checked, and stops on idle and on app exit. [HUMAN]
- [ ] Model smoke test results are recorded (6 inputs, no reasoning text in outputs).
- [ ] Settings UI can download, show progress, cancel, and remove a model. [HUMAN]

Status: [ ] Not started   [ ] In progress   [ ] Complete
Evidence:

## M7: Proactive pause-based checking
**Goal:** After a ~700 ms pause or a finished sentence, only the changed sentence is checked by the AI; purple marks appear.
**Checklist:**
- [ ] Sentence splitter tests pass (abbreviations, decimals, quotes).
- [ ] The pending tracker follows ranges while typing and marks stale ones (tests pass).
- [ ] The scheduler: 700 ms pause, sentence-end trigger, one request at a time, stale abort, skip rules (tests pass).
- [ ] Results are cached by text hash (test passes).
- [ ] Cloud auto-checks make zero requests unless opted in (test passes) and show the indicator. [HUMAN]
- [ ] No long task above 100 ms caused by checking while typing; numbers recorded.
- [ ] Purple solid marks appear after a pause and shift correctly while typing. [HUMAN]

Status: [ ] Not started   [ ] In progress   [ ] Complete
Evidence:

## M8: Polish, settings, packaging
**Goal:** A usable, private, packaged app.
**Checklist:**
- [ ] Open, Save, Save As, and the unsaved-changes prompt work. [HUMAN]
- [ ] Dialect, pause time, and reset settings work; errors never block typing. [HUMAN]
- [ ] Performance budgets (Plan.md Section 11) met or recorded as Known issues; numbers recorded.
- [ ] Privacy audit (M8-T04) passes; offline use confirmed. [HUMAN]
- [ ] `npm run tauri build` produces an installer; it works on a clean machine. [HUMAN]
- [ ] Every line of Plan.md Section 14 (Definition of done) is verified with evidence.

Status: [ ] Not started   [ ] In progress   [ ] Complete
Evidence:

---

## Later / not now
- System-wide integration in other apps
- Browser extension
- Plagiarism checking
- AI-content detection
- Accounts, sync, any backend server
- Auto-update, telemetry, crash reporting
- Multiple tabs, rich text, non-English spell-check
- GPU-specific llama.cpp builds; Windows job object for child process cleanup
- Automated end-to-end UI tests
- "Add to dictionary" and persisted dismissals

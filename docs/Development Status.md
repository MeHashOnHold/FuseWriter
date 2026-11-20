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
- Current milestone: M7 — Proactive pause-based checking
- Current task ID: M7-TGATE (gate checks run; milestone NOT ticked — [HUMAN] lines are still OPEN below, per gate rule 3). Next task: M8-T01.

## Last updated
- 2026-11-20 12:16 +06

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
| M4-T01 | Settings in Rust | 2026-11-20 | `cargo test settings` PASS — 8 cases (defaults, round trip, broken/missing file, unknown fields, URL rules, clamps). |
| M4-T02 | Secrets in the keychain | 2026-11-20 | `cargo test secrets` PASS — 4 cases (mock store). `grep -rn "get_key" src-tauri/src/commands` prints nothing. |
| M4-T03 | Provider traits + OpenAI client | 2026-11-20 | `cargo test openai` PASS — map_status, build_body (local extras, cloud temperature), complete_once + auth header, 401. Deps: keyring pinned to 3.x (4.x dropped the plan's features and changed the API), reqwest 0.13.5 with the `rustls` feature name (no `rustls-tls` in 0.13), tokio, tokio-util, futures-util, wiremock (dev). |
| M4-T04 | SSE parser | 2026-11-20 | `cargo test sse` PASS — 8 cases incl. split multi-byte char and delta_text rules. |
| M4-T05 | Streaming ai_complete + policy | 2026-11-20 | `cargo test ai` PASS — 6 policy cases (consent_required, no_api_key, auto_cloud_blocked, loopback, bad_url, ok) + stream order + cancel (wiremock). Local engine answers local_not_installed until M6. |
| M4-T06 | Test-connection command | 2026-11-20 | `cargo test ai` PASS — wiremock ok + 401 -> unauthorized. No consent needed (human clicks Test). |
| M4-T07 | TS provider layer | 2026-11-20 | `npm run test` PASS — registry.test.ts 5 cases. |
| M4-T08 | Settings store and dialog | 2026-11-20 | `npm run verify` PASS. `grep -rn "api_key\|apiKey" src/lib/settings` prints nothing. Restart behaviour is [HUMAN], see below. |
| M4-T09 | Engine badge and privacy indicator | 2026-11-20 | `npm run test` PASS — gating.test.ts 9 cases (labels, autoAiAllowed matrix). Window behaviour is [HUMAN], see below. |
| M4-T10 | Cloud consent dialog | 2026-11-20 | `npm run verify` PASS. Appearing once per host is [HUMAN], see below. |
| M4-T11 | Minimal rewrite into a preview panel | 2026-11-20 | `npm run verify` PASS. Real-key streaming is [HUMAN], see below. |
| M5-T01 | Word diff | 2026-11-20 | `npm run test` PASS — wordDiff.test.ts 9 cases incl. reconstruction property (20 pairs) and the >4M-cell fallback. |
| M5-T02 | Hunks | 2026-11-20 | `npm run test` PASS — hunks.test.ts 4 cases (accept all = new, reject all = original, whitespace merge). |
| M5-T03 | InlineDiff and DiffView | 2026-11-20 | `npm run verify` PASS. Rewrite marks in the suggestion card show an inline diff when the original is over 24 chars. Window behaviour is [HUMAN], see below. |
| M5-T04 | Modes and prompts | 2026-11-20 | `npm run test` PASS — prompts.test.ts 10 cases (TASK lines, delimiters, frozen list quoting, retry suffix, custom instruction + rules, summarize/check prompts). Summarize example pair written per Section 10.3. |
| M5-T05 | Protection with placeholders | 2026-11-20 | `npm run test` PASS — protect.test.ts 9 cases (round trip, combined text, whole-word frozen matching, unclosed fence, placeholdersIntact failure modes). |
| M5-T06 | Output validation | 2026-11-20 | `npm run test` PASS — validate.test.ts 14 cases (cleaning: preface/fence/OUTPUT:/quotes; every failure reason). |
| M5-T07 | Mode picker and custom presets | 2026-11-20 | `npm run verify` PASS. Persistence is [HUMAN], see below. |
| M5-T08 | Full rewrite flow | 2026-11-20 | `npm run verify` PASS — protect -> prompt -> stream -> validate -> one retry -> restore; live preview throttled via requestAnimationFrame (<=10 paints/s); 6,000-char cap; "No changes suggested." state. Window behaviour is [HUMAN], see below. |
| M5-T09 | Text stats and Tools menu | 2026-11-20 | `npm run test` PASS — stats.test.ts 7 cases. Reading speed kept at 238 wpm per the plan's VERIFY note (Brysbaert 2019 average for silent reading). Summarize is [HUMAN], see below. |
| M6-T01 | Runtime manifest from real downloads | 2026-11-20 | Manifest written with real values (see the M6 change-log entry): llama.cpp tag `b12556`, 4 platform assets downloaded and SHA-256'd locally, Gemma 4 E2B/E4B Q4_0 files from the HuggingFace API (LFS hashes). JSON parses; all sha256 are 64 hex; all URLs https. |
| M6-T02 | Manifest parsing, paths, download | 2026-11-20 | `cargo test` PASS — manifest tests (embedded manifest parses with real values, URL allowlist), paths test, download tests with wiremock (success + progress, wrong hash rejected and `.part` removed, existing good file skips network, cancel mid-download cleans up). |
| M6-T03 | Safe archive extraction | 2026-11-20 | `cargo test` PASS — zip and tar.gz extract; zip `../` entry rejected; tar.gz `../` entry rejected (hostile archive crafted at the byte level because the tar writer API refuses `..` paths); find_server. |
| M6-T04 | llama-server runtime | 2026-11-20 | `cargo test runtime` PASS — build_args binds 127.0.0.1 only and includes `--no-webui`/`--jinja` (both confirmed in the pinned build's `--help`); free_port non-zero. `/health` verified live WITHOUT the key during M6-T08 (HTTP 200). Idle watcher + stop-on-exit wired in lib.rs. Window behaviour is [HUMAN], see below. |
| M6-T05 | Local commands | 2026-11-20 | `npm run verify` PASS. `local_status`, `local_install` (Channel progress events), `local_cancel_install`, `local_stop`, `local_remove`, `local_remove_runtime`; `ai_complete` local branch starts/restarts the server and streams via the local provider. Free-space pre-check skipped per the task's own fallback — see Known issues. |
| M6-T06 | Local provider in TS | 2026-11-20 | `npm run verify` PASS — ipc wrappers, shared localStatus store, registry returns null until the selected model is installed (registry tests updated + a not-installed case added); Rewrite then shows "Local model not installed. Download it in Settings." |
| M6-T07 | Local section in settings | 2026-11-20 | `npm run verify` PASS — model radios with real GB sizes, Download with progress bar (MB + %) and Cancel, Remove with confirmation, status line, unsupported-platform notice. Window behaviour is [HUMAN], see below. |
| M6-T08 | Real-model smoke test | 2026-11-20 | DONE headlessly (agent route): the pinned llama-server ran the real E2B Q4_0 model (downloaded file's SHA-256 matches the manifest) with the app's exact arguments and the app's own prompt/validate code. Results table in the M6 change-log entry: 5 of 6 cases pass; Expand on a 16-char input fails the length rule even after the retry; no reasoning text in any output. |
| M7-T01 | Sentence splitter | 2026-11-20 | `npm run test -- sentences` PASS — 17 cases: abbreviations (Mr./Dr./Prof./St./Mrs./Ms./vs./Inc./Ltd./e.g./i.e./etc.), decimals, initials, closing quotes, ellipsis both ways, newlines, missing final punctuation, offset invariant checked for every case. One fix during development: the ellipsis rule must skip whitespace before judging the next letter. |
| M7-T02 | Pending tracker | 2026-11-20 | `npm run test -- pending` PASS — ranges shift with edits before them, survive edits after them, and go stale on edits inside or deletion; staleness reuses the editor's touch rule and a text-hash check. |
| M7-T03 | AI check pipeline | 2026-11-20 | `npm run test -- aiChecker` PASS — protect -> check prompt -> validate (mode `check`) -> restore; invalid or unchanged output -> null; >50% word change -> null (changed words counted per diff hunk, larger side); LRU cache (300) keyed by sentence + provider; aborted calls are never cached; `makeAiSuggestion` builds a purple rewrite mark that is never auto-applied. |
| M7-T04 | AI scheduler | 2026-11-20 | `npm run test -- aiScheduler` PASS — 13 fake-timer tests: pause fires at pauseMs and not before, typing resets the timer, sentence-end fires after 150 ms, one request at a time, in-flight abort when the sentence is edited, results applied at the TRACKED range after earlier insertions, and every skip rule (too short/long, Harper marks present, composing, URL-only sentence, no provider, cloud without opt-in = zero calls). Wired into App (every transaction, sending state, bottom-bar note on hard errors; hard errors pause checks until settings change). |
| M7-T05 | Cloud auto-check visibility | 2026-11-20 | Settings now shows "Each sentence you type will be sent to {host}." under the allow-cloud toggle when it is on; the badge's sending state is driven by the scheduler as well as the rewrite panel (cloud only); the bottom bar shows scheduler error lines. gating tests extended (autoCloudActive false for local/off). Window check is [HUMAN], see below. |
| M7-T06 | Responsiveness measurement | 2026-11-20 | NOT RUN — the plan's method needs a dev window with devtools (Performance tab) and typing by hand; the agent is headless. Recorded as a [HUMAN] item below with the exact steps. By construction the checks run as async IPC calls and results land in a single small dispatch, but no numbers are claimed. |

## In progress
- (nothing — M7-TGATE is waiting on the [HUMAN] items below)

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
- OPEN — M4-T08 / M4 gate: settings open, save, and survive an app restart; after restart the key field is empty but shows "Key saved".
- OPEN — M4-T09 / M4 gate: switching engines in settings changes the bottom-bar label and dot colour at once; cloud auto-check (when allowed) shows the pulsing amber dot and "auto-check ON".
- OPEN — M4-T10: with a fake Cloud config, the consent dialog appears once per host.
- OPEN — M4-T11 / M4 gate: with a real cloud key, selecting a sentence and clicking Rewrite streams text into the panel; Replace applies it; Ctrl/Cmd+Z undoes it in one step.
- OPEN — M5-T03 / M5 gate: after a rewrite the diff view shows; rejecting one change and applying gives the mixed result; one Ctrl/Cmd+Z undoes the whole apply.
- OPEN — M5-T07 / M5 gate: a custom preset can be created, selected, edited, deleted, and survives a restart.
- OPEN — M5-T08 / M5 gate: all 5 modes work with a cloud key; a URL and a backtick-code word in the input survive unchanged; a frozen word survives.
- OPEN — M5-T09 / M5 gate: word count, reading time, and readability numbers update in the Tools menu; Summarize works with a cloud key.
- OPEN — M6-T04 / M6 gate: with a local model installed, the llama-server child process appears when a rewrite runs, stops after the idle timeout, and disappears when the app closes.
- OPEN — M6-T07 / M6 gate: in Settings, Download E2B shows progress, Cancel works mid-download, and Remove deletes the model.
- OPEN — M7-T05 / M7 gate: with engine = Cloud and automatic cloud checks allowed, typing shows the pulsing "auto-check ON" badge, and the badge shows "sending…" while a sentence is being checked.
- OPEN — M7-T06: in `npm run tauri dev` with devtools open (Performance tab), type steadily for 30 seconds with local auto-check on and record the longest task; then repeat with a 5,000-word document pasted in. (Plan method; the agent is headless and recorded no numbers.)
- OPEN — M7-T04 / M7 gate: with a local model installed and auto-check on, typing a clumsy sentence and pausing shows a purple mark; clicking it shows the card; Accept applies it; typing more text before it does not misplace it.

## Known issues and bugs
- The GitHub copy of this repo does not include the generated app icons (`src-tauri/icons/*.png`, `*.ico`, `*.icns`): the connector used to push can only upload text files. The icon source `assets/app-icon.svg` IS committed; regenerate the icons after cloning with `npx tauri icon assets/app-icon.svg` (also noted in README.md). The local working copy has the generated icons committed in b185ff5.
- Agent environment note: the Linux VM needed the Tauri prerequisites installed (webkit2gtk-4.1 dev etc.) and a locally repacked `libzstd-dev` to work around a distro package version pin (`1.5.5+dfsg2-2build1.1+hatch1`). This affects only the agent's build machine, not the project. (The VM was replaced once during M6 and the prerequisites had to be reinstalled the same way.)
- M6-T05: the free-space pre-check before downloading is NOT implemented (Plan M6-T05 step 3 allows this): the runtime exposes no portable free-space query and adding a crate for it is forbidden by the same step. A download on a nearly full disk fails partway with a network/write error instead of an upfront `disk_space` error.
- M6-T08 finding: Expand mode on very short inputs is effectively refused by validation with the real E2B model — expanding "The app is fast." (16 chars) produced 219–238 chars (ratio ~14x) on both the first attempt and the retry, above the Section 10.4 expand ceiling of 3.5x, so the app reports "Couldn't produce a safe rewrite." Longer inputs are unaffected in ratio terms. Raw outputs are in the M6 change-log entry. (1 of 6 smoke cases — below the plan's threshold for an open question.)

## Open questions for the human
(Agents: write a question here and STOP when the plan is unclear, wrong, or missing something. Include the task ID.)
- M6-T01 (for the human to confirm, work proceeded with the recorded values): the manifest pins llama.cpp tag `b12556` — the newer `v1.0.0` release (2026-11-13) carries no binary assets, so the newest release WITH the four platform archives was used. Model files are the Q4_0 builds (`gemma-4-E2B-it-Q4_0.gguf`, `gemma-4-E4B-it-Q4_0.gguf`), excluding mmproj/mtp files, per the plan's Section 6 note.
- M6-T01 / Section 13: the macOS assets used are the stock llama.cpp builds; whether they run on the macOS versions the human wants to support (the plan mentions a macOS 12 floor question in Section 13) is untested — no Mac is available to the agent.

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
- 2026-11-20: keyring pinned to 3.x per Plan M4-T02 — keyring 4.x removed the plan's platform features and changed the API, which is exactly the break the plan's VERIFY note warns about. reqwest 0.13.5 uses the feature name `rustls` (there is no `rustls-tls` in 0.13), per `cargo info reqwest`.
- 2026-11-20: secrets uses one shared keyring Entry for the app's single credential — the keyring mock store keeps its data in the entry object, so the plan's mock-based tests only pass with a shared instance; real keychains behave the same.
- 2026-11-20: the AI engine default is "off" (Harper only) — the privacy-safe reading of Plan Section 6, which gives no explicit default for `engine`.
- 2026-11-20: reading speed kept at 238 wpm (Plan M5-T09 VERIFY note) — it matches the Brysbaert (2019) meta-analysis average for silent reading of English non-fiction.
- 2026-11-20, M6-T01, manifest data (all verified live on 2026-11-20): GitHub `releases/latest` is a `v1.0.0` marker release with no binaries, so the pinned tag is `b12556` (2026-11-19), whose assets match the plan's expected names exactly (`llama-b12556-bin-win-cpu-x64.zip`, `-macos-arm64.tar.gz`, `-macos-x64.tar.gz`, `-ubuntu-x64.tar.gz`). All four were downloaded and hashed locally: win 98882a3c…, macos-arm64 eb92254d…, macos-x64 df7cf820…, ubuntu 1a573b60… (full values in the manifest). Models from the HuggingFace API `?blobs=true`: E2B Q4_0 2,841,481,184 bytes sha256 8e30dff3…, E4B Q4_0 4,590,807,392 bytes sha256 a555b900…. The E2B file was later downloaded in full and its SHA-256 matched the manifest value exactly.
- 2026-11-20, M6-T01 step 5, `llama-server --help` for b12556 confirms: `-m`, `--host`, `--port`, `--api-key`, `-c/--ctx-size`, `-np/--parallel`, `--no-webui`, `--jinja`, `--log-disable` all exist, so build_args includes `--no-webui` and `--jinja`. Live check during M6-T08: `GET /health` returns 200 WITHOUT the API key (the runtime probe still falls back to sending the key on 401/403).
- 2026-11-20, M6-T02, new crates: sha2 0.11.1, hex 0.4.3, zip 9.8.0 (default features OFF, `deflate` only — the GitHub archives use deflate; this also drops the zstd/bzip2 C backends), flate2 1.1.11, tar 0.4.46, uuid 1.29.3 (feature `v4`).
- 2026-11-20, M2-T06, Harper flags three spaces (`"   "`) as a Formatting lint ("French spaces are generally not recommended.", replacement `" "`), which conflicts with Plan.md 9.3 case 11 (whitespace-only input -> no marks). `run_check` therefore returns no suggestions for empty or whitespace-only text. The engine never sends such paragraphs anyway (splitParagraphs skips them); this only affects direct command calls.
- 2026-11-20, M2-T06, perf: `cargo test --release -- --ignored perf` PASS — median 14.54 ms over 50 runs of `run_check` on ~330 words with 5 typos (agent VM, release build). Budget is 50 ms.
- 2026-11-20, M2-T04, the four protection regexes are compiled once into `LazyLock<Option<Regex>>` (via `.ok()`) instead of `expect(...)`, keeping the code free of `expect` outside tests per Plan rule 16; a compile failure would return no ranges and fail the fixture tests loudly.

## Change log (newest first)
(Add new entries at the TOP of this section.)

### [2026-11-20 12:16 +06] MILESTONE 7 GATE — Milestone 7 gate checks (automated lines only)
- Type: test
- Files changed:
  - docs/Development Status.md (modified) — this entry, M7 rows, [HUMAN] items
  - docs/Roadmap.md — NOT ticked: the M7 [HUMAN] lines are OPEN (gate rule 3)
- Commands run and results:
  - `npm run verify` → PASS (2026-11-20 12:16 +06: svelte-check 0 errors 0 warnings, Vitest 160/160, cargo fmt/clippy/test — 72 unit + 1 integration)
- Acceptance criteria:
  - Sentence splitter tests pass → PASS
  - Pending tracker tests pass → PASS
  - Scheduler tests (pause, sentence-end, one at a time, stale abort, skip rules) → PASS
  - Results cached by text hash → PASS
  - Cloud auto-checks zero requests unless opted in → PASS (test); indicator [HUMAN] → OPEN below
  - No long task above 100 ms; numbers recorded → NOT RUN (needs a dev window; see M7-T06 row and the [HUMAN] item)
  - Purple marks appear after a pause and shift while typing [HUMAN] → NOT RUN — OPEN below
- Result: PARTIAL (automated lines PASS; completes when the [HUMAN] lines are verified)
- Commit: see git log
- Follow-ups: human runs the M7 window checks; then tick M7 in Roadmap.md. Next task: M8-T01.

### [2026-11-20 12:15 +06] M7-T01…M7-T05 — Sentences, pending tracker, check pipeline, scheduler, cloud visibility
- Type: code
- Files changed:
  - src/lib/engine/sentences.ts + test (created) — splitter with abbreviation/decimal/initial/quote/ellipsis rules and exact offsets; `sentenceAt`
  - src/lib/engine/pending.ts + test (created) — PendingTracker over the editor touch rule + text hashes
  - src/lib/engine/aiChecker.ts + test (created) — checkSentence (protect/prompt/validate/restore, >50% guard, LRU cache) and makeAiSuggestion
  - src/lib/engine/aiScheduler.ts + test (created) — pause + sentence-end triggers, queue (max 3, same-sentence replace), one in flight, stale abort, skip rules, hard-error pause until settings change
  - src/lib/engine/gating.test.ts (modified) — autoCloudActive false for local/off
  - src/App.svelte (modified) — scheduler wired to every transaction; sending state includes scheduler cloud requests; scheduler errors show as a bottom-bar note (cleared when Settings closes)
  - src/lib/ui/BottomBar.svelte (modified) — optional `note` line
  - src/lib/ui/SettingsDialog.svelte (modified) — "Each sentence you type will be sent to {host}." warning when cloud auto-check is allowed
  - src-tauri/src/local/download.rs (modified) — BUG FIX found by a failing M6 test: cancellation was only honoured between body chunks (an unbiased `tokio::select!` could also pick a ready chunk over the fired cancel token, making `cancel_stops_a_slow_download` racy). The initial request is now inside a biased select with the cancel token, and the chunk loop uses `biased;` too. The test now passes deterministically in ~0.1 s (was intermittently running the full 10 s mock delay and failing with checksum_mismatch).
- Commands run and results:
  - `npm run verify` → PASS — svelte-check 0 errors 0 warnings, Vitest 160/160 (43 new), cargo fmt/clippy/test (72 unit + 1 integration)
- Acceptance criteria: covered per-task in the Completed table above.
- Result: DONE (automated parts)
- Commit: see git log
- Follow-ups: M7 [HUMAN] checks; M8-T01 next

### [2026-11-20 12:03 +06] MILESTONE 6 GATE — Milestone 6 gate checks (automated lines only)
- Type: test
- Files changed:
  - docs/Development Status.md (modified) — this entry, M6 rows, smoke results, [HUMAN] items, known issues, open questions, decisions
  - docs/Roadmap.md — NOT ticked: the M6 [HUMAN] lines are OPEN (gate rule 3)
- Commands run and results:
  - `npm run verify` → PASS (2026-11-20 12:03 +06: svelte-check 0 errors 0 warnings, Vitest 117/117, cargo fmt/clippy/test — 72 unit + 1 integration)
- Acceptance criteria:
  - runtime-manifest.json has real URLs and SHA-256 values → PASS (values verified by downloading every asset and the E2B model; human confirmation noted in Open questions)
  - Download with progress, checksum check, and cancel pass tests → PASS
  - Archive extraction rejects path traversal (test passes) → PASS
  - Server starts on 127.0.0.1 with random key, health-checked, stops on idle/exit [HUMAN] → start + health verified headlessly in M6-T08; idle/exit in the app window NOT RUN — OPEN below
  - Model smoke test results recorded (6 inputs, no reasoning text) → PASS (M6-T08 entry below)
  - Settings UI download/progress/cancel/remove [HUMAN] → NOT RUN — OPEN below
- Result: PARTIAL (automated lines PASS; completes when the [HUMAN] lines are verified)
- Commit: see git log
- Follow-ups: human runs the M6 window checks; then tick M6 in Roadmap.md. Next task: M7-T01.

### [2026-11-20 12:00 +06] M6-T08 — Real-model smoke test (headless, agent route)
- Type: test
- Method: downloaded `gemma-4-E2B-it-Q4_0.gguf` (2,841,481,184 bytes; SHA-256 `8e30dff3ac4c8434c49a7036fa15564bdbb6044e42bf04550bf1a096ad7e6a52` — matches the manifest), ran the pinned `llama-server` b12556 with the app's exact build_args (loopback, random-key equivalent, `-c 4096 -np 1 --no-webui --jinja`), generated the six prompts with the app's own `buildPrompt`/`protectText`, sent them with the app's local request shape (temperature 0.2, `chat_template_kwargs.enable_thinking=false`), and judged the outputs with the app's own `cleanOutput`/`validate`/`restoreText`. `/health` answered 200 without the key. No `<think>` or reasoning text appeared in any output.
- Results (input -> restored output, validation):
  - fluent: "The meeting got moved by them to tomorrow because of they were busy." -> "They moved the meeting to tomorrow because they were busy." — PASS (5.6 s)
  - formal: "Hey, we can't make it, sorry. Can we do it next week?" -> "We are unable to attend. May we reschedule for next week?" — PASS (4.7 s)
  - concise: "In my personal opinion, I think that we should probably go ahead and start the project as soon as possible." -> "We should start the project as soon as possible." — PASS (5.2 s)
  - expand: "The app is fast." -> "The application exhibits high speed. This means that when you interact with it, such as typing or performing actions, the response time is very quick, allowing for a seamless and efficient user experience without any noticeable delays." — FAIL (length, ratio ~14x vs the 3.5x ceiling). Retry with the plan's retry suffix also failed length (219 chars). In the app this case ends with "Couldn't produce a safe rewrite. Your text is unchanged."
  - simplify: "The committee deliberated extensively before reaching a determination." -> "The group talked a lot before they made a decision." — PASS (4.2 s)
  - protection (fluent): "Please read https://example.com/guide and run `npm install` before Friday." -> identical output; placeholders [[P1]]/[[P2]] intact in the raw answer and the URL and code restored exactly — PASS (validation state "unchanged", i.e. no rewrite suggested; protection held)
- Result: DONE — 5 of 6 pass, 1 fails (expand/length), below the plan's >2 threshold for a prompt-tuning open question; the expand finding is recorded under Known issues.
- Follow-ups: none for the agent; the same six inputs can be re-run in the app window under the M6 [HUMAN] checks.

### [2026-11-20 11:58 +06] M6-T01…M6-T07 — Manifest, download, extract, runtime, commands, settings UI
- Type: code
- Files changed:
  - src-tauri/resources/runtime-manifest.json (created) — real b12556 + Gemma 4 Q4_0 values (see Decisions)
  - src-tauri/src/local/manifest.rs, paths.rs, download.rs, extract.rs, runtime.rs, mod.rs (created) — manifest parsing + URL allowlist; app-data paths; streaming download with SHA-256, `.part` cleanup, cancel token, 200 ms progress throttle; traversal-proof zip/tar.gz extraction; llama-server lifecycle (args, free port, health polling, idle watcher)
  - src-tauri/src/commands/local.rs (created) — local_status / local_install / local_cancel_install / local_stop / local_remove / local_remove_runtime with InstallEvent channel
  - src-tauri/src/commands/ai.rs (modified) — local branch: ensure/start/restart the runtime, stream via the local provider, update last_used; cloud policy untouched for local
  - src-tauri/src/state.rs, error.rs, lib.rs (modified) — local runtime + install-cancel in AppState, stop on RunEvent::Exit, idle watcher spawn, new error codes (checksum_mismatch, bad_archive, disk_space), 6 new commands registered
  - src-tauri/Cargo.toml (modified) — sha2, hex, zip (deflate only), flate2, tar, uuid
  - src/lib/types.ts, ipc.ts (modified) — LocalStatus/InstallEvent types and local command wrappers
  - src/lib/providers/localStatus.svelte.ts (created), registry.ts + registry.test.ts (modified) — installed-gating for the local provider
  - src/lib/ui/LocalSection.svelte (created), SettingsDialog.svelte, App.svelte (modified) — settings local section (radios, sizes, progress, cancel, remove, status), "Local model not installed" panel message, status refresh on mount
- Commands run and results:
  - `npm run verify` → PASS — svelte-check 0 errors 0 warnings, Vitest 117/117, cargo fmt/clippy/test (72 unit + 1 integration; includes 15 new local-module tests)
  - Live network checks (M6-T01): GitHub latest-release API, four asset downloads + sha256sum, HuggingFace blobs API for both repos, `llama-server --help` flag audit
- Acceptance criteria:
  - M6-T01 manifest parses, 64-hex hashes, https URLs → PASS. M6-T02/T03 tests → PASS. M6-T04 arg tests → PASS ([HUMAN] OPEN). M6-T05/T06/T07 builds → PASS ([HUMAN] OPEN)
- Result: DONE (automated parts)
- Commit: see git log
- Follow-ups: M6 [HUMAN] checks; M7-T01 next

### [2026-11-20 11:31 +06] MILESTONE 5 GATE — Milestone 5 gate checks (automated lines only)
- Type: test
- Files changed:
  - docs/Development Status.md (modified) — this entry, M5 rows, M5 [HUMAN] items, decision
  - docs/Roadmap.md — NOT ticked: the M5 [HUMAN] lines are OPEN (gate rule 3)
- Commands run and results:
  - `npm run verify` → PASS (2026-11-20 11:30 +06: svelte-check 0 errors 0 warnings, Vitest 116/116, cargo fmt/clippy/test — 57 unit + 1 integration)
- Acceptance criteria:
  - Word diff and hunk tests pass (accept all = new text, reject all = original) → PASS
  - Prompts for all modes exist and are tested → PASS
  - Placeholder protection and output validation tests pass → PASS
  - URL, code, and frozen words survive a rewrite [HUMAN] → NOT RUN — OPEN below
  - Diff view per-change accept/reject; Apply is one undo step [HUMAN] → NOT RUN — OPEN below
  - Custom presets add/edit/delete and persist [HUMAN] → NOT RUN — OPEN below
  - Stats tests pass; Summarize works with an AI engine [HUMAN] → tests PASS; Summarize NOT RUN — OPEN below
- Result: PARTIAL (automated lines PASS; completes when the [HUMAN] lines are verified)
- Commit: see git log
- Follow-ups: human runs the M5 window checks (needs a cloud key or local endpoint); then tick M5 in Roadmap.md. Next task: M6-T01.

### [2026-11-20 11:30 +06] M5-T01…M5-T09 — Diff view, modes, protection, validation, presets, tools
- Type: code
- Files changed:
  - src/lib/diff/wordDiff.ts, wordDiff.test.ts (created) — token LCS diff with Uint32Array DP and the >4M-cell fallback; 9 tests
  - src/lib/diff/hunks.ts, hunks.test.ts (created) — segments with whitespace-merge, applyHunks; 4 tests
  - src/lib/ui/InlineDiff.svelte, DiffView.svelte (created) — per-hunk accept/reject (click or Enter/Space), Accept all / Reject all / Apply / Cancel
  - src/lib/ui/SuggestionCard.svelte (modified) — rewrite marks over 24 chars show a non-interactive inline diff
  - src/lib/ai/modes.ts (created) — BUILT_IN_PRESETS + LENGTH_RANGE (Section 10.4) + presetById
  - src/lib/ai/prompts.ts (rewritten), prompts.test.ts (created) — all Section 10 modes incl. custom, check, summarize (with a written example pair); retry suffix; 10 tests
  - src/lib/ai/protect.ts, protect.test.ts (created) — [[Pn]] placeholders for fences/code/URLs/emails/frozen words, longest-match wins, max 30; placeholdersIntact; 9 tests
  - src/lib/ai/validate.ts, validate.test.ts (created) — cleanOutput (preface, fence, delimiters, quotes) + validate (empty/commentary/placeholders/frozen/length/unchanged); 14 tests
  - src/lib/ui/ModePicker.svelte, PresetEditor.svelte (created) — top-bar mode dropdown; preset CRUD in settings with the plan's validation limits
  - src/lib/ui/TopBar.svelte, SettingsDialog.svelte (modified) — ModePicker + ToolsMenu in the bar; presets section in settings
  - src/lib/ai/rewrite.ts (rewritten) — rewriteWithMode: protect, prompt, stream, validate, one retry, restore; unchanged passes through
  - src/lib/text/stats.ts, stats.test.ts (created) — wordCount, readingTimeMinutes (238 wpm), countSyllables, Flesch readability; 7 tests
  - src/lib/ui/ToolsMenu.svelte (created) — Reading time / Readability / Summarize popover (selection-aware, Copy button, never edits the document)
  - src/App.svelte, src/app.css (modified) — rewrite panel now streams a throttled live preview then shows DiffView; Apply is one isolated transaction; 6,000-char selection cap; word count from stats
- Commands run and results:
  - `npm run verify` → PASS — svelte-check 0 errors 0 warnings, Vitest 116/116, cargo side unchanged and green
- Acceptance criteria:
  - M5-T01/T02 tests → PASS. M5-T04/T05/T06 tests → PASS. M5-T03/T07/T08 builds → PASS ([HUMAN] OPEN). M5-T09 tests → PASS ([HUMAN] OPEN)
- Result: DONE (automated parts)
- Commit: see git log
- Follow-ups: M5 [HUMAN] checks; M6-T01 next (needs network checks for the runtime manifest)

### [2026-11-20 11:13 +06] MILESTONE 4 GATE — Milestone 4 gate checks (automated lines only)
- Type: test
- Files changed:
  - docs/Development Status.md (modified) — this entry, M4 rows, M4 [HUMAN] items, decisions
  - docs/Roadmap.md — NOT ticked: the M4 [HUMAN] lines are OPEN (gate rule 3)
- Commands run and results:
  - `npm run verify` → PASS (2026-11-20 11:13 +06: svelte-check 0 errors, Vitest 63/63, cargo fmt/clippy/test — 57 unit + 1 integration)
  - `grep -rn "get_key" src-tauri/src/commands` → no matches
  - `grep -rn "api_key|apiKey" src/lib/settings` → no matches
- Acceptance criteria:
  - Settings load/save with defaults; invalid URLs rejected (tests pass) → PASS
  - API key stored only in the keychain; no command returns it (grep + tests) → PASS
  - SSE parser and streaming client pass tests; cancel works → PASS
  - Rust refuses cloud calls without consent, without a key, and for auto-origin unless allowed (tests pass) → PASS
  - Engine badge shows engine and off-device state [HUMAN] → NOT RUN — OPEN below
  - Basic rewrite streams from a real cloud API, one undo step [HUMAN] → NOT RUN — OPEN below
- Result: PARTIAL (automated lines PASS; completes when the [HUMAN] lines are verified)
- Commit: see git log
- Follow-ups: human runs the M4 window checks (needs a real or fake cloud endpoint for T10/T11); then tick M4 in Roadmap.md. Next task: M5-T01.

### [2026-11-20 11:12 +06] M4-T01…M4-T11 — Settings, keychain, cloud provider, consent, rewrite panel
- Type: code
- Files changed:
  - src-tauri/src/settings.rs (created) — Section 6 settings structs with serde defaults, load/save via temp+rename, validate (https or loopback http, trailing slash stripped, clamps); 8 tests
  - src-tauri/src/secrets.rs (created) — keychain get/set/delete/has behind one shared Entry; commands never return the key; 4 mock tests
  - src-tauri/src/types.rs, error.rs (modified) — AiErrorCode (15 codes with messages), AiRequest, AiEvent; AppError gains BadUrl, EmptyApiKey, Ai(code)
  - src-tauri/src/providers/mod.rs, sse.rs, openai_compat.rs (created) — GrammarProvider/AiProvider traits per Section 7, incremental SSE parser (8 tests), OpenAiCompatProvider (build_body rules, status mapping, complete_once, streaming with per-chunk 30 s timeout and cancellation; wiremock tests incl. cancel)
  - src-tauri/src/commands/settings.rs, secrets.rs, ai.rs (created) — get/save_settings, key commands, ai_complete/ai_cancel/ai_test_connection, pure check_cloud_policy (6 tests + 2 wiremock)
  - src-tauri/src/state.rs, lib.rs (modified) — settings + cancel registry in AppState; settings loaded from the app config dir in setup; 9 commands registered
  - src-tauri/Cargo.toml (modified) — keyring 3, reqwest 0.13.5 (rustls), tokio, tokio-util, futures-util; wiremock dev-dependency
  - src/lib/ipc.ts (modified) — settings/secret/test wrappers + aiComplete with Channel and AbortSignal -> ai_cancel
  - src/lib/providers/types.ts, cloud.ts, local.ts, registry.ts, registry.test.ts (created) — Section 7 TS providers; cloud consent gate via an app-registered handler; registry (5 tests)
  - src/lib/settings/defaults.ts, store.svelte.ts (created) — DEFAULT_SETTINGS and the reactive store (load/save via Rust)
  - src/lib/ui/TopBar.svelte, SettingsDialog.svelte, EngineBadge.svelte, ConsentDialog.svelte (created); BottomBar.svelte (modified) — badge from gating (label, dot, auto-check pulse, sending state)
  - src/lib/engine/gating.ts, gating.test.ts (created) — engineLabel + autoAiAllowed/autoCloudActive (9 tests)
  - src/lib/ai/prompts.ts, rewrite.ts, errors.ts (created) — Section 10 fluent prompt, rewriteText, code-to-text map
  - src/App.svelte, src/app.css (modified) — TopBar, settings dialog, consent flow (Allow records the host and saves), rewrite panel (stream, Replace as one isolated transaction, Cancel aborts), badge wired to settings, engine dialect now follows settings
- Commands run and results:
  - `npm run verify` → PASS — svelte-check 0 errors, Vitest 63/63, cargo fmt/clippy/test (57 unit + 1 integration)
- Acceptance criteria:
  - M4-T01…T06 cargo test filters pass → PASS. M4-T07 registry tests → PASS. M4-T08 build + grep → PASS ([HUMAN] OPEN). M4-T09 gating tests → PASS ([HUMAN] OPEN). M4-T10 build → PASS ([HUMAN] OPEN). M4-T11 build → PASS ([HUMAN] OPEN)
- Result: DONE (automated parts)
- Commit: see git log
- Follow-ups: M4 [HUMAN] checks; M5-T01 next

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

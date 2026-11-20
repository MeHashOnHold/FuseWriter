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
- Current milestone: M1 — Project skeleton and docs
- Current task ID: M1-TGATE (gate checks run; milestone NOT ticked — [HUMAN] lines are still OPEN below, per gate rule 3)

## Last updated
- 2026-11-20 10:05 +06

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

## In progress
- (nothing — M1-TGATE is waiting on the [HUMAN] items below)

## Needs human verification
(Steps marked [HUMAN] that an agent could not check. A human replaces `OPEN` with `HUMAN-VERIFIED <date>` when done.)
- OPEN — M1-T04 / M1 gate: `npm run tauri dev` opens a window titled "FuseWriter" showing the app. (Agent is headless; the debug binary builds and links, but no window was seen.)
- OPEN — M1-T05 / M1 gate: the window shows the thin top bar and bottom bar and follows OS light/dark.
- OPEN — M1-T07 / M1 gate: devtools console in a dev build shows no CSP errors.

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

## Change log (newest first)
(Add new entries at the TOP of this section.)

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

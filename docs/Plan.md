# FuseWriter: Build Plan

Name: **FuseWriter**. Renamed by the human on 2026-11-20 from the working name "Quietwrite". Identifier used in config: `app.fusewriter.desktop`.
Plan written: 2026-11-20. Versions below were checked on that date.

How to read this file: Sections 1-7 explain the project. Section 8 is the task list. Sections 9-14 are reference. Do the tasks in order.

---

## 1. Project summary and goals

FuseWriter is a small desktop writing app. It checks spelling and grammar while you type. It is a private alternative to Grammarly and QuillBot.

What it does:
1. **Local checking, always on.** Harper (a Rust grammar checker) runs inside the app. It is fast and works offline.
2. **Marks appear while you type.** Red wavy line = spelling. Blue wavy line = grammar. Solid purple line = AI rewrite suggestion. No hotkey is needed.
3. **Tab fixes everything safe.** Tab applies all safe spelling and grammar fixes in one step. One Ctrl/Cmd+Z undoes all of them. Tab is only taken over while fixes are waiting. Otherwise Tab does its normal job.
4. **Click a mark to see a small card.** The card shows old word, new word, a one-line reason, Accept and Dismiss.
5. **Optional AI.** The user picks one engine: Off, Local (Gemma 4 through a llama.cpp process), or Cloud (any OpenAI-compatible API the user configures).
6. **Rewrite modes** (fluent, formal, concise, expand, simplify, custom presets) with a word-level diff and accept/reject per change.
7. **Tools:** summarize, word count, reading time, readability score.
8. **Proactive AI checking:** after a ~700 ms pause or a finished sentence, check only the changed sentence. Cancel old requests, cache results, keep marks in the right place while typing.
9. **Privacy first.** The UI always shows which engine is active and whether text leaves the device. There is no server, no account, no telemetry.

UI style: very quiet. One text area, a thin top bar (document name, mode picker, tools, settings) and a thin bottom bar ("4 quick fixes, Tab to fix all", engine label, word count).

### Later / not now (out of scope; do NOT build)
- System-wide integration in other apps.
- Browser extension.
- Plagiarism checking.
- AI-content detection.
- Accounts, sync, any backend server.
- Auto-update, telemetry, crash reporting.
- Multi-tab documents, rich text, spell-check for non-English languages.
- GPU-specific llama.cpp builds and Windows job objects for child cleanup.
- Automated end-to-end UI tests.
- "Add to dictionary" and persisted dismissals.

---

## 2. Agent rules (read these every session)

1. Read ALL three files (`docs/Plan.md`, `docs/Development Status.md`, `docs/Roadmap.md`) completely before doing any work. Quote the file name in quotes in shell commands. `Development Status.md` has a space in its name.
2. Open `docs/Development Status.md`. Find "Current task". If it is empty, take the first task in Section 8 that is not in "Completed tasks".
3. Work on ONE task at a time, in the order given. Never skip ahead. Every task listed under "Depends" must already be in "Completed tasks".
4. Do not add features, libraries, crates, npm packages, or files that are not in the plan. If something seems missing or wrong, write it under "Open questions for the human" in Development Status.md, mark the task BLOCKED, and STOP.
5. Do not rewrite files you were not asked to touch. If a compile error forces a small edit in another file, make the smallest possible edit and log the reason in the Change log.
6. Run the task's Verification steps before calling it done. If they fail, fix and re-run. After 3 failed attempts, record the failure under "Known issues and bugs", mark the task BLOCKED, and STOP. Never claim success without running the checks. Paste the real command and result in the log.
7. Steps marked **[HUMAN]** need a person with a screen. If you cannot see the app window, do not pretend. Write the step under "Needs human verification" in Development Status.md and continue with the automated checks.
8. After every change, update `docs/Development Status.md` exactly as its instructions say.
9. Do NOT edit `docs/Plan.md`. Only the human edits it.
10. Do NOT tick anything in `docs/Roadmap.md` except during a milestone gate task (`Mx-TGATE`), and only after every checklist line is verified and the evidence is written in Development Status.md.
11. Never invent an API. If you are not sure a function, struct, or flag exists, read the real source:
    - Rust crates: `~/.cargo/registry/src/*/<crate>-<version>/src/` (on Windows: `%USERPROFILE%\.cargo\registry\src\`).
    - npm packages: `node_modules/<pkg>/dist/*.d.ts`.
    - Tauri: https://v2.tauri.app
    Write what you found in "Decisions made during development".
12. Items marked **VERIFY BEFORE USE** must be checked with the command given, and the result recorded. If the result differs from the plan, STOP and write an open question.
13. Code rules (the checks enforce them):
    - TypeScript is strict. No `any`.
    - Rust: no `unwrap()` and no `expect()` outside `#[cfg(test)]`. The single exception is the final `.expect(...)` in `run()` in `src-tauri/src/lib.rs`.
    - Never print user text. No `println!`, `eprintln!`, `dbg!`, or `console.log` of document text, prompts, or responses. `lib.rs` has `#![deny(clippy::print_stdout, clippy::print_stderr, clippy::dbg_macro)]`.
    - The webview never makes network requests. All HTTP happens in Rust.
    - Never use `localStorage` or `sessionStorage`. Settings live in Rust. The API key lives in the OS keychain.
    - Svelte 5 syntax only: `$state`, `$derived`, `$effect`, `$props()`, `onclick={...}`, `{#snippet}`, `mount()`. Do NOT use `export let`, `$:`, `on:click`, `writable()`, or `new App()`.
14. **Offsets rule:** every text offset that crosses the Rust/JS boundary is a **UTF-16 code unit** offset (what JavaScript and CodeMirror use). Rust converts Harper's char offsets before returning.
15. Commit after every finished task: `git add -A && git commit -m "M2-T03: <task title>"`. Never force-push. Never commit secrets.
16. If you lose context or are unsure what state the project is in: re-read the three docs. Development Status.md is the source of truth. Never guess.
17. Never put real API keys, real user text, or model outputs from private text in any file.

---

## 3. Architecture overview

````
+------------------------- Tauri window (WebView) -------------------------+
|  Svelte UI: TopBar | BottomBar | SuggestionCard | DiffView | Settings      |
|          ^ reads state                                                     |
|  CodeMirror 6 editor                                                       |
|    StateField(marks) -> decorations (red / blue / purple)                  |
|    Tab keymap -> ONE transaction for all safe fixes                        |
|          | doc changes                       ^ setMarks effects            |
|          v                                   |                             |
|  SuggestionEngine (TypeScript)                                             |
|    paragraphs, sentences, hash cache, debounce, cancel, stale checks       |
|          | invoke() / Channel                                              |
+----------|-----------------------------------------------------------------+
           v
+----------------------- Rust backend (src-tauri) -------------------------+
|  commands: check_text | ai_complete | ai_cancel | settings | secrets |     |
|            files | local_*                                                 |
|  HarperEngine (in-process, harper-core)                                    |
|  OpenAiCompatProvider --+--> Local: http://127.0.0.1:<port>/v1 --> llama-server (child process)
|                         +--> Cloud: https://<user base url>/chat/completions
|  Settings JSON (app config dir)    Secrets (OS keychain)                   |
+----------------------------------------------------------------------------+
````

### Data flow

**A. Typing -> spelling/grammar marks (Harper).**
1. The user types. CodeMirror updates the document.
2. The StateField immediately maps existing marks through the change (so marks shift correctly). Marks touched by the edit are removed.
3. The update listener calls `engine.onDocChanged()`.
4. After ~100 ms the engine splits the text into paragraphs, hashes each, and looks up a cache. Cache miss means `invoke("check_text", {text, dialect})`.
5. Rust runs Harper, drops lints inside URLs/emails/code, converts offsets to UTF-16, classifies `safeToAutoApply`, and returns `RawSuggestion[]`.
6. The engine checks the paragraph text is still the same, converts to `Suggestion` (adds id and absolute offsets), and dispatches `setMarks`.
7. The StateField rebuilds decorations. The bottom bar recounts.

**B. Tab.** Tab keymap (highest priority) -> collect safe Harper marks -> verify each `original` still matches the document -> ONE `view.dispatch` with all changes -> single undo step. If nothing is pending, the handler returns `false` and Tab behaves normally.

**C. Click a mark.** Click handler finds `data-sid` -> shows `SuggestionCard` near the mark -> Accept applies one change (own undo step); Dismiss removes the mark and remembers it for this session.

**D. Explicit rewrite.** User selects text (or uses the current paragraph) and clicks Rewrite -> protect URLs/code/frozen words with placeholders -> `ai_complete` streams tokens -> validate output -> word diff -> user accepts/rejects each change -> Apply (one transaction).

**E. Proactive AI check.** Pause (700 ms) or sentence end -> pick the changed sentence -> skip if gated -> `ai_complete` (task "check") -> validate -> if text changed, add a purple mark over the sentence.

**F. Local model install.** Settings -> choose model -> Rust downloads runtime + model (progress events) -> checks SHA-256 -> unpacks -> on first AI request Rust starts `llama-server` on 127.0.0.1 with a random API key -> same OpenAI-compatible client talks to it.

---

## 4. Repository structure

````
fusewriter/
  docs/
    Plan.md                     This file. Human edits only.
    Development Status.md       Living log. Agents update after every change.
    Roadmap.md                  Milestones. Ticked only at gates.
  assets/app-icon.svg           Source for `tauri icon`.
  index.html                    Vite entry HTML.
  package.json / package-lock.json   Exact-pinned npm deps and scripts.
  vite.config.ts                Vite + Vitest config.
  svelte.config.js              Svelte preprocess config.
  tsconfig.json                 Strict TypeScript.
  .gitignore
  src/
    main.ts                     Mounts App.
    App.svelte                  Layout, wires editor + engine + UI.
    app.css                     CSS variables, light/dark, mark styles.
    vite-env.d.ts
    lib/
      types.ts                  Shared TS types (Suggestion, Settings...).
      ipc.ts                    Typed wrappers around invoke()/Channel.
      editor/
        createEditor.ts         Builds the CodeMirror EditorView.
        suggestionField.ts      StateField of marks, effects, mapping.
        marks.ts                Decorations and CSS class names.
        touch.ts                Pure rule: does an edit invalidate a mark?
        applyFix.ts             Apply one suggestion as one transaction.
        tabFix.ts               Tab-to-fix-all (one transaction) + keymap.
        status.ts               Counts for the bottom bar.
      engine/
        hash.ts                 cyrb53 text hash.
        lru.ts                  Small LRU cache.
        paragraphs.ts           Split text into paragraphs/chunks.
        sentences.ts            Sentence splitter.
        SuggestionEngine.ts     Harper scheduling, cache, stale guard.
        aiChecker.ts            Proactive sentence checks.
        gating.ts               Pure rules: when may AI run automatically.
      providers/
        types.ts                GrammarProvider / AiProvider interfaces.
        cloud.ts, local.ts      Thin adapters over ipc.
        registry.ts             Picks the active provider from settings.
      ai/
        modes.ts                Mode definitions + built-in presets.
        prompts.ts              Prompt builders.
        protect.ts              Placeholder protection for URLs/code/frozen words.
        validate.ts             Output cleaning and checks.
        rewrite.ts              Rewrite flow (protect -> stream -> validate).
      diff/
        wordDiff.ts             Word-level diff.
        hunks.ts                Group diff into accept/reject hunks.
      text/stats.ts             Word count, reading time, readability.
      settings/
        defaults.ts             Default settings.
        store.svelte.ts         Reactive settings store.
      ui/                       TopBar, BottomBar, SuggestionCard, InlineDiff,
                                DiffView, SettingsDialog, ModePicker, PresetEditor,
                                ToolsMenu, ConsentDialog, EngineBadge, Icon (.svelte)
  src-tauri/
    Cargo.toml / build.rs / tauri.conf.json
    capabilities/default.json   Window permissions.
    icons/                      Generated by `tauri icon`.
    resources/runtime-manifest.json   Pinned llama.cpp + model URLs and SHA-256.
    src/
      main.rs                   Calls run().
      lib.rs                    Builder, plugins, commands, exit cleanup.
      state.rs                  AppState (Harper engine, local runtime, cancel map).
      types.rs                  RawSuggestion, CheckResult, AiEvent, etc.
      error.rs                  AppError enum -> safe user-facing codes.
      settings.rs               Settings struct, load/save (atomic write).
      secrets.rs                Keychain wrapper (keyring crate).
      harper/
        mod.rs                  HarperEngine (build linter, lint text).
        mapping.rs              char index -> UTF-16 index.
        convert.rs              Harper Lint -> RawSuggestion.
        protect.rs              Find URL/email/code ranges; filter lints.
        safety.rs               safeToAutoApply rules.
      providers/
        mod.rs                  traits GrammarProvider, AiProvider.
        openai_compat.rs        OpenAI-compatible client (local + cloud).
        sse.rs                  SSE byte-stream parser.
      local/
        manifest.rs             Parse runtime-manifest.json.
        paths.rs                App data dir layout.
        download.rs             Download + progress + SHA-256 + cancel.
        extract.rs              Safe zip / tar.gz extraction.
        runtime.rs              Spawn/stop llama-server, health check, idle stop.
      commands/
        mod.rs, check.rs, ai.rs, settings.rs, secrets.rs, files.rs, local.rs
    tests/
      fixtures/harper-cases.json, protect-cases.json
      harper_cases.rs           Integration tests using fixtures.
````

---

## 5. Technology list

Verified on 2026-11-20 unless marked VERIFY BEFORE USE.

| Item | Version | Why / notes |
|---|---|---|
| Rust | >= 1.90 | Tauri 2.12 raised its minimum Rust version to 1.90. Check with `rustc --version`. |
| Tauri (Rust crate `tauri`) | 2.12.x (use the newest 2.12 patch `cargo add` resolves; VERIFY the number and record it) | Small desktop shell with a Rust backend. Tauri 2.12 dropped Windows 7. |
| `@tauri-apps/cli` | 2.12.5 (released 2026-11-16) | Build tool. |
| `@tauri-apps/api` | 2.12.1 | JS bindings (`invoke`, `Channel`). |
| `tauri-plugin-dialog` + `@tauri-apps/plugin-dialog` | 2.7.2 seen (VERIFY newest 2.x) | Native Open/Save dialogs. Only plugin used. |
| `harper-core` | **=3.2.0** (released 2026-11-13), feature `concurrent` | The grammar engine. Pinned exactly because its API changes between majors. |
| `keyring` | 3.6.3, features `apple-native`, `windows-native`, `sync-secret-service` (VERIFY no newer major) | Stores the cloud API key in the OS keychain. |
| `reqwest` | VERIFY: use what `cargo add` resolves; features `json`, `stream`, rustls TLS (feature name differs by version; VERIFY) | HTTP client. Rustls avoids OpenSSL on Linux. |
| `tokio`, `tokio-util`, `futures-util`, `serde`, `serde_json`, `thiserror`, `regex`, `sha2`, `hex`, `zip`, `flate2`, `tar`, `uuid` (feature `v4`) | VERIFY: use what `cargo add` resolves. `zip` should be the same major as harper-core's dependency (^8) to avoid duplicates. | Streaming, cancel, JSON, errors, protect regex, SHA-256, archives, random token. |
| `wiremock` (dev-dependency only) | VERIFY | Fake HTTP server in tests. |
| CodeMirror 6 | `@codemirror/state` 6.7.0, `@codemirror/view` 6.43.x, `@codemirror/commands` 6.10.4 (all seen July 2026; VERIFY newest with `npm view`) | Editor. Only these three packages are used. |
| Svelte | 5.x (VERIFY with `npm view svelte version`; must be major 5) | Small UI chrome. Runes syntax. |
| Vite, `@sveltejs/vite-plugin-svelte`, TypeScript, `svelte-check`, `@tsconfig/svelte`, Vitest | VERIFY with `npm view`. Record exact versions. | Build and test tools. |
| Node.js | Current LTS. VERIFY with `node -v`. If Vite prints an engine warning, STOP. | |
| llama.cpp `llama-server` | Pinned release tag chosen in M6-T01 (tags look like `b10xxx`). VERIFY. | OpenAI-compatible local server, run as a child process. |
| Gemma 4 E2B (default), E4B (quality option) GGUF | Repos `ggml-org/gemma-4-E2B-it-GGUF`, `ggml-org/gemma-4-E4B-it-GGUF`, license Apache-2.0. Observed 4-bit `Q4_0`: E2B 2.84 GB, E4B 4.59 GB. Exact filenames and SHA-256 are fixed in M6-T01. | Small local models. |

### Stack decisions and the reasons
No serious problem was found with the requested stack. Changes and refinements:
1. **All HTTP runs in Rust, not the webview.** The API key never reaches JavaScript. The webview has no network permission (CSP).
2. **llama.cpp is downloaded at runtime, not bundled as a Tauri `externalBin`.** The Windows build ships many DLLs next to `llama-server.exe`, and bundling per-platform binaries makes the installer large. The "sidecar" is a child process launched from the app data folder.
3. **Svelte 5** for the chrome (bars, card, dialogs). Logic lives in plain TypeScript modules.
4. **Own word-diff code** (about 60 lines) instead of a diff library.
5. **Harper runs on `spawn_blocking`** behind a `Mutex`. Harper lints are `Send`. The `concurrent` feature makes the linter thread-safe. If it still does not compile, use a dedicated worker thread and record the decision.
6. **Known platform issue:** upstream llama.cpp macOS arm64 builds were reported to require macOS 26. See risks (Section 13).

---

## 6. Key data structures

### TypeScript (`src/lib/types.ts`)

````ts
export type Dialect = "american" | "british" | "canadian" | "australian";
export type SuggestionSource = "harper" | "ai-local" | "ai-cloud";
export type SuggestionKind = "spelling" | "grammar" | "rewrite";

/** What Rust returns. Offsets are UTF-16, relative to the text that was sent. */
export interface RawSuggestion {
  start: number;
  end: number;
  original: string;
  replacement: string;
  alternatives: string[];        // up to 3 other replacements
  kind: "spelling" | "grammar";
  reason: string;                // one line, plain text, max 140 chars
  safeToAutoApply: boolean;
}

/** What the editor stores. Offsets are absolute in the document. */
export interface Suggestion {
  id: string;                    // `${source}:${kind}:${start}:${end}:${hashText(original + "->" + replacement)}`
  start: number;
  end: number;
  original: string;
  replacement: string;
  alternatives: string[];
  source: SuggestionSource;
  kind: SuggestionKind;
  reason: string;
  safeToAutoApply: boolean;      // ALWAYS false when kind === "rewrite" or source !== "harper"
}

export interface RewritePreset {
  id: string;                    // "fluent" | "formal" | "concise" | "expand" | "simplify" | "custom-<uuid>"
  name: string;
  builtIn: boolean;
  instruction: string;           // used only for custom presets
  frozenWords: string[];         // must survive the rewrite exactly
}

export interface Settings {
  schemaVersion: 1;
  engine: "off" | "local" | "cloud";
  autoCheck: {
    enabled: boolean;            // proactive AI checks (default true)
    allowCloud: boolean;         // default false. Cloud auto-checks need this.
    pauseMs: number;             // default 700
  };
  dialect: Dialect;              // default "american"
  cloud: {
    baseUrl: string;             // e.g. "https://api.example.com/v1". Default "".
    model: string;               // default ""
    temperature: number | null;  // default null (field not sent)
    consentHosts: string[];      // hosts the user approved, e.g. ["openrouter.ai"]
  };                             // NOTE: the API key is NOT here. It is in the OS keychain.
  local: {
    modelId: "gemma-4-e2b" | "gemma-4-e4b";   // default "gemma-4-e2b"
    idleStopMinutes: number;     // default 10
  };
  rewrite: {
    activePresetId: string;      // default "fluent"
    customPresets: RewritePreset[];
  };
}
````

Rust mirrors these with `#[serde(rename_all = "camelCase")]` and `#[serde(default)]` on every struct, so old settings files still load.

### IPC types (Rust <-> TS)

````ts
export interface CheckResult { suggestions: RawSuggestion[]; elapsedMs: number; }

export interface AiRequest {
  engine: "local" | "cloud";
  origin: "user" | "auto";       // Rust refuses cloud + "auto" unless autoCheck.allowCloud
  task: "check" | "rewrite" | "summarize";
  prompt: string;                // full prompt, built in TS (see Section 10)
  maxTokens: number;
}

export type AiEvent =
  | { type: "token"; text: string }
  | { type: "done"; text: string }
  | { type: "error"; code: AiErrorCode; message: string };

export type AiErrorCode =
  | "no_engine" | "no_api_key" | "bad_url" | "consent_required" | "auto_cloud_blocked"
  | "unauthorized" | "not_found" | "rate_limited" | "network" | "timeout"
  | "server" | "cancelled" | "empty" | "local_not_installed" | "local_start_failed";
````

### Rust (`src-tauri/src/types.rs`, shape only)

````rust
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RawSuggestion {
    pub start: usize, pub end: usize,
    pub original: String, pub replacement: String,
    pub alternatives: Vec<String>,
    pub kind: RawKind,            // enum: Spelling | Grammar, serialized lowercase
    pub reason: String,
    pub safe_to_auto_apply: bool,
}
````

### Runtime manifest (`src-tauri/resources/runtime-manifest.json`)

````json
{
  "schemaVersion": 1,
  "runtime": {
    "tag": "<llama.cpp release tag>",
    "assets": {
      "windows-x86_64": { "url": "...", "sha256": "...", "archive": "zip",    "sizeBytes": 0 },
      "macos-aarch64":  { "url": "...", "sha256": "...", "archive": "tar.gz", "sizeBytes": 0 },
      "macos-x86_64":   { "url": "...", "sha256": "...", "archive": "tar.gz", "sizeBytes": 0 },
      "linux-x86_64":   { "url": "...", "sha256": "...", "archive": "tar.gz", "sizeBytes": 0 }
    }
  },
  "models": [
    { "id": "gemma-4-e2b", "label": "Gemma 4 E2B", "default": true,
      "url": "...", "file": "...", "sha256": "...", "sizeBytes": 0 },
    { "id": "gemma-4-e4b", "label": "Gemma 4 E4B (better quality)", "default": false,
      "url": "...", "file": "...", "sha256": "...", "sizeBytes": 0 }
  ]
}
````
The `...` and `0` values are filled by M6-T01 from real downloads. They are data, not plan gaps.

---

## 7. Provider interface

Two kinds of provider sit behind two interfaces.

**GrammarProvider** (synchronous-style, always local): Harper.
**AiProvider** (streaming text completion): Local llama-server and Cloud. Both speak the OpenAI chat-completions protocol, so one Rust client type serves both. Only its config differs.

### TypeScript (`src/lib/providers/types.ts`)

````ts
export interface GrammarProvider {
  id: "harper";
  check(text: string, dialect: Dialect): Promise<RawSuggestion[]>;
}

export interface AiProvider {
  id: "local" | "cloud";
  label: string;                         // "Gemma 4 E2B" or the cloud host name
  sendsTextOffDevice: boolean;           // false for local, true for cloud
  complete(
    req: Omit<AiRequest, "engine">,
    handlers: { onToken?: (t: string) => void },
    signal: AbortSignal
  ): Promise<string>;                    // resolves with the full text; rejects with AiError
}

export class AiError extends Error { constructor(public code: AiErrorCode, message: string) { super(message); } }
````

`registry.ts` exports `getGrammarProvider(): GrammarProvider` (always Harper) and `getAiProvider(settings): AiProvider | null` (null when engine is "off").

### Rust (`src-tauri/src/providers/mod.rs`)

````rust
pub trait GrammarProvider {
    fn check(&mut self, text: &str) -> Vec<RawSuggestion>;
}

pub trait AiProvider {
    fn sends_text_off_device(&self) -> bool;
    async fn chat_stream(
        &self,
        prompt: &str,
        max_tokens: u32,
        cancel: tokio_util::sync::CancellationToken,
        on_token: impl FnMut(&str) + Send,
    ) -> Result<String, AppError>;
}
// One concrete type implements AiProvider: OpenAiCompatProvider { base_url, api_key: Option<String>, model, kind: Local|Cloud, extra_body }
// HarperEngine implements GrammarProvider.
````
(Use static dispatch / generics. Do not use `dyn AiProvider`; async fns in traits are not object-safe.)

### Request shape sent by `OpenAiCompatProvider`
````json
POST {base_url}/chat/completions
Authorization: Bearer <key>        (omitted if no key)
{
  "model": "<model>",
  "messages": [{"role": "user", "content": "<prompt>"}],
  "stream": true,
  "max_tokens": <n>,
  "temperature": 0.2,                         // local always; cloud only if settings.cloud.temperature is not null
  "chat_template_kwargs": {"enable_thinking": false}   // LOCAL ONLY
}
````
Only `choices[0].delta.content` is read. Any `reasoning_content` is ignored.

---

## 8. Task list

### How tasks work
- **Std-verify (SV)** = `npm run verify` exits with code 0. (Defined in M1-T04. Before M1-T04 exists, use the commands listed in the task.)
- **[HUMAN]** = needs a person with a screen (rule 7).
- **Gate task `Mx-TGATE`** (last task of each milestone):
  1. Open Roadmap.md and read the checklist for milestone x.
  2. For each line, run the check it names. Record command and result in Development Status.md.
  3. For [HUMAN] lines, add them to "Needs human verification". Do NOT tick the milestone yet. You may continue with the next milestone's tasks.
  4. When every line is verified, write a Change log entry titled `MILESTONE x GATE` listing the evidence. Only then tick the boxes in Roadmap.md and set that milestone's status to Complete.
  5. Set "Current milestone" to the next milestone.
  Depends: all other tasks in milestone x.
- A task is "done" only when all Acceptance lines are true AND Verification was run AND the log entry is written AND the commit is made.

---

## MILESTONE 1: Project skeleton and docs

### M1-T01: Check the machine and start git
- **Goal:** Know the tool versions and have a git repo with the docs committed.
- **Files:** `.gitignore` (create)
- **Depends:** none
- **Steps:**
  1. Run `node -v`, `npm -v`, `rustc --version`, `cargo --version`, `git --version`. Record all five in Development Status.md under Decisions.
  2. If Rust is older than 1.90, run `rustup update stable` and re-check.
  3. Install platform build tools. Windows: Microsoft C++ Build Tools and the WebView2 runtime. macOS: `xcode-select --install`. Linux (Debian/Ubuntu): `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`. **VERIFY BEFORE USE** against https://v2.tauri.app/start/prerequisites/ and record any difference.
  4. If there is no `.git` folder, run `git init`.
  5. Create `.gitignore` with exactly these lines: `node_modules/`, `dist/`, `src-tauri/target/`, `src-tauri/gen/`, `.DS_Store`, `*.log`, `*.part`, `.env`.
  6. Confirm the three docs exist: `ls docs`.
  7. `git add -A && git commit -m "M1-T01: repo init"`.
- **Commands:** as listed.
- **Accept:** Five versions recorded. Rust >= 1.90. `git log --oneline` shows one commit. `docs/` has three files.
- **Verify:** `git status` is clean. `cargo --version` works.

### M1-T02: Create package.json and install frontend dependencies
- **Goal:** Exact-pinned npm dependencies installed.
- **Files:** `package.json`, `package-lock.json`
- **Depends:** M1-T01
- **Steps:**
  1. `npm init -y`.
  2. Edit `package.json`: set `"name": "fusewriter"`, `"version": "0.1.0"`, `"private": true`, `"type": "module"`. Delete the `main`, `keywords`, `author`, `license` and `description` fields.
  3. Run `npm install --save-exact @tauri-apps/api @tauri-apps/plugin-dialog @codemirror/state @codemirror/view @codemirror/commands`.
  4. Run `npm install --save-dev --save-exact svelte @sveltejs/vite-plugin-svelte vite typescript svelte-check @tsconfig/svelte vitest @tauri-apps/cli`.
  5. Add this `scripts` block to package.json:
````json
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "check": "svelte-check --tsconfig ./tsconfig.json",
       "test": "vitest run --passWithNoTests",
       "tauri": "tauri"
     }
````
  6. Run `npm ls --depth=0` and paste the output into Development Status.md under Decisions.
  7. Compare with Section 5. If `svelte` is not major 5, or `@tauri-apps/cli` / `@tauri-apps/api` are not 2.12.x, STOP and write an open question.
- **Commands:** as listed.
- **Accept:** `package-lock.json` exists. No `^` or `~` in package.json dependency versions.
- **Verify:** `grep -E '"[\^~][0-9]' package.json` prints nothing. `npm ls --depth=0` has no `UNMET` or `ERR`.

### M1-T03: Frontend config and a "hello" page
- **Goal:** Vite + Svelte + strict TypeScript builds.
- **Files:** `vite.config.ts`, `svelte.config.js`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/App.svelte`, `src/vite-env.d.ts`, `src/app.css` (empty for now)
- **Depends:** M1-T02
- **Steps:**
  1. `vite.config.ts`:
````ts
     import { defineConfig } from "vitest/config";
     import { svelte } from "@sveltejs/vite-plugin-svelte";

     export default defineConfig({
       plugins: [svelte()],
       clearScreen: false,
       server: { port: 1420, strictPort: true, host: "127.0.0.1", watch: { ignored: ["**/src-tauri/**"] } },
       build: { target: "es2022", outDir: "dist", emptyOutDir: true },
       test: { environment: "node", include: ["src/**/*.test.ts"] },
     });
````
  2. `svelte.config.js`:
````js
     import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
     export default { preprocess: vitePreprocess() };
````
  3. `tsconfig.json`:
````json
     {
       "extends": "@tsconfig/svelte/tsconfig.json",
       "compilerOptions": {
         "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
         "strict": true, "verbatimModuleSyntax": true, "isolatedModules": true,
         "noEmit": true, "skipLibCheck": true, "types": ["svelte", "vite/client"]
       },
       "include": ["src/**/*.ts", "src/**/*.svelte", "src/**/*.d.ts"]
     }
````
  4. `index.html`:
````html
     <!doctype html>
     <html lang="en">
       <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>FuseWriter</title></head>
       <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
     </html>
````
  5. `src/main.ts`:
````ts
     import "./app.css";
     import { mount } from "svelte";
     import App from "./App.svelte";

     const target = document.getElementById("app");
     if (!target) throw new Error("#app not found");
     export default mount(App, { target });
````
  6. `src/App.svelte`: `<main>FuseWriter</main>`
  7. `src/vite-env.d.ts`: `/// <reference types="svelte" />` and `/// <reference types="vite/client" />` (two lines).
  8. Create empty `src/app.css`.
- **Commands:** `npm run build`, `npm run check`
- **Accept:** `dist/index.html` exists after build. `svelte-check` reports 0 errors.
- **Verify:** both commands exit 0. `git commit`.

### M1-T04: Initialize Tauri (Rust side) and the verify script
- **Goal:** A Rust project that builds, plus the `verify` script.
- **Files:** `src-tauri/*`, `assets/app-icon.svg`, `package.json` (scripts)
- **Depends:** M1-T03
- **Steps:**
  1. Run `npx tauri init --help` and confirm these flags exist: `--ci --app-name --window-title --frontend-dist --dev-url --before-dev-command --before-build-command`. **VERIFY BEFORE USE.** If any is missing, use the nearest equivalent and record it.
  2. Run: `npx tauri init --ci --app-name fusewriter --window-title FuseWriter --frontend-dist ../dist --dev-url http://127.0.0.1:1420 --before-dev-command "npm run dev" --before-build-command "npm run build"`
  3. Replace `src-tauri/tauri.conf.json` with:
````json
     {
       "$schema": "https://schema.tauri.app/config/2",
       "productName": "FuseWriter",
       "version": "0.1.0",
       "identifier": "app.fusewriter.desktop",
       "build": {
         "beforeDevCommand": "npm run dev",
         "devUrl": "http://127.0.0.1:1420",
         "beforeBuildCommand": "npm run build",
         "frontendDist": "../dist"
       },
       "app": {
         "windows": [{ "label": "main", "title": "FuseWriter", "width": 960, "height": 720, "minWidth": 480, "minHeight": 360 }],
         "security": {
           "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src ipc: http://ipc.localhost",
           "devCsp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src ipc: http://ipc.localhost ws://127.0.0.1:1420 http://127.0.0.1:1420"
         }
       },
       "bundle": {
         "active": true,
         "targets": "all",
         "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"]
       }
     }
````
     **VERIFY BEFORE USE:** key names against the schema URL. If `devCsp` is rejected, remove it and record it.
  4. Create `assets/app-icon.svg`:
````svg
     <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="224" fill="#4f46e5"/><path d="M280 380h464M280 512h464M280 644h288" stroke="#ffffff" stroke-width="64" stroke-linecap="round" fill="none"/></svg>
````
     Run `npx tauri icon assets/app-icon.svg`.
  5. Edit `src-tauri/Cargo.toml`: package name `fusewriter`, edition `2024`, and:
````toml
     [lib]
     name = "fusewriter_lib"
     crate-type = ["staticlib", "cdylib", "rlib"]
````
     Dependencies at this point: `tauri` (2.12.x, no extra features), `serde` (feature `derive`), `serde_json`. Build dependency: `tauri-build` (same minor as `tauri`). Use `cargo add` inside `src-tauri/` so versions resolve; then check they are in the 2.12 line.
  6. `src-tauri/src/main.rs`:
````rust
     #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

     fn main() {
         fusewriter_lib::run()
     }
````
  7. `src-tauri/src/lib.rs`:
````rust
     #![deny(clippy::print_stdout, clippy::print_stderr, clippy::dbg_macro)]

     pub fn run() {
         tauri::Builder::default()
             .run(tauri::generate_context!())
             .expect("error while running tauri application");
     }
````
  8. Add to package.json scripts:
````json
     "rust:check": "cargo fmt --manifest-path src-tauri/Cargo.toml --check && cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings && cargo test --manifest-path src-tauri/Cargo.toml",
     "verify": "npm run check && npm run test && npm run rust:check"
````
  9. Run `cargo fmt --manifest-path src-tauri/Cargo.toml` once, then `npm run verify`.
  10. Write the exact resolved `tauri` crate version into Decisions.
- **Commands:** `npm run verify`, `npm run tauri dev`
- **Accept:** `npm run verify` exits 0. `npm run tauri dev` compiles and starts.
- **Verify:** SV. **[HUMAN]** A window titled "FuseWriter" opens and shows the word "FuseWriter".

### M1-T05: CSS variables and layout skeleton
- **Goal:** Light/dark theme and the three-row layout (top bar, editor area, bottom bar).
- **Files:** `src/app.css`, `src/App.svelte`
- **Depends:** M1-T04
- **Steps:**
  1. Write `src/app.css`:
````css
     :root {
       color-scheme: light dark;
       --bg: #ffffff; --fg: #1f2328; --muted: #6b7280; --border: #e5e7eb; --surface: #f6f7f9;
       --accent: #4f46e5;
       --mark-spell: #dc2626; --mark-grammar: #2563eb; --mark-ai: #7c3aed;
       --ok: #16a34a; --warn: #d97706;
       --font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
       --radius: 8px; --bar-h: 36px;
     }
     @media (prefers-color-scheme: dark) {
       :root {
         --bg: #16181d; --fg: #e6e8eb; --muted: #9aa3b2; --border: #2a2e37; --surface: #1d2027;
         --accent: #818cf8;
         --mark-spell: #f87171; --mark-grammar: #60a5fa; --mark-ai: #a78bfa;
         --ok: #4ade80; --warn: #fbbf24;
       }
     }
     html, body, #app { height: 100%; margin: 0; }
     body { background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 14px; }
     .app { display: grid; grid-template-rows: var(--bar-h) 1fr var(--bar-h); height: 100%; }
     .bar { display: flex; align-items: center; gap: 12px; padding: 0 14px; color: var(--muted); }
     .bar.top { border-bottom: 1px solid var(--border); }
     .bar.bottom { border-top: 1px solid var(--border); font-size: 12px; }
     .spacer { flex: 1; }
     .editor-wrap { position: relative; overflow: auto; }
     button { font: inherit; color: inherit; background: none; border: 1px solid transparent; border-radius: 6px; padding: 3px 8px; cursor: pointer; }
     button:hover { background: var(--surface); border-color: var(--border); }
     .qw-spell   { text-decoration: underline wavy var(--mark-spell);   text-decoration-thickness: 1.5px; text-underline-offset: 3px; }
     .qw-grammar { text-decoration: underline wavy var(--mark-grammar); text-decoration-thickness: 1.5px; text-underline-offset: 3px; }
     .qw-ai      { text-decoration: underline solid var(--mark-ai);     text-decoration-thickness: 2px;   text-underline-offset: 3px; }
````
  2. `src/App.svelte`: a `<div class="app">` with `<header class="bar top">` (text "Untitled"), `<div class="editor-wrap" id="editor-host"></div>`, `<footer class="bar bottom">` (empty `<span>` for now). No logic yet.
- **Commands:** `npm run build`, `npm run check`
- **Accept:** Build and check pass. **[HUMAN]** Window shows the thin top bar and bottom bar, and follows OS light/dark.
- **Verify:** SV.

### M1-T06: Hash utility (first real code and test)
- **Goal:** Prove the TypeScript test setup works with a real module.
- **Files:** `src/lib/engine/hash.ts`, `src/lib/engine/hash.test.ts`
- **Depends:** M1-T05
- **Steps:**
  1. `hash.ts` (this is the standard "cyrb53" hash):
````ts
     export function hashText(str: string, seed = 0): string {
       let h1 = 0xdeadbeef ^ seed;
       let h2 = 0x41c6ce57 ^ seed;
       for (let i = 0; i < str.length; i++) {
         const ch = str.charCodeAt(i);
         h1 = Math.imul(h1 ^ ch, 2654435761);
         h2 = Math.imul(h2 ^ ch, 1597334677);
       }
       h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
       h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
       return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
     }
````
  2. Tests: same string gives same hash; different strings give different hashes (`"teh"` vs `"the"`); empty string works; a 100,000-char string hashes without error.
- **Commands:** `npm run test`
- **Accept:** 4 tests pass.
- **Verify:** SV.

### M1-T07: Dialog plugin and window permissions
- **Goal:** Native Open/Save dialogs available. Webview has no network.
- **Files:** `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`
- **Depends:** M1-T06
- **Steps:**
  1. In `src-tauri/`: `cargo add tauri-plugin-dialog` (VERIFY it resolves to 2.x matching Section 5).
  2. In `lib.rs` add `.plugin(tauri_plugin_dialog::init())` before `.run(...)`.
  3. Create `src-tauri/capabilities/default.json`:
````json
     {
       "$schema": "../gen/schemas/desktop-schema.json",
       "identifier": "default",
       "description": "Main window permissions",
       "windows": ["main"],
       "permissions": ["core:default", "dialog:default"]
     }
````
  4. Run `npm run tauri dev` once so `gen/schemas` is created.
- **Commands:** `npm run verify`
- **Accept:** Builds without permission errors.
- **Verify:** SV. **[HUMAN]** Devtools console (right-click > Inspect, dev build) shows no CSP errors.

### M1-TGATE: Milestone 1 gate (see "How tasks work")

---

## MILESTONE 2: Editor with Harper marks

### M2-T01: Harper engine wrapper
- **Goal:** Rust can lint a string with Harper.
- **Files:** `src-tauri/Cargo.toml`, `src-tauri/src/harper/mod.rs`, `src-tauri/src/lib.rs` (add `mod harper;`)
- **Depends:** M1-TGATE tasks done (M1-T07)
- **Steps:**
  1. Add to Cargo.toml by hand: `harper-core = { version = "=3.2.0", features = ["concurrent"] }`.
  2. Run `cargo search harper-core --limit 1`. If a newer version exists, do NOT upgrade. Add an open question.
  3. Read the source in `~/.cargo/registry/src/*/harper-core-3.2.0/src/`. Confirm these exist and write findings in Decisions: `Document::new_plain_english_curated`, `FstDictionary::curated`, `LintGroup::new_curated`, `Dialect` (list its variant names), `linting::Linter::lint`, `remove_overlaps`. **VERIFY BEFORE USE.**
  4. Write `harper/mod.rs` with `pub struct HarperEngine { linter: LintGroup, dialect: Dialect }`, `HarperEngine::new(dialect: Dialect) -> Self`, and `pub fn lint(&mut self, text: &str) -> Vec<Lint>` that builds `Document::new_plain_english_curated(text)`, calls `linter.lint(&doc)`, calls `harper_core::remove_overlaps(&mut lints)`, and returns the lints.
  4b. Build the `LintGroup` ONCE in `new` (it is slow to build). Never build it per call.
  5. Test: `lint("This is an test.")` returns at least 1 lint. Test: `harper_core::core_version()` equals `"3.2.0"`.
  6. Test that `HarperEngine` is `Send`: `fn assert_send<T: Send>() {}` then `assert_send::<HarperEngine>()`. If this fails to compile, switch to a dedicated worker thread with an `mpsc` channel. Record the decision.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml harper`
- **Accept:** 3 tests pass.
- **Verify:** SV.

### M2-T02: Char-to-UTF-16 offset map
- **Goal:** Convert Harper char indexes to JavaScript string offsets.
- **Files:** `src-tauri/src/harper/mapping.rs`
- **Depends:** M2-T01
- **Steps:**
  1. Write:
````rust
     pub struct OffsetMap { utf16_at_char: Vec<usize> } // length = char count + 1
     impl OffsetMap {
         pub fn new(text: &str) -> Self {
             let mut v = Vec::with_capacity(text.len() + 1);
             let mut acc = 0usize;
             for c in text.chars() { v.push(acc); acc += c.len_utf16(); }
             v.push(acc);
             Self { utf16_at_char: v }
         }
         pub fn to_utf16(&self, char_idx: usize) -> usize {
             let last = self.utf16_at_char.len() - 1;
             self.utf16_at_char[char_idx.min(last)]
         }
     }
````
  2. Tests: `"abc"`: 0->0, 3->3. `"😀 teh"` (emoji is 1 char, 2 UTF-16 units): char index 2 -> 3, char index 5 -> 6. `"é"` written as `e` + combining accent U+0301 (2 chars, 2 units): 2 -> 2. Empty string: 0 -> 0. Out-of-range index clamps to the end.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml mapping`
- **Accept:** All tests pass.
- **Verify:** SV.

### M2-T03: RawSuggestion and Lint conversion
- **Goal:** Turn a Harper `Lint` into a `RawSuggestion`.
- **Files:** `src-tauri/src/types.rs`, `src-tauri/src/harper/convert.rs`, `src-tauri/src/lib.rs` (mods)
- **Depends:** M2-T02
- **Steps:**
  1. Define `RawSuggestion` and `RawKind` as in Section 6 (`serde(rename_all = "camelCase")`; `RawKind` serializes lowercase).
  2. List every `LintKind` variant: `grep -n "enum LintKind" -A 60 ~/.cargo/registry/src/*/harper-core-3.2.0/src/linting/lint_kind.rs` (find the file with `grep -rn "enum LintKind"` if the path differs). Paste the list into Decisions. **VERIFY BEFORE USE.**
  3. List every `Suggestion` variant the same way (expected: `ReplaceWith`, `Remove`, `InsertAfter`; confirm).
  4. Kind mapping (write it as one `fn kind_of(lk: &LintKind) -> RawKind` with a final `_ => Grammar` arm):
     - `Spelling` and `Typo` (if present) -> `Spelling`.
     - everything else -> `Grammar`.
  5. Replacement rule per Harper suggestion: `ReplaceWith(chars)` -> that string. `Remove` -> `""`. `InsertAfter(chars)` -> `original + chars`. Unknown variant -> skip that suggestion.
  6. `pub fn lint_to_raw(lint: &Lint, chars: &[char], map: &OffsetMap) -> Option<RawSuggestion>`:
     - `original` = `chars[span.start..span.end]` as String (check bounds; return None if out of range).
     - `start`/`end` = `map.to_utf16(span.start/end)`.
     - `replacement` = first usable suggestion; `alternatives` = next up to 3 distinct others.
     - Return None if there is no usable suggestion or `replacement == original`.
     - `reason` = `lint.message` with backticks and `*` removed, cut at the first `\n`, trimmed, max 140 chars (cut at a char boundary, add `…` if cut).
     - `safe_to_auto_apply` = `false` for now (M2-T05 sets it).
  7. Tests (use real Harper on `"This is an test."` and `"I recieve teh package."`): result is not empty; every `start < end`; `original == the exact slice of the input`; `reason` has no backticks and no newline.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml convert`
- **Accept:** Tests pass. Variant lists recorded.
- **Verify:** SV.

### M2-T04: Protected ranges (URLs, emails, code)
- **Goal:** No marks inside URLs, emails, or code.
- **Files:** `src-tauri/Cargo.toml` (add `regex`), `src-tauri/src/harper/protect.rs`, `src-tauri/tests/fixtures/protect-cases.json`
- **Depends:** M2-T03
- **Steps:**
  1. `cargo add regex` (in `src-tauri/`).
  2. `pub fn protected_ranges(text: &str) -> Vec<(usize, usize)>` returning **UTF-16** ranges. Find, in this order, using these patterns (Rust raw strings):
     - fenced code: `(?s)```.*?```` ; if a fence is opened but never closed, protect from the fence to the end of the text.
     - inline code: ``` `[^`\n]+` ```
     - URL: `(?i)\b(?:https?://|www\.)[^\s<>()\[\]{}]+`
     - email: `\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b`
  3. The regex crate returns byte offsets. Convert byte -> UTF-16 with a helper: count `len_utf16()` over `text[..byte].chars()`. (Fine for 5,000-char inputs.)
  4. `pub fn drop_protected(items: Vec<RawSuggestion>, ranges: &[(usize, usize)]) -> Vec<RawSuggestion>` removes any suggestion whose `[start,end)` overlaps a range.
  5. Tests from `protect-cases.json` (include these cases): `See https://exmaple.com/teh-page for details.` (no marks inside URL); ``Run `npm isntall` now.`` (none inside backticks); `Mail jhon.smtih@exmple.com today` (none inside email); a fenced block with a typo inside and a typo outside (only the outside one is kept); an unclosed fence.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml protect`
- **Accept:** All cases pass.
- **Verify:** SV.

### M2-T05: Safe-to-auto-apply rules
- **Goal:** Decide which fixes Tab may apply.
- **Files:** `src-tauri/src/harper/safety.rs`
- **Depends:** M2-T03
- **Steps:**
  1. Write `fn levenshtein(a: &str, b: &str) -> usize` (standard two-row dynamic programming, on chars) and tests: ("teh","the")=2, ("recieve","receive")=2, ("cat","cat")=0, ("","abc")=3.
  2. Write:
````rust
     pub fn safe_to_auto_apply(
         kind: RawKind, lint_kind_name: &str, original: &str, replacement: &str,
         at_sentence_start: bool, suggestion_count: usize,
     ) -> bool
````
  3. Spelling is safe only if ALL are true: `replacement` is not empty; `levenshtein(lowercase(original), lowercase(replacement)) <= 2`; `original` has no digit; NOT (first char uppercase AND NOT `at_sentence_start`) (likely a name); NOT (length > 1 AND all letters uppercase) (likely an acronym).
  4. Grammar is safe only if `lint_kind_name` is one of `"Capitalization"`, `"Repetition"`, `"Formatting"` (**VERIFY** these names against the variant list from M2-T03; fix the list if they differ) AND `suggestion_count == 1` AND `replacement != original`.
  5. `at_sentence_start` = the nearest non-space char before the span start is missing, or is one of `. ! ? \n`.
  6. Wire it into `lint_to_raw` (pass the lint kind's name via `format!("{:?}", lint.lint_kind)`).
  7. Tests: `teh`->`the` safe. `Kowalski` (mid-sentence, capitalized) not safe. `NASA`->`NASAA` not safe. `recieve`->`receive` safe. `abc123` not safe. Repetition `the the` -> `the` safe.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml safety`
- **Accept:** All tests pass.
- **Verify:** SV.

### M2-T06: `check_text` command, fixtures, and perf test
- **Goal:** One Tauri command that runs the whole Harper pipeline.
- **Files:** `src-tauri/src/state.rs`, `src-tauri/src/error.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/commands/check.rs`, `src-tauri/src/lib.rs`, `src-tauri/tests/harper_cases.rs`, `src-tauri/tests/fixtures/harper-cases.json`
- **Depends:** M2-T04, M2-T05
- **Steps:**
  1. Add `thiserror` (`cargo add thiserror`). `AppError` enum with `Display` messages that contain no user text. Implement `serde::Serialize` for it as a string code.
  2. `AppState { harper: Mutex<HarperEngine> }` registered with `.manage(...)`. Initial dialect: American.
  3. `pub fn run_check(engine: &mut HarperEngine, text: &str) -> Vec<RawSuggestion>`: lint -> convert -> `drop_protected` -> sort by start. Pure function, easy to test.
  4. Command: `#[tauri::command] async fn check_text(state: State<'_, AppState>, text: String, dialect: String) -> Result<CheckResult, AppError>`. Reject `text.chars().count() > 20_000` with code `text_too_long`. Map dialect strings (`american|british|canadian|australian`) to Harper's `Dialect`; unknown -> error. If the dialect changed, rebuild the engine. Run Harper inside `tauri::async_runtime::spawn_blocking`. Measure with `std::time::Instant` and return `elapsedMs`. Register in `generate_handler!`.
  5. Fixture file `harper-cases.json`: array of `{name, text, mustInclude: [{original, replacement}], mustNotMarkInside: [string]}`. Cases: see Section 9.1 (at least 10).
  6. `tests/harper_cases.rs` loads fixtures with `include_str!` and asserts. For cases where Harper's exact output is not known, write `mustInclude` after the first run, review it, then freeze it. Note this in the log.
  7. Perf test (ignored by default):
````rust
     #[test] #[ignore]
     fn perf_300_words() { /* build ~300 words with 5 typos, run run_check 50 times, assert median < 50 ms */ }
````
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml`, then `cargo test --manifest-path src-tauri/Cargo.toml --release -- --ignored perf`
- **Accept:** Fixture tests pass. Perf test passes in release mode. Median time is recorded in Development Status.md.
- **Verify:** SV. If perf fails, record numbers and STOP (open question).

### M2-T07: TypeScript types and IPC wrappers
- **Goal:** Typed access to `check_text`.
- **Files:** `src/lib/types.ts`, `src/lib/ipc.ts`
- **Depends:** M2-T06
- **Steps:**
  1. `types.ts`: copy the TypeScript types from Section 6 exactly.
  2. `ipc.ts`:
````ts
     import { invoke } from "@tauri-apps/api/core";
     import type { CheckResult, Dialect, RawSuggestion } from "./types";

     export async function checkText(text: string, dialect: Dialect): Promise<RawSuggestion[]> {
       const r = await invoke<CheckResult>("check_text", { text, dialect });
       return r.suggestions;
     }
````
- **Commands:** `npm run check`
- **Accept:** Type-check passes.
- **Verify:** SV.

### M2-T08: CodeMirror editor
- **Goal:** A plain-text editor with undo and native spellcheck disabled.
- **Files:** `src/lib/editor/createEditor.ts`, `src/App.svelte`
- **Depends:** M2-T07
- **Steps:**
  1. `createEditor(parent: HTMLElement, onChange: (u: ViewUpdate) => void): EditorView` with extensions: `history()`, `keymap.of([...defaultKeymap, ...historyKeymap])` (from `@codemirror/commands`), `EditorView.lineWrapping`, `placeholder("Start writing…")`, `EditorView.updateListener.of(onChange)`, and:
````ts
     EditorView.contentAttributes.of({ spellcheck: "false", autocorrect: "off", autocapitalize: "off", "aria-label": "Document" })
````
     Native spellcheck MUST be off or it fights Harper's marks.
  2. A theme using CSS variables: `.cm-editor { height: 100%; background: var(--bg); color: var(--fg); }`, `.cm-scroller { font-family: var(--font); font-size: 17px; line-height: 1.7; }`, `.cm-content { max-width: 720px; margin: 0 auto; padding: 32px 20px 120px; caret-color: var(--accent); }`, `.cm-focused { outline: none; }`.
  3. In `App.svelte` use `onMount` from `svelte` to call `createEditor` on the `#editor-host` element (use `bind:this`). Keep the view in a `let view: EditorView | undefined`. Destroy on unmount.
- **Commands:** `npm run check`, `npm run build`
- **Accept:** Build passes. **[HUMAN]** Typing works. Ctrl/Cmd+Z undoes typing. No browser spellcheck underlines.
- **Verify:** SV.

### M2-T09: Mark state, decorations, and the "touched" rule
- **Goal:** Marks live in editor state, shift with edits, and render in 3 styles.
- **Files:** `src/lib/editor/suggestionField.ts`, `src/lib/editor/marks.ts`, `src/lib/editor/touch.ts`, `src/lib/editor/touch.test.ts`, `src/lib/editor/suggestionField.test.ts`
- **Depends:** M2-T08
- **Steps:**
  1. `touch.ts`:
````ts
     const WORD_CHAR = /[\p{L}\p{N}'’_-]/u;
     /** fromA/toA: the changed range in the OLD doc. inserted: text inserted (may be ""). */
     export function isMarkTouched(m: {start:number; end:number}, fromA: number, toA: number, inserted: string): boolean {
       const pureInsert = fromA === toA;
       if (pureInsert && fromA === m.end) return inserted.length > 0 && WORD_CHAR.test(inserted[0]!);              // typing right after the mark
       if (pureInsert && fromA === m.start) return inserted.length > 0 && WORD_CHAR.test(inserted[inserted.length - 1]!); // typing right before the mark
       return fromA <= m.end && toA >= m.start;                                                                    // overlap or abut
     }
````
  2. `suggestionField.ts`:
     - `export const setMarks = StateEffect.define<{ from: number; to: number; group: "harper" | "ai"; marks: Suggestion[] }>();`
     - `export const removeMarks = StateEffect.define<string[]>();` (ids)
     - `export const marksField = StateField.define<Suggestion[]>(...)`:
       - `create` -> `[]`.
       - `update(value, tr)`: (a) if `tr.docChanged`, map every mark: new `start = tr.changes.mapPos(start, 1)`, new `end = tr.changes.mapPos(end, -1)`; drop it if any changed range touches it per `isMarkTouched` (use `tr.changes.iterChangedRanges((fromA,toA,fromB,toB) => ...)` with `tr.newDoc.sliceString(fromB,toB)` as `inserted`), or if `start >= end`. (b) then apply effects: `setMarks` first removes existing marks of that `group` that lie inside `[from,to]`, then adds the new marks; `removeMarks` removes by id. Keep the array sorted by `start`.
     - Export a pure function `mapMarks(marks, changes, newDoc)` that `update` calls, so tests do not need a view.
  3. `marks.ts`: `export const marksDecorations = EditorView.decorations.compute([marksField], state => Decoration.set(state.field(marksField).map(m => Decoration.mark({ class: classFor(m), attributes: { "data-sid": m.id } }).range(m.start, m.end)), true))`. `classFor`: `spelling`->`qw-spell`, `grammar`->`qw-grammar`, `rewrite`->`qw-ai`.
  4. Add `marksField` and `marksDecorations` to the `createEditor` extensions.
  5. `touch.test.ts` cases (mark at 10..14): insert space at 14 -> false; insert `s` at 14 -> true; insert `x` at 10 -> true; insert space at 10 -> false; edit at 0..2 (before) -> false; edit at 20..22 (after) -> false; delete 12..13 -> true; replace 8..10 (abuts) -> true.
  6. `suggestionField.test.ts` (using `EditorState.create` and `state.update`, no DOM): a mark at 10..14 shifts to 13..17 after inserting 3 chars at 0; is removed after typing inside it; survives typing after it with a space; `setMarks` replaces only marks of its own group inside the range.
- **Commands:** `npm run test`
- **Accept:** All tests pass.
- **Verify:** SV.

### M2-T10: Paragraph splitting
- **Goal:** Split text into checkable paragraphs with exact offsets.
- **Files:** `src/lib/engine/paragraphs.ts`, `src/lib/engine/paragraphs.test.ts`
- **Depends:** M1-T06
- **Steps:**
  1. `export interface Para { start: number; end: number; text: string }` (`end` exclusive; offsets in the full text).
  2. `splitParagraphs(text: string): Para[]` rules:
     - A paragraph is a run of text separated from the next by one or more blank lines (regex `/\n[ \t]*\n/`). Empty/whitespace-only runs are skipped.
     - A fenced code block (from a line starting with ``` to the next line starting with ```, or to the end) is ONE paragraph, even if it has blank lines inside.
     - If a paragraph is longer than 5,000 chars, split it into chunks of at most 5,000 chars, cutting after the last `. `, `! `, `? ` or `\n` before the limit, else at the last space, else hard-cut. Chunks keep exact offsets.
  3. Tests: `"a\n\nb"` -> 2 paras with correct offsets; text with 3 blank lines in a row; leading/trailing whitespace; CRLF line endings `"a\r\n\r\nb"` (the regex must also match `\r\n`; adjust it: `/\r?\n[ \t]*\r?\n/`); a fenced block with a blank line inside is one paragraph; a 12,000-char paragraph gives chunks all <= 5,000 whose concatenation with removed separators covers the text; each `text === full.slice(start,end)`.
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M2-T11: SuggestionEngine (Harper path)
- **Goal:** Typing triggers per-paragraph Harper checks, with cache, stale guard, and cancellation of old results.
- **Files:** `src/lib/engine/lru.ts`, `src/lib/engine/SuggestionEngine.ts`, `src/lib/engine/SuggestionEngine.test.ts`, `src/App.svelte`
- **Depends:** M2-T09, M2-T10
- **Steps:**
  1. `lru.ts`: `class Lru<V> { constructor(max: number); get(k): V|undefined; set(k, v): void }` (use `Map` order; get moves to newest). Test it.
  2. Interfaces:
````ts
     export interface EditorHost {
       getText(): string;
       applyMarks(u: { from: number; to: number; group: "harper" | "ai"; marks: Suggestion[] }): void;
     }
     export interface EngineDeps {
       checkText(text: string, dialect: Dialect): Promise<RawSuggestion[]>;
       dialect(): Dialect;
       isDismissed(s: Suggestion): boolean;
       setTimeoutFn?: typeof setTimeout; clearTimeoutFn?: typeof clearTimeout;
     }
````
  3. `class SuggestionEngine { constructor(host, deps); onDocChanged(): void; checkAllNow(): void; dispose(): void }`.
  4. Behaviour of `onDocChanged`: restart a 100 ms trailing timer. When it fires: `splitParagraphs(host.getText())`. For each paragraph compute `h = hashText(text)`. If the cache (`Lru<RawSuggestion[]>`, 500 entries) has `h`, use it. Else call `deps.checkText(text, dialect)` (at most 4 in flight; queue the rest). When a result returns: store it in the cache under `h`. Then re-split the CURRENT text. If a paragraph with the same hash still exists, convert its raw results to `Suggestion[]` (absolute `start = para.start + raw.start`, `source: "harper"`, `kind` from raw, `id` per Section 6, drop dismissed ones) and call `host.applyMarks({from: para.start, to: para.end, group: "harper", marks})`. If the paragraph is gone, do nothing (stale result discarded; it is still cached).
  5. `checkAllNow()` runs the same logic without the timer (used on file open and when the dialect changes; clear the cache when the dialect changes).
  6. IPC errors: catch, do not throw, leave existing marks alone.
  7. Wire in `App.svelte`: create the engine after the view; `onChange` calls `engine.onDocChanged()` when `u.docChanged`. The host's `applyMarks` dispatches `setMarks` with `Transaction.addToHistory.of(false)`.
  8. Tests (fake `checkText` with vitest fake timers): after 100 ms one call per changed paragraph; re-typing in paragraph 2 only re-checks paragraph 2 (call count); unchanged text hits the cache (0 calls); a slow result for text that was edited meanwhile is NOT applied (`applyMarks` not called); results are applied with absolute offsets for paragraph 2; a dismissed suggestion is filtered out.
- **Commands:** `npm run test`
- **Accept:** Tests pass. **[HUMAN]** In `npm run tauri dev`, typing `I recieve teh package` shows red wavy marks under `recieve` and `teh` within ~0.3 s. Typing a space after a marked word does not make the mark flicker.
- **Verify:** SV.

### M2-T12: Bottom bar counts and engine label (static)
- **Goal:** "N quick fixes, Tab to fix all" and the word count. Quiet when clean.
- **Files:** `src/lib/editor/status.ts`, `src/lib/editor/status.test.ts`, `src/lib/ui/BottomBar.svelte`, `src/lib/ui/Icon.svelte`, `src/App.svelte`
- **Depends:** M2-T11
- **Steps:**
  1. `status.ts`: `countFixes(marks): { safe: number; other: number }` where `safe` counts marks with `safeToAutoApply` and `other` counts the rest. Tests.
  2. `Icon.svelte`: prop `name`; draws a 16x16 SVG with `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"` and these shapes: `check` `M5 12l5 5L20 7`; `x` `M6 6l12 12M18 6L6 18`; `chevron` `M6 9l6 6 6-6`; `sliders` `M4 7h9M17 7h3M4 17h3M11 17h9` plus `<circle cx="15" cy="7" r="2"/>` and `<circle cx="9" cy="17" r="2"/>`; `sparkle` `M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z`; `shield` `M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z`; `cloud` `M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 7 9.5 4.25 4.25 0 0 0 7 18z`; `file` `M7 3h7l5 5v13H7V3zM14 3v5h5`.
  3. `BottomBar.svelte` props: `safe`, `other`, `engineLabel`, `offDevice` (boolean), `words`. Left text: if `safe > 0` -> `"{safe} quick fix{es}, Tab to fix all"`; else if `other > 0` -> `"{other} to review"`; else nothing. Right side: engine label with a small dot (green if on device, amber if not) and the word count. Hard-code `engineLabel="Harper · on device"` for now.
  4. App computes counts from `view.state.field(marksField)` after each update (use a `$state` number updated in the update listener).
- **Commands:** `npm run test`, `npm run check`
- **Accept:** Tests pass. **[HUMAN]** Bar shows "2 quick fixes, Tab to fix all" for the sample text and is blank on the left for clean text.
- **Verify:** SV.

### M2-TGATE: Milestone 2 gate

---

## MILESTONE 3: Suggestion engine with Tab-to-fix-all and undo

### M3-T01: Apply one suggestion
- **Goal:** Accepting a single mark is one safe transaction.
- **Files:** `src/lib/editor/applyFix.ts`, `src/lib/editor/applyFix.test.ts`
- **Depends:** M2-TGATE tasks (M2-T12)
- **Steps:**
  1. `export function applyFix(view: EditorView, m: Suggestion, replacement = m.replacement): boolean`. If `view.state.sliceDoc(m.start, m.end) !== m.original`, dispatch `removeMarks([m.id])` and return `false`. Otherwise dispatch `{ changes: { from: m.start, to: m.end, insert: replacement }, effects: removeMarks.of([m.id]), annotations: [Transaction.userEvent.of("input.accept"), isolateHistory.of("full")] }` and return `true`. (`isolateHistory` is exported by `@codemirror/commands`.)
  2. Tests with `EditorState` and a fake view `{ state, dispatch(spec) { state = state.update(spec).state } }`: applies when the text matches; refuses when text changed; one `undo` restores the original.
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M3-T02: Fix-all in one transaction
- **Goal:** Tab fixes every safe mark in a single undo step.
- **Files:** `src/lib/editor/tabFix.ts`, `src/lib/editor/tabFix.test.ts`
- **Depends:** M3-T01
- **Steps:**
  1. `collectSafeFixes(state: EditorState): Suggestion[]`: take marks where `source === "harper"`, `safeToAutoApply === true`, `kind !== "rewrite"`, and `state.sliceDoc(start,end) === original`. Sort by `start`. Drop any mark that overlaps the previous kept one.
  2. ```ts
     export function fixAll(view: EditorView): boolean {
       const fixes = collectSafeFixes(view.state);
       if (fixes.length === 0) return false;
       view.dispatch({
         changes: fixes.map(f => ({ from: f.start, to: f.end, insert: f.replacement })),
         effects: removeMarks.of(fixes.map(f => f.id)),
         annotations: [Transaction.userEvent.of("input.autofix"), isolateHistory.of("full")],
       });
       return true;
     }
     export const tabFixKeymap = Prec.highest(keymap.of([{ key: "Tab", run: fixAll }]));
````
     All changes use OLD-document coordinates in ONE `dispatch`. CodeMirror maps them itself. Never loop over fixes with separate dispatches.
  3. Tests: 3 non-overlapping fixes become one transaction (check `state.update` is called once in the fake view); the final text is correct; ONE `undo` returns the exact original text; no fixes returns `false` and leaves the state unchanged; an overlapping pair applies only the first; a mark whose text changed is skipped; marks with `safeToAutoApply=false` and `rewrite` marks are never applied; cursor position after the fixes stays on the same logical spot (cursor after a fixed word moves by the length difference).
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M3-T03: Wire Tab into the editor
- **Goal:** Tab fixes only while fixes are pending.
- **Files:** `src/lib/editor/createEditor.ts`
- **Depends:** M3-T02
- **Steps:**
  1. Add `tabFixKeymap` to the extensions BEFORE `keymap.of([...defaultKeymap, ...])`. Do NOT add `indentWithTab`. When `fixAll` returns `false`, the keypress falls through (normal Tab behavior, which is the browser default).
  2. Do not touch Shift-Tab.
- **Commands:** `npm run verify`
- **Accept:** Build passes. **[HUMAN]** (a) Type `I recieve teh package.` and press Tab: both words are fixed. (b) Press Ctrl/Cmd+Z once: both words go back. (c) With a clean text, Tab does not change the text.
- **Verify:** SV.

### M3-T04: Suggestion card
- **Goal:** Click a mark to open a card with Accept and Dismiss.
- **Files:** `src/lib/ui/SuggestionCard.svelte`, `src/App.svelte`, `src/app.css`
- **Depends:** M3-T01
- **Steps:**
  1. In `createEditor` add `EditorView.domEventHandlers({ click(e, view) { ... } })`. If `(e.target as HTMLElement).closest("[data-sid]")` exists, read its `data-sid`, find the mark in `marksField`, and call an `onMarkClick(mark, rect)` callback with `view.coordsAtPos(mark.start)`. Otherwise call `onMarkClick(null)`.
  2. `SuggestionCard.svelte` props: `mark`, `x`, `y`, `onAccept`, `onDismiss`, `onClose`. Layout: first line `old` (struck through, colored with the mark color) -> arrow -> `new` (bold). Second line: the `reason`. Buttons: Accept (primary), Dismiss. If `alternatives` is not empty, show up to 3 small buttons to accept an alternative instead (call `applyFix(view, mark, alt)`). Position: `position: absolute` inside `.editor-wrap`, `left/top` from the coords minus the wrap's bounding rect, 8 px below the mark, kept inside the wrap width. Style: `background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 6px 24px rgba(0,0,0,.18); padding: 10px 12px; max-width: 320px; z-index: 10`.
  3. Close on: Escape, click outside the card and the marks, scroll of `.cm-scroller`, any doc change.
  4. Accept calls `applyFix`. Dismiss is wired in M3-T05.
- **Commands:** `npm run verify`
- **Accept:** Build passes. **[HUMAN]** Clicking a red mark shows the card with old/new/reason. Accept applies the fix. Ctrl/Cmd+Z undoes only that fix.
- **Verify:** SV.

### M3-T05: Dismiss
- **Goal:** A dismissed mark stays gone for this session.
- **Files:** `src/lib/editor/dismissed.ts`, `src/lib/editor/dismissed.test.ts`, `src/App.svelte`
- **Depends:** M3-T04
- **Steps:**
  1. `dismissed.ts`: `dismissKey(s) = ${s.kind}|${s.original}|${s.replacement}|${s.reason}`; a module-level `Set<string>`; `dismiss(s)`, `isDismissed(s)`, `clearDismissed()`. Test them.
  2. Card Dismiss: `dismiss(mark)` and dispatch `removeMarks([mark.id])`.
  3. Pass `isDismissed` into `EngineDeps`.
  4. Call `clearDismissed()` when a different document is opened (M8-T01).
- **Commands:** `npm run test`
- **Accept:** Tests pass. **[HUMAN]** Dismiss a mark, type elsewhere: the mark does not come back.
- **Verify:** SV.

### M3-TGATE: Milestone 3 gate

---

## MILESTONE 4: Provider abstraction and cloud API rewrite

### M4-T01: Settings in Rust
- **Goal:** Settings load and save as JSON.
- **Files:** `src-tauri/src/settings.rs`, `src-tauri/src/commands/settings.rs`, `src-tauri/src/lib.rs`
- **Depends:** M3-TGATE tasks (M3-T05)
- **Steps:**
  1. Structs mirror Section 6 `Settings`, with `#[serde(rename_all = "camelCase", default)]` and a `Default` impl with the stated defaults.
  2. `pub fn settings_path(app: &AppHandle) -> Result<PathBuf, AppError>` = `app.path().app_config_dir()?.join("settings.json")`.
  3. `load(path) -> Settings`: missing file or invalid JSON -> defaults (never panic).
  4. `save(path, &Settings)`: create the dir, write to `settings.json.tmp`, then `std::fs::rename` over the real file.
  5. `validate(&mut Settings) -> Result<(), AppError>`: `cloud.baseUrl` must be empty, or start with `https://`, or start with `http://` AND the host be `localhost`, `127.0.0.1`, or `[::1]`. Strip a trailing `/`. `autoCheck.pauseMs` clamped to 300..3000. `idleStopMinutes` clamped to 1..120.
  6. Commands `get_settings` and `save_settings(settings)`. Managed state holds a `Mutex<Settings>` copy.
  7. Tests: defaults; round trip through a temp dir; unknown fields ignored; broken JSON gives defaults; `validate` rejects `http://example.com`, accepts `http://localhost:1234/v1`.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml settings`
- **Accept:** Tests pass.
- **Verify:** SV.

### M4-T02: API key in the OS keychain
- **Goal:** Store, check, and delete the key. Never return it.
- **Files:** `src-tauri/Cargo.toml`, `src-tauri/src/secrets.rs`, `src-tauri/src/commands/secrets.rs`
- **Depends:** M4-T01
- **Steps:**
  1. Add `keyring` with `default-features = false`, `features = ["apple-native", "windows-native", "sync-secret-service"]` (version 3.x; **VERIFY** nothing newer breaks the API).
  2. `secrets.rs` with service `"app.fusewriter.desktop"` and user `"cloud-api-key"`: `set_key(&str)`, `get_key() -> Result<Option<String>>` (map `keyring::Error::NoEntry` to `None`), `delete_key()`, `has_key() -> bool`.
  3. Commands: `set_api_key(key: String)` (reject empty), `has_api_key() -> bool`, `delete_api_key()`. There is NO command that returns the key.
  4. Tests use the keyring mock builder (`keyring::set_default_credential_builder(keyring::mock::default_credential_builder())`): set then has; delete then not has; get on empty gives None.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml secrets`
- **Accept:** Tests pass. `grep -rn "get_key" src-tauri/src/commands` prints nothing.
- **Verify:** SV.

### M4-T03: OpenAI-compatible client (non-streaming first)
- **Goal:** One Rust client for local and cloud, tested against a fake server.
- **Files:** `src-tauri/Cargo.toml`, `src-tauri/src/providers/mod.rs`, `src-tauri/src/providers/openai_compat.rs`, `src-tauri/src/error.rs`
- **Depends:** M4-T02
- **Steps:**
  1. `cargo add reqwest --no-default-features --features json,stream,rustls-tls` (**VERIFY**: if cargo reports an unknown feature, run `cargo info reqwest` and pick the rustls feature name it lists; record it). Also `cargo add tokio --features rt,macros,time,sync,process` and `cargo add tokio-util futures-util`, and `cargo add --dev wiremock`.
  2. Add the traits from Section 7 to `providers/mod.rs`.
  3. `OpenAiCompatProvider { client: reqwest::Client, base_url: String, api_key: Option<String>, model: String, kind: Kind, temperature: Option<f32>, local_extras: bool }`. Build the client with `connect_timeout(10s)` and no total timeout (streams can be long; the idle timeout is in M4-T05).
  4. `fn endpoint(&self) -> String` = `format!("{}/chat/completions", base_url.trim_end_matches('/'))`.
  5. `fn build_body(&self, prompt: &str, max_tokens: u32, stream: bool) -> serde_json::Value` per Section 7.
  6. `async fn complete_once(&self, prompt, max_tokens) -> Result<String, AppError>`: POST, check status, read `choices[0].message.content`.
  7. `fn map_status(status: u16) -> AppErrorCode`: 401/403 -> `unauthorized`; 404 -> `not_found`; 429 -> `rate_limited`; 5xx -> `server`; connection error -> `network`; timeout -> `timeout`. Error messages must never include the request body, the prompt, or the API key.
  8. Tests with `wiremock`: success returns the content; the `Authorization` header is sent when a key is set and absent when not; each status maps correctly; `build_body` for local has `chat_template_kwargs`, for cloud does not; cloud `temperature` is absent when `None`.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml openai`
- **Accept:** Tests pass.
- **Verify:** SV.

### M4-T04: SSE parser
- **Goal:** Turn a byte stream into data events.
- **Files:** `src-tauri/src/providers/sse.rs`
- **Depends:** M4-T03
- **Steps:**
  1. `pub enum SseEvent { Data(String), Done }`. `pub struct SseParser { buf: Vec<u8>, data: Vec<String> }`.
  2. `pub fn push(&mut self, chunk: &[u8]) -> Vec<SseEvent>`: append bytes; split on `\n`; for each complete line: strip a trailing `\r`; empty line -> if any `data:` lines were collected, join them with `\n` and emit (`Done` if the joined text is exactly `[DONE]`, else `Data`); lines starting with `:` are ignored; `data:` lines add the text after `data:` (strip ONE leading space). Decode a line to a `String` with `String::from_utf8_lossy` only after the full line is available (so multi-byte characters split across chunks are safe).
  3. `pub fn delta_text(json: &str) -> Option<String>`: parse JSON, return `choices[0].delta.content` if it is a non-empty string, else `None`.
  4. Tests: one event in one chunk; one event split across 3 chunks; two events in one chunk; CRLF endings; comment lines; `[DONE]`; a 3-byte character split across two chunks; `delta_text` with content, with empty content, with only `reasoning_content`, and with invalid JSON (returns `None`).
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml sse`
- **Accept:** Tests pass.
- **Verify:** SV.

### M4-T05: Streaming command with cancel and privacy checks
- **Goal:** `ai_complete` streams tokens to the UI and can be cancelled. Rust enforces cloud privacy rules.
- **Files:** `src-tauri/src/providers/openai_compat.rs`, `src-tauri/src/commands/ai.rs`, `src-tauri/src/state.rs`, `src-tauri/src/types.rs`
- **Depends:** M4-T04
- **Steps:**
  1. Implement `chat_stream` (trait method): POST with `stream: true`; read `response.bytes_stream()`; feed `SseParser`; for each `Data`, call `delta_text` and `on_token`; stop on `Done` or end of stream. Wrap each `next()` in `tokio::time::timeout(30s)` (idle timeout, code `timeout`). Use `tokio::select!` with `cancel.cancelled()` (code `cancelled`). Return the full text. If it is empty after trimming, return error `empty`.
  2. `AiEvent` enum in `types.rs` per Section 6 (`#[serde(tag = "type", rename_all = "camelCase")]`).
  3. State: `cancels: Mutex<HashMap<String, CancellationToken>>`.
  4. Command: `ai_complete(app, state, request_id: String, request: AiRequest, on_event: Channel<AiEvent>) -> Result<(), AppError>`. Steps inside: (a) load settings; (b) if `request.engine` does not equal `settings.engine` -> `no_engine`; (c) for cloud: require non-empty `baseUrl` and `model` (`bad_url`), require `has_key` unless the host is loopback (`no_api_key`), require the host in `consentHosts` (`consent_required`), and if `request.origin == "auto"` require `autoCheck.allowCloud` (`auto_cloud_blocked`); (d) register a token under `request_id`; (e) run `chat_stream`, forwarding `AiEvent::Token`; (f) send `Done {text}` or `Error {code, message}`; (g) remove the token. For `engine == "local"` return `local_not_installed` for now (M6 replaces this).
  5. Command `ai_cancel(request_id)` cancels the token if present.
  6. Tests (wiremock, cloud kind pointing at the mock): tokens arrive in order; cancel stops the stream; `consent_required`, `no_api_key`, and `auto_cloud_blocked` are returned in the right cases (put the checks in a pure function `check_cloud_policy(settings, has_key, origin) -> Result<(), AppError>` and unit-test it).
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml ai`
- **Accept:** Tests pass.
- **Verify:** SV.

### M4-T06: Test-connection command
- **Goal:** The settings dialog can check that URL, key, and model work.
- **Files:** `src-tauri/src/commands/ai.rs`
- **Depends:** M4-T05
- **Steps:**
  1. `ai_test_connection(base_url, model, api_key: Option<String>)`: uses `complete_once` with the prompt `Reply with the single word: ok` and `max_tokens` 8. Use the key from the argument if given, else the stored key. Return `Ok(())` or an `AppError` code. It does NOT require consent (the human is clicking a Test button).
  2. Never log or return the key.
- **Commands:** `npm run verify`
- **Accept:** Compiles; test against wiremock returns Ok, 401 gives `unauthorized`.
- **Verify:** SV.

### M4-T07: TypeScript provider layer
- **Goal:** One TS interface for local and cloud, with cancel via `AbortSignal`.
- **Files:** `src/lib/providers/types.ts`, `src/lib/providers/cloud.ts`, `src/lib/providers/local.ts`, `src/lib/providers/registry.ts`, `src/lib/ipc.ts`, `src/lib/providers/registry.test.ts`
- **Depends:** M4-T05
- **Steps:**
  1. Copy the interfaces and `AiError` from Section 7 into `providers/types.ts`.
  2. `ipc.ts` adds:
```ts
     import { invoke, Channel } from "@tauri-apps/api/core";
     export async function aiComplete(req: AiRequest, onToken: ((t: string) => void) | undefined, signal: AbortSignal): Promise<string> {
       const requestId = crypto.randomUUID();
       const channel = new Channel<AiEvent>();
       return new Promise<string>((resolve, reject) => {
         const onAbort = () => { void invoke("ai_cancel", { requestId }); };
         if (signal.aborted) { reject(new AiError("cancelled", "cancelled")); return; }
         signal.addEventListener("abort", onAbort, { once: true });
         channel.onmessage = (ev) => {
           if (ev.type === "token") onToken?.(ev.text);
           else if (ev.type === "done") { signal.removeEventListener("abort", onAbort); resolve(ev.text); }
           else { signal.removeEventListener("abort", onAbort); reject(new AiError(ev.code, ev.message)); }
         };
         invoke("ai_complete", { requestId, request: req, onEvent: channel }).catch(e => reject(new AiError("network", String(e))));
       });
     }
```
  3. `cloud.ts` and `local.ts` implement `AiProvider` by calling `aiComplete({ ...req, engine: "cloud" | "local" }, ...)`. `sendsTextOffDevice` is `true` for cloud and `false` for local. `label`: the cloud host (parse with `new URL`) or the local model label.
  4. `registry.ts`: `getAiProvider(settings): AiProvider | null` (null for `"off"`, and for cloud with an empty `baseUrl`).
  5. Tests: registry returns null/local/cloud correctly and the right `sendsTextOffDevice`.
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M4-T08: Settings store and dialog
- **Goal:** The user can pick an engine and enter cloud details and the key.
- **Files:** `src/lib/settings/defaults.ts`, `src/lib/settings/store.svelte.ts`, `src/lib/ui/SettingsDialog.svelte`, `src/lib/ui/TopBar.svelte`, `src/App.svelte`
- **Depends:** M4-T07, M4-T06
- **Steps:**
  1. `defaults.ts` exports `DEFAULT_SETTINGS` with the Section 6 defaults.
  2. `store.svelte.ts`: `export const settings = $state<Settings>(structuredClone(DEFAULT_SETTINGS))`; `loadSettings()` (invoke `get_settings`, `Object.assign`), `saveSettings()` (invoke `save_settings` with `$state.snapshot(settings)`).
  3. `TopBar.svelte`: document name (left), mode picker placeholder, a Tools placeholder, and a settings button (`sliders` icon). Props: `name`, `onSettings`.
  4. `SettingsDialog.svelte`: a modal `<dialog>` (use `showModal()`). Sections: Engine (radio: Off / Local / Cloud). Cloud: Base URL, Model, API key (type="password", write-only; after save show "Key saved" + a Remove key button; never show the key), Test connection button (calls `ai_test_connection`, shows a short result), and a note "Your text is sent to this server when you use AI features." Automatic checks: toggle "Check sentences automatically" and, only when engine is Cloud, a toggle "Allow automatic cloud checks (sends text as you type)". Save button calls `set_api_key` (only if the field is not empty) then `saveSettings()`.
  5. Local section is a placeholder ("Set up in a later step") until M6-T07.
- **Commands:** `npm run verify`
- **Accept:** Build passes. **[HUMAN]** Settings open, save, and survive an app restart. After restart the key field is empty but shows "Key saved".
- **Verify:** SV. Also confirm `grep -rn "api_key\|apiKey" src/lib/settings` shows no field that stores the key in `Settings`.

### M4-T09: Engine badge and privacy indicator
- **Goal:** The UI always shows which engine is active and whether text leaves the device.
- **Files:** `src/lib/ui/EngineBadge.svelte`, `src/lib/ui/BottomBar.svelte`, `src/lib/engine/gating.ts`, `src/lib/engine/gating.test.ts`
- **Depends:** M4-T08
- **Steps:**
  1. `gating.ts` (pure):
```ts
     export function engineLabel(s: Settings): { text: string; offDevice: boolean } {
       // off   -> { "Harper · on device", false }
       // local -> { `Local · ${model label} · on device`, false }
       // cloud -> { `Cloud · ${host} · text leaves device`, true }   (when baseUrl is empty: "Cloud · not set up", false)
     }
     export function autoAiAllowed(s: Settings): boolean {
       return s.engine !== "off" && s.autoCheck.enabled && (s.engine === "local" || s.autoCheck.allowCloud);
     }
     export function autoCloudActive(s: Settings): boolean { return s.engine === "cloud" && autoAiAllowed(s); }
```
  2. `EngineBadge.svelte` shows a dot (green `--ok` / amber `--warn`) and the label. If `autoCloudActive` it adds " · auto-check ON" and the amber dot pulses (CSS animation `opacity` 1 -> .4, 1.2 s). While a cloud request is running, show "sending…".
  3. Use `EngineBadge` in the bottom bar (right side, before the word count).
  4. Tests for `engineLabel` (3 engines, empty base URL) and `autoAiAllowed` (all 8 combinations of engine off/local/cloud x enabled x allowCloud that matter: cloud + enabled + allowCloud false -> false; cloud + allowCloud true -> true; local ignores allowCloud; off always false).
- **Commands:** `npm run test`
- **Accept:** Tests pass. **[HUMAN]** Switching engines changes the label and dot color at once.
- **Verify:** SV.

### M4-T10: Cloud consent dialog
- **Goal:** First use of a cloud host asks for permission.
- **Files:** `src/lib/ui/ConsentDialog.svelte`, `src/lib/providers/cloud.ts`, `src/App.svelte`
- **Depends:** M4-T09
- **Steps:**
  1. `ConsentDialog` text: "Your selected text will be sent to {host}. It will leave this device. Allow?" Buttons: Allow, Cancel.
  2. Before the first cloud request to a host that is not in `settings.cloud.consentHosts`, show it. On Allow, push the host into `consentHosts` and `saveSettings()`. On Cancel, abort the action.
  3. If Rust still answers `consent_required`, show the same dialog (defense in depth).
- **Commands:** `npm run verify`
- **Accept:** Build passes. **[HUMAN]** With a fake Cloud config, the dialog appears once per host.
- **Verify:** SV.

### M4-T11: Minimal rewrite (fluent) into a preview panel
- **Goal:** First end-to-end cloud rewrite: select text -> stream -> replace.
- **Files:** `src/lib/ai/prompts.ts` (minimal), `src/lib/ai/rewrite.ts` (minimal), `src/lib/ui/TopBar.svelte`, `src/App.svelte`
- **Depends:** M4-T10
- **Steps:**
  1. `prompts.ts` exports `buildPrompt({mode:"fluent", text}) ` using the Section 10 wrapper and the fluent task (the full set comes in M5-T04).
  2. `rewrite.ts`: `rewriteText(provider, text, signal, onToken): Promise<string>` builds the prompt, calls `provider.complete({origin:"user", task:"rewrite", prompt, maxTokens: min(2048, ceil(text.length/2)+128)}, {onToken}, signal)`.
  3. Top bar "Rewrite" button (`sparkle` icon): disabled if no AI provider. Uses the selection, or if empty the paragraph at the cursor. Opens a panel above the bottom bar showing the streamed text, with Replace, Cancel buttons. Cancel aborts via `AbortController`. Replace dispatches one transaction.
  4. Errors show as a one-line message in the panel using a code-to-text map in `src/lib/ai/errors.ts` (e.g. `unauthorized` -> "The server rejected the API key.").
- **Commands:** `npm run verify`
- **Accept:** Build passes. **[HUMAN]** With a real cloud key, selecting a sentence and clicking Rewrite streams text; Replace applies it; Ctrl/Cmd+Z undoes it in one step.
- **Verify:** SV.

### M4-TGATE: Milestone 4 gate

---

## MILESTONE 5: Diff view and modes

### M5-T01: Word diff
- **Goal:** Diff two strings word by word.
- **Files:** `src/lib/diff/wordDiff.ts`, `src/lib/diff/wordDiff.test.ts`
- **Depends:** M4-TGATE tasks (M4-T11)
- **Steps:**
  1. `tokenize(s: string): string[]` using `s.match(/\s+|[\p{L}\p{N}_'’-]+|[^\s\p{L}\p{N}_]/gu) ?? []`. Joining the tokens must give back `s` exactly.
  2. `export type Op = { type: "equal" | "delete" | "insert"; text: string }`.
  3. `wordDiff(a: string, b: string): Op[]`: tokenize both; compute the longest common subsequence with a dynamic-programming table (`Uint32Array`, size `(n+1)*(m+1)`); walk back to build ops; merge neighbouring ops of the same type. If `n*m > 4_000_000`, fall back to a single `delete` of all of `a` and a single `insert` of all of `b`.
  4. Tests: identical strings -> one `equal`; one word replaced (`"the cat sat"` vs `"the dog sat"`); insertion at the end; deletion at the start; empty vs text; both empty; unicode (`"café naïve"`); for 20 random pairs, concatenating `equal`+`delete` text equals `a` and `equal`+`insert` text equals `b`; the fallback path.
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M5-T02: Hunks (accept/reject units)
- **Goal:** Group diff ops into changes the user can accept or reject one by one.
- **Files:** `src/lib/diff/hunks.ts`, `src/lib/diff/hunks.test.ts`
- **Depends:** M5-T01
- **Steps:**
  1. `export type Segment = { kind: "equal"; text: string } | { kind: "hunk"; id: number; del: string; ins: string }`.
  2. `toSegments(ops: Op[]): Segment[]`: a hunk is a maximal run of `delete`/`insert` ops. Two hunks separated only by an `equal` that is whitespace-only are merged into one hunk (the whitespace goes into both `del` and `ins`). Hunk ids are 0,1,2... in order.
  3. `applyHunks(segments: Segment[], accepted: Set<number>): string`: `equal` -> text; hunk -> `ins` if its id is in `accepted`, else `del`.
  4. Tests: accept all equals the new text; reject all equals the original text; accepting only hunk 1 of 3; whitespace merge; no changes -> no hunks.
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M5-T03: InlineDiff and DiffView components
- **Goal:** Show the diff and let the user choose changes.
- **Files:** `src/lib/ui/InlineDiff.svelte`, `src/lib/ui/DiffView.svelte`, `src/lib/ui/SuggestionCard.svelte`, `src/app.css`
- **Depends:** M5-T02
- **Steps:**
  1. `InlineDiff` props: `segments`, `accepted` (a `Set`), `onToggle(id)`, `interactive` boolean. Renders `equal` as plain text; each hunk as `<span class="del">…</span><span class="ins">…</span>`. If not accepted, deletions are shown dimmed and insertions hidden; if accepted, deletions struck through and insertions highlighted. When `interactive`, clicking a hunk toggles it. Add CSS `.del { text-decoration: line-through; color: var(--mark-spell); }` and `.ins { background: color-mix(in srgb, var(--ok) 22%, transparent); }`.
  2. `DiffView` props: `original`, `proposed`, `onApply(finalText)`, `onCancel`. Shows `InlineDiff` interactive (all hunks accepted by default), buttons Accept all, Reject all, Apply, Cancel. Apply calls `onApply(applyHunks(segments, accepted))`.
  3. Use `InlineDiff` (non-interactive) in `SuggestionCard` for `kind === "rewrite"` marks (shown when `original.length > 24`).
  4. Replace the M4-T11 preview panel: after streaming finishes, show `DiffView`. Apply dispatches ONE transaction replacing the original range.
- **Commands:** `npm run verify`
- **Accept:** Build passes. **[HUMAN]** After a rewrite the diff shows. Rejecting one change and applying gives the mixed result. One Ctrl/Cmd+Z undoes the whole apply.
- **Verify:** SV.

### M5-T04: Modes and prompts
- **Goal:** All prompts from Section 10 in code.
- **Files:** `src/lib/ai/modes.ts`, `src/lib/ai/prompts.ts`, `src/lib/ai/prompts.test.ts`
- **Depends:** M5-T01
- **Steps:**
  1. `modes.ts`: `BUILT_IN_PRESETS: RewritePreset[]` for `fluent, formal, concise, expand, simplify` (`builtIn: true`, empty `instruction`, empty `frozenWords`), and `LENGTH_RANGE: Record<modeId | "custom" | "check", [number, number]>` from Section 10.4.
  2. `prompts.ts`: `buildPrompt({ mode, text, frozenWords?, customInstruction?, retry? }): string` following Section 10 exactly (common rules, TASK line, one example, wrapper, `<<<`/`>>>` delimiters). `buildSummarizePrompt(text)` and `buildCheckPrompt(text)` likewise. When `frozenWords` is empty, rule 5 is omitted and the rules are renumbered. When `retry` is true, append the retry sentence.
  3. Tests (string checks): each mode prompt contains its TASK sentence and ends with `OUTPUT:`; the text appears between `<<<` and `>>>`; a frozen word list appears quoted; retry adds the retry sentence; a custom prompt contains the user instruction AND the common rules.
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M5-T05: Protection with placeholders
- **Goal:** URLs, emails, code, and frozen words survive AI rewriting.
- **Files:** `src/lib/ai/protect.ts`, `src/lib/ai/protect.test.ts`
- **Depends:** M5-T04
- **Steps:**
  1. `protectText(text: string, frozenWords: string[]): { text: string; map: Map<string,string> }`: find fenced code, inline code, URLs, emails (same patterns as M2-T04, in JS), then each frozen word (whole word, case-sensitive). Replace each match, left to right, with `[[P1]]`, `[[P2]]`, ... Remember the original in `map`. Longer matches win over overlapping shorter ones. Max 30 placeholders; if more, skip protecting the remainder.
  2. `restoreText(text: string, map): string` replaces every `[[Pn]]` with its original.
  3. `placeholdersIntact(output: string, map): boolean`: every key appears exactly once AND the keys appear in numeric order.
  4. Tests: round trip; URL + code + email + frozen word in one text; `placeholdersIntact` false when one is missing, duplicated, reordered, or altered (`[P1]`).
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M5-T06: Output validation
- **Goal:** Reject or clean bad model output.
- **Files:** `src/lib/ai/validate.ts`, `src/lib/ai/validate.test.ts`
- **Depends:** M5-T05
- **Steps:**
  1. `cleanOutput(raw: string, input: string): string`: trim; remove a surrounding code fence; remove a leading preface line matching `/^(sure|certainly|of course|here(?:'s| is| are)|rewritten|output|result)[^\n]*:\s*\n/i`; remove trailing `>>>` or `<<<`; remove a leading `OUTPUT:`; remove surrounding quote marks only if `input` does not start with a quote mark; trim again.
  2. `validate(args: { cleaned: string; input: string; mode: string; map: Map<string,string>; frozenWords: string[] }): { ok: true } | { ok: false; reason: "empty" | "commentary" | "placeholders" | "frozen" | "length" | "unchanged" }`:
     - `empty`: nothing left.
     - `commentary`: contains a line starting with `Note:`, `Explanation:`, `I changed`, `This rewrite`, `Here is`, or `Here's`.
     - `placeholders`: `placeholdersIntact` false.
     - `frozen`: any frozen word appears fewer times in the output than in the input (compare after restoring placeholders).
     - `length`: output length / input length is outside `LENGTH_RANGE[mode]`.
     - `unchanged`: output equals input (not an error for "check" mode; the caller treats it as "no suggestion").
  3. Tests: 12+ cases: clean outputs pass; each failure reason triggers; "Sure! Here's the rewritten text:\n..." is cleaned and passes; a fenced output is cleaned.
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M5-T07: Mode picker and custom presets
- **Goal:** Pick a mode; add, edit, and delete custom presets.
- **Files:** `src/lib/ui/ModePicker.svelte`, `src/lib/ui/PresetEditor.svelte`, `src/lib/ui/TopBar.svelte`, `src/lib/ui/SettingsDialog.svelte`
- **Depends:** M5-T04, M4-T08
- **Steps:**
  1. `ModePicker`: a small dropdown in the top bar listing built-ins and custom presets; selecting sets `settings.rewrite.activePresetId` and saves.
  2. `PresetEditor` (inside the settings dialog, section "Rewrite presets"): list custom presets; Add (name, instruction textarea, frozen words as one-per-line textarea); Edit; Delete. New ids: `custom-${crypto.randomUUID()}`. Validate: name 1-40 chars, instruction 1-500 chars, frozen words max 50 items, each max 60 chars. Built-in presets cannot be edited.
  3. Persist with `saveSettings()`.
- **Commands:** `npm run verify`
- **Accept:** Build passes. **[HUMAN]** A custom preset can be created, selected, edited, deleted and survives restart.
- **Verify:** SV.

### M5-T08: Wire the full rewrite flow
- **Goal:** Rewrite uses protection, validation, one retry, and the diff view.
- **Files:** `src/lib/ai/rewrite.ts`, `src/App.svelte`
- **Depends:** M5-T03, M5-T06, M5-T07
- **Steps:**
  1. `rewriteWithMode(provider, preset, text, signal, onToken)`: (1) `protectText(text, preset.frozenWords)`; (2) build the prompt with the protected text; (3) stream; (4) `cleanOutput` + `validate`; (5) if invalid, retry ONCE with `retry: true`; (6) if still invalid, throw `AiError("empty", "Couldn't produce a safe rewrite. Your text is unchanged.")`; (7) `restoreText`; (8) return the final string.
  2. While streaming, show the raw tokens in a small live preview (update at most 10 times per second using `requestAnimationFrame`); when done, replace it with the DiffView built from the restored result.
  3. If the result equals the input, show "No changes suggested." instead of the DiffView.
  4. Max selection for a rewrite: 6,000 chars. Above that show "Select a shorter passage."
- **Commands:** `npm run verify`
- **Accept:** Build passes. **[HUMAN]** All 5 modes work with a cloud key. A URL and a backtick-code word in the input survive unchanged. A frozen word survives.
- **Verify:** SV.

### M5-T09: Text stats and Tools menu
- **Goal:** Word count, reading time, readability, and summarize.
- **Files:** `src/lib/text/stats.ts`, `src/lib/text/stats.test.ts`, `src/lib/ui/ToolsMenu.svelte`, `src/lib/ui/TopBar.svelte`, `src/lib/ui/BottomBar.svelte`
- **Depends:** M5-T08
- **Steps:**
  1. `stats.ts`:
     - `wordCount(text)`: count matches of `/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu`.
     - `readingTimeMinutes(words)`: `words / 238`, rounded up to the nearest whole minute (minimum 1 when words > 0). (238 wpm is an average silent-reading speed. **VERIFY BEFORE USE**; if you cannot confirm, keep 238 and note it.)
     - `countSyllables(word)`: lowercase; count groups of vowels `[aeiouy]+`; subtract 1 if the word ends in a silent `e` (not `le`) and has more than 1 group; minimum 1.
     - `readability(text)`: sentences = matches of `/[^.!?]+[.!?]+/g` (at least 1); `fleschReadingEase = 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)`; `fleschKincaidGrade = 0.39*(words/sentences) + 11.8*(syllables/words) - 15.59`. Return `null` if words < 10. Round to 1 decimal.
  2. Tests: `wordCount("Don't stop-gap me")` = 3; `wordCount("")` = 0; syllables for `cat`=1, `table`=2, `the`=1, `beautiful`=3 (allow +-1 for the last; document if it differs); readability of a known simple text is within expected bands (Reading Ease > 60 for short plain sentences); `null` for short text.
  3. Bottom bar word count uses `wordCount`. Tools menu (button with `chevron`): "Reading time", "Readability" (shows ease + grade + a plain label like "Easy to read"), "Summarize". Show results in a small popover. When there is a selection, stats use the selection; otherwise the whole text.
  4. Summarize: needs an AI provider (disabled with a tooltip "Needs an AI engine" otherwise). Uses `buildSummarizePrompt`, protection and validation (mode `"summarize"`; length range [0.05, 0.8]); shows the summary in a popover with a Copy button. It never edits the document.
- **Commands:** `npm run verify`
- **Accept:** Tests pass. **[HUMAN]** The numbers update; Summarize works with a cloud key.
- **Verify:** SV.

### M5-TGATE: Milestone 5 gate

---

## MILESTONE 6: Local model download and sidecar

### M6-T01: Build the runtime manifest from real data
- **Goal:** Real URLs and SHA-256 values for the llama.cpp runtime and both models.
- **Files:** `src-tauri/resources/runtime-manifest.json`
- **Depends:** M5-TGATE tasks (M5-T09)
- **Steps:**
  1. Network check: `curl -sI https://api.github.com | head -1` and `curl -sI https://huggingface.co | head -1`. If either fails, record an open question and STOP (the human must supply the values).
  2. Latest llama.cpp release: `curl -s https://api.github.com/repos/ggml-org/llama.cpp/releases/latest`. Read `tag_name`. List the asset names. **VERIFY BEFORE USE:** expect names like `llama-<tag>-bin-win-cpu-x64.zip`, `llama-<tag>-bin-macos-arm64.tar.gz`, `llama-<tag>-bin-macos-x64.tar.gz`, `llama-<tag>-bin-ubuntu-x64.tar.gz`. Record the real names. If an asset is missing, leave that platform out of the manifest and log it.
  3. Download each needed asset, compute `sha256sum` (macOS: `shasum -a 256`; Windows PowerShell: `Get-FileHash -Algorithm SHA256`), record `sizeBytes`.
  4. Unpack ONE asset in a temp folder and confirm it contains a `llama-server` (or `llama-server.exe`) executable. The latest llama.cpp also ships a newer `llama` command; FuseWriter uses `llama-server`. If `llama-server` is missing from the archive, STOP and write an open question. **VERIFY BEFORE USE.**
  5. Run `./llama-server --help` and write into Decisions whether these flags exist: `-m`, `--host`, `--port`, `--api-key`, `-c`, `-np`, `--no-webui`, `--jinja`, `--log-disable`.
  6. Models: `curl -s "https://huggingface.co/api/models/ggml-org/gemma-4-E2B-it-GGUF?blobs=true"` and the same for `...E4B-it-GGUF`. In the `siblings` list, pick the 4-bit file (observed: `Q4_0`; do NOT pick files whose name contains `mmproj` or `mtp`). Record `rfilename`, size, and `lfs.sha256`. Build the URL `https://huggingface.co/<repo>/resolve/main/<rfilename>`.
  7. Write `runtime-manifest.json` with the schema in Section 6 using these real values. Both model entries must have `sha256` of 64 hex characters.
  8. Add open questions: the human must confirm the chosen release tag, the model files, and the macOS minimum-version issue (see Section 13).
- **Commands:** as listed.
- **Accept:** The JSON parses (`node -e "JSON.parse(require('fs').readFileSync('src-tauri/resources/runtime-manifest.json','utf8'))"`). All `sha256` are 64 hex characters. All `url` values start with `https://`.
- **Verify:** The `node -e` command exits 0.

### M6-T02: Manifest parsing, paths, and download
- **Goal:** Download a file with progress, SHA-256 check, and cancel.
- **Files:** `src-tauri/Cargo.toml` (add `sha2`, `hex`), `src-tauri/src/local/manifest.rs`, `src-tauri/src/local/paths.rs`, `src-tauri/src/local/download.rs`
- **Depends:** M6-T01
- **Steps:**
  1. `manifest.rs`: serde structs for the manifest; `Manifest::embedded() -> Result<Manifest>` using `include_str!("../../resources/runtime-manifest.json")`; `current_platform_key() -> Option<&'static str>` using `cfg!(target_os)` and `cfg!(target_arch)` -> `windows-x86_64`, `macos-aarch64`, `macos-x86_64`, `linux-x86_64`. A function that rejects any asset or model URL that is not `https://` or whose host is not `github.com` or `huggingface.co`.
  2. `paths.rs`: `runtime_dir(app, tag)` = `app_data_dir/runtime/<tag>`, `models_dir(app)` = `app_data_dir/models`, `model_path(app, file)`.
  3. `download.rs`: `pub async fn download(url, dest, expected_sha256, expected_size, cancel, on_progress)`: stream with reqwest to `dest + ".part"`, update a `Sha256` hasher per chunk, call `on_progress(downloaded, total)` at most every 200 ms; after the stream, compare the hex digest (case-insensitive) with `expected_sha256`; on mismatch delete the `.part` file and return error `checksum_mismatch`; on success rename to `dest`. On cancel delete the `.part` file and return `cancelled`. If `dest` already exists with the right hash, return Ok at once.
  4. Tests with wiremock: good file passes; wrong hash gives `checksum_mismatch` and leaves no file; cancel mid-stream leaves no `.part`; manifest URL host check rejects `https://evil.example/x`; the embedded manifest parses.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml local`
- **Accept:** Tests pass.
- **Verify:** SV.

### M6-T03: Safe archive extraction
- **Goal:** Unpack the runtime without path-traversal bugs.
- **Files:** `src-tauri/Cargo.toml` (add `zip`, `flate2`, `tar`), `src-tauri/src/local/extract.rs`
- **Depends:** M6-T02
- **Steps:**
  1. `pub fn extract(archive: &Path, kind: ArchiveKind, dest: &Path) -> Result<(), AppError>` for `zip` and `tar.gz`.
  2. For every entry, compute `dest.join(entry_path)`. REJECT the archive (error `bad_archive`) if the entry path is absolute, contains `..`, or after joining does not start with `dest`. Do not follow symlinks (skip them).
  3. On unix set mode `0o755` on any file whose name starts with `llama-` or ends with `.so`/`.dylib` (extracted zips may lose the executable bit).
  4. `pub fn find_server(dir: &Path) -> Option<PathBuf>`: walk the directory and return the first file named `llama-server` or `llama-server.exe`.
  5. Tests: build small zip and tar.gz in a temp dir (in the test code); extraction works; an entry named `../evil.txt` is rejected and nothing is written outside `dest`; `find_server` finds a nested file.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml extract`
- **Accept:** Tests pass, including the traversal test.
- **Verify:** SV.

### M6-T04: Start and stop llama-server
- **Goal:** Spawn the local server safely and wait until it is ready.
- **Files:** `src-tauri/Cargo.toml` (add `uuid` with `v4`), `src-tauri/src/local/runtime.rs`, `src-tauri/src/state.rs`
- **Depends:** M6-T03
- **Steps:**
  1. `pub fn build_args(model: &Path, port: u16, api_key: &str) -> Vec<String>`: `-m <model> --host 127.0.0.1 --port <port> --api-key <key> -c 4096 -np 1`, plus `--no-webui` and `--jinja` ONLY if M6-T01 step 5 confirmed they exist. Unit-test it: contains `--host 127.0.0.1`; never `0.0.0.0`.
  2. `fn free_port() -> u16`: bind `127.0.0.1:0` with `std::net::TcpListener`, read the port, drop the listener.
  3. `pub struct LocalRuntime { child: tokio::process::Child, pub port: u16, pub api_key: String, pub last_used: Instant, pub model_id: String }`.
  4. `pub async fn start(server_exe, model_path, model_id) -> Result<LocalRuntime, AppError>`: `api_key = uuid::Uuid::new_v4().simple().to_string()`; use `tokio::process::Command` with `.kill_on_drop(true)`, `.stdin(Stdio::null())`, `.stdout(Stdio::null())`, `.stderr(Stdio::null())` (so the server's logs, which may contain text, are never kept). On Windows add `creation_flags(0x08000000)` (no console window) via `std::os::windows::process::CommandExt` behind `#[cfg(windows)]`. Then poll `GET http://127.0.0.1:<port>/health` every 500 ms for up to 120 s until HTTP 200 (503 means still loading). If the child exits early or the timeout passes, return `local_start_failed`. **VERIFY BEFORE USE** that `/health` needs no key; if it does, send the key.
  5. `AppState` gets `local: tokio::sync::Mutex<Option<LocalRuntime>>`.
  6. `pub async fn stop(state)`: take the runtime, `child.kill().await`, ignore errors.
  7. Idle stop: when starting, spawn a task that every 30 s checks `last_used` and stops the runtime when idle longer than `settings.local.idleStopMinutes`.
  8. In `lib.rs`, on `RunEvent::Exit` (use `.build(...)` then `.run(|app, event| ...)`) stop the runtime.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml runtime`
- **Accept:** Arg tests pass. The `free_port` test returns a non-zero port. **[HUMAN]** (after M6-T05) the child process disappears when the app closes.
- **Verify:** SV.

### M6-T05: Local commands
- **Goal:** Tauri commands for install, status, start, stop, remove.
- **Files:** `src-tauri/src/commands/local.rs`, `src-tauri/src/commands/ai.rs`, `src-tauri/src/lib.rs`
- **Depends:** M6-T04
- **Steps:**
  1. `LocalStatus { runtimeInstalled: bool, models: [{id, installed, sizeBytes}], running: bool, activeModelId: Option<String>, platformSupported: bool }`.
  2. Commands: `local_status`; `local_install(model_id, on_event: Channel<InstallEvent>)` (downloads runtime if missing, extracts it, downloads the model; `InstallEvent` = `{type:"progress", stage:"runtime"|"model", downloaded, total}`, `{type:"extracting"}`, `{type:"done"}`, `{type:"error", code}`); `local_cancel_install`; `local_stop`; `local_remove(model_id)` (deletes the model file; if it is the running model, stop first); `local_remove_runtime`.
  3. Free-space check before downloading: if the disk reports less free space than `sizeBytes * 1.2`, return error `disk_space`. If you cannot get free space portably without a new crate, skip the check and add a Known issue (do NOT add a crate).
  4. In `ai_complete`, for `engine == "local"`: ensure the runtime is running (start it if not; if the selected model changed, restart), then build an `OpenAiCompatProvider { base_url: "http://127.0.0.1:<port>/v1", api_key: Some(runtime.api_key), kind: Local, temperature: Some(0.2), local_extras: true }` and stream as for cloud. Update `last_used` after each request. Cloud policy checks are skipped for local.
- **Commands:** `npm run verify`
- **Accept:** Compiles; unit tests still pass.
- **Verify:** SV.

### M6-T06: Local provider in TS and engine selection
- **Goal:** The TS side can install and use the local model.
- **Files:** `src/lib/ipc.ts`, `src/lib/providers/local.ts`, `src/lib/providers/registry.ts`
- **Depends:** M6-T05
- **Steps:**
  1. `ipc.ts`: `localStatus()`, `localInstall(modelId, onEvent)`, `localCancelInstall()`, `localRemove(modelId)`, `localStop()` wrappers.
  2. `registry.ts`: for `engine === "local"` return the local provider only if the selected model is installed; otherwise return null and the UI shows "Local model not installed".
  3. Map error codes `local_not_installed` and `local_start_failed` to messages in `errors.ts`.
- **Commands:** `npm run verify`
- **Accept:** Type-check passes.
- **Verify:** SV.

### M6-T07: Local section in settings
- **Goal:** UI to choose, download, and remove the model.
- **Files:** `src/lib/ui/SettingsDialog.svelte`
- **Depends:** M6-T06
- **Steps:**
  1. Local section: radio "Gemma 4 E2B (default)" and "Gemma 4 E4B (better quality, larger)". Show each file size from `localStatus` (GB, 1 decimal). Text: "Runs on this computer. Your text never leaves the device. Needs about {size} of disk space and roughly that much free memory (VERIFY)."
  2. Buttons: Download (shows a progress bar with MB downloaded / total, and a Cancel button), Remove (confirm first), and a status line ("Not installed", "Installed", "Running").
  3. If `platformSupported` is false show "Local models are not supported on this system yet." and disable Download.
  4. After a successful install, if the engine is not Local ask nothing; just show "Installed".
- **Commands:** `npm run verify`
- **Accept:** Build passes. **[HUMAN]** Download E2B with progress; cancel works; remove works.
- **Verify:** SV.

### M6-T08: Real-model smoke test
- **Goal:** Confirm the model follows the prompts (output-only, no thinking text).
- **Files:** none (results recorded in Development Status.md)
- **Depends:** M6-T07
- **Steps:**
  1. **[HUMAN or agent with a screen]** Set engine = Local, mode by mode, run Rewrite on these inputs and record the output and whether validation passed:
     - fluent: `The meeting got moved by them to tomorrow because of they were busy.`
     - formal: `Hey, we can't make it, sorry. Can we do it next week?`
     - concise: `In my personal opinion, I think that we should probably go ahead and start the project as soon as possible.`
     - expand: `The app is fast.`
     - simplify: `The committee deliberated extensively before reaching a determination.`
     - protection: `Please read https://example.com/guide and run \`npm install\` before Friday.` in fluent mode (URL and code must be unchanged).
  2. Confirm no `<think>` text or reasoning appears in any output.
  3. If more than 2 of 6 fail validation, record the raw outputs (these are test strings, not private text), and add an open question about prompt tuning. Do NOT change Plan.md.
- **Commands:** none
- **Accept:** Results table written in Development Status.md.
- **Verify:** The log entry exists.

### M6-TGATE: Milestone 6 gate

---

## MILESTONE 7: Proactive pause-based checking

### M7-T01: Sentence splitter
- **Goal:** Find the sentence around a position.
- **Files:** `src/lib/engine/sentences.ts`, `src/lib/engine/sentences.test.ts`
- **Depends:** M6-TGATE tasks (M6-T08)
- **Steps:**
  1. `splitSentences(text: string): { start: number; end: number; text: string }[]`. A sentence ends after `.`, `!`, `?` (plus any closing quote/bracket `"'”’)]`) when followed by whitespace or the end of text. It also ends at a newline. Do NOT split after: a single capital letter plus period (`J.`), common abbreviations (`Mr.`, `Mrs.`, `Ms.`, `Dr.`, `Prof.`, `St.`, `vs.`, `etc.`, `e.g.`, `i.e.`, `Inc.`, `Ltd.`), a period between digits (`3.14`), or an ellipsis `...` followed by a lowercase letter. Leading whitespace is excluded from a sentence (start points at its first non-space char); `end` excludes trailing whitespace.
  2. `sentenceAt(text, pos)`: the sentence containing `pos`, or the one that ends right before `pos` if `pos` is in the whitespace after it.
  3. Tests (15+ cases): the abbreviations above; decimals; quotes (`He said "Go." Then left.`); ellipsis; newline-separated lines; no final punctuation; empty text; offsets are exact (`text === full.slice(start,end)`).
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M7-T02: Pending tracker (shift ranges while typing)
- **Goal:** Follow an in-flight sentence range as the user keeps typing.
- **Files:** `src/lib/engine/pending.ts`, `src/lib/engine/pending.test.ts`
- **Depends:** M7-T01, M2-T09
- **Steps:**
  1. `class PendingTracker { add(id: string, from: number, to: number, textHash: string): void; update(changes: ChangeSet, newDoc: Text): string[]; get(id): {from,to,textHash} | undefined; remove(id): void }`.
  2. `update` maps each range (`from` with assoc 1, `to` with assoc -1) and returns the ids that became STALE: touched per `isMarkTouched`, or collapsed, or whose current text hash (`hashText(newDoc.sliceString(from,to))`) differs from `textHash`. Stale ids are removed from the tracker.
  3. Tests (use `ChangeSet.of`): typing before the range shifts it; typing after leaves it; typing inside makes it stale; deleting the whole sentence makes it stale.
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M7-T03: AI check pipeline
- **Goal:** Check one sentence with the AI engine and produce a purple mark.
- **Files:** `src/lib/engine/aiChecker.ts`, `src/lib/engine/aiChecker.test.ts`
- **Depends:** M7-T02, M5-T06
- **Steps:**
  1. `checkSentence(provider, sentence: string, signal): Promise<{ replacement: string; changedWords: number } | null>`: `protectText(sentence, [])` -> `buildCheckPrompt` -> `provider.complete({origin: "auto", task: "check", ...maxTokens: ceil(len/2)+64})` -> `cleanOutput` -> `validate` (mode `"check"`) -> `restoreText`. Return `null` if invalid, unchanged, or if more than 50% of words changed (`wordDiff` ratio). Otherwise return the corrected sentence and the number of changed words.
  2. `makeAiSuggestion(range, original, result, provider): Suggestion` with `kind: "rewrite"`, `source: provider.id === "local" ? "ai-local" : "ai-cloud"`, `reason: "AI suggestion: changes N word(s)"`, `safeToAutoApply: false`, `alternatives: []`.
  3. Cache: `Lru<{replacement,changedWords}|null>` of 300 entries keyed by `hashText(sentence + "|" + provider.id + "|" + modelLabel)`. A `null` result is cached too (so clean sentences are not re-checked).
  4. Tests (fake provider): valid result becomes a suggestion; invalid output gives null; unchanged gives null; a second call with the same sentence uses the cache (provider call count stays 1); changed-word ratio above 50% gives null.
- **Commands:** `npm run test`
- **Accept:** Tests pass.
- **Verify:** SV.

### M7-T04: Scheduler (pause, sentence end, cancel)
- **Goal:** Decide when to check which sentence, one at a time.
- **Files:** `src/lib/engine/aiScheduler.ts`, `src/lib/engine/aiScheduler.test.ts`, `src/App.svelte`
- **Depends:** M7-T03, M4-T09
- **Steps:**
  1. `class AiScheduler { constructor(host: AiHost, deps: { settings(): Settings; provider(): AiProvider | null; hasHarperMarksIn(from,to): boolean; isComposing(): boolean; ... }) ; onDocChanged(tr info): void; dispose(): void }`. `AiHost` offers `getText()`, `applyMarks(...)` (group `"ai"`) and `getDoc()`.
  2. Triggers: (a) a timer of `settings.autoCheck.pauseMs` (default 700) after the last change -> check the sentence at the cursor and any other dirty sentences (at most 2 per pause, oldest first); (b) a sentence-end trigger: if the inserted text is whitespace or a newline and the character just before it is `.`, `!`, or `?`, check the sentence that just ended after 150 ms.
  3. Skip rules (all must be checked): `autoAiAllowed(settings)` is true; provider is not null; the editor is not composing (IME); sentence length between 12 and 600 chars; the sentence has no Harper marks inside it; its text is not only protected text.
  4. One request in flight at a time. Keep a queue (max 3). A newer request for the same sentence replaces the queued one. If the in-flight sentence becomes stale (from `PendingTracker`), abort it with its `AbortController` (this triggers `ai_cancel`).
  5. When a result arrives: check the id is still in `PendingTracker` (not stale). If valid, `applyMarks({from, to, group: "ai", marks:[suggestion]})` using the TRACKED (mapped) range, not the original one.
  6. Errors: ignore silently except `unauthorized`/`not_found`/`local_start_failed`, which set a one-line message in the bottom bar and pause auto-checks until settings change.
  7. Tests (fake timers and a fake provider): pause trigger fires after 700 ms and not before; typing again resets the timer; sentence-end trigger fires after 150 ms; stale in-flight is aborted; two requests never run at once; skip rules (each one) prevent a call; cloud engine with `allowCloud=false` makes zero provider calls.
- **Commands:** `npm run test`
- **Accept:** Tests pass. **[HUMAN]** With a local model installed, writing a sentence with a clumsy phrase and pausing shows a purple solid underline. Typing in the sentence removes the mark. Typing elsewhere shifts it correctly.
- **Verify:** SV.

### M7-T05: Cloud auto-check visibility
- **Goal:** Automatic cloud checking is opt-in and clearly visible.
- **Files:** `src/lib/ui/EngineBadge.svelte`, `src/lib/ui/SettingsDialog.svelte`
- **Depends:** M7-T04
- **Steps:**
  1. Confirm the settings toggle "Allow automatic cloud checks" shows a warning line: "Each sentence you type will be sent to {host}."
  2. While an auto cloud request is in flight the badge shows "sending…" (reuse the M4-T09 state; set it from the scheduler).
  3. Add a unit test for `autoCloudActive` with the settings from the scheduler test (already in M4-T09; extend if cases are missing).
- **Commands:** `npm run verify`
- **Accept:** **[HUMAN]** With Cloud + auto-check on, the badge shows "auto-check ON" and pulses amber. With auto-check off, typing sends zero requests (check the provider's request log or Rust test mock).
- **Verify:** SV.

### M7-T06: Measure responsiveness
- **Goal:** Typing is never blocked by AI work.
- **Files:** none (results in Development Status.md)
- **Depends:** M7-T05
- **Steps:**
  1. In devtools console (dev build) run:
```js
     new PerformanceObserver(l => l.getEntries().forEach(e => console.log("longtask ms", Math.round(e.duration)))).observe({ entryTypes: ["longtask"] });
```
  2. Paste a 1,000-word text, then type continuously for 30 s while a local AI check is running.
  3. Record the number of long tasks above 50 ms and the largest. Budget: none above 100 ms caused by checking.
  4. Record time from pause to purple mark for E2B on this machine.
- **Commands:** none
- **Accept:** Results recorded. If the budget fails, add a Known issue.
- **Verify:** Log entry exists.

### M7-TGATE: Milestone 7 gate

---

## MILESTONE 8: Polish, settings, packaging

### M8-T01: Open, Save, document name
- **Goal:** Basic file handling.
- **Files:** `src-tauri/src/commands/files.rs`, `src-tauri/src/lib.rs`, `src/lib/ipc.ts`, `src/lib/ui/TopBar.svelte`, `src/App.svelte`
- **Depends:** M7-TGATE tasks (M7-T06)
- **Steps:**
  1. Rust commands `read_text_file(path) -> String` and `write_text_file(path, text)` (UTF-8 only; return error `not_utf8`; max 5 MB; write via temp file + rename). Paths come only from the dialog results.
  2. TS: use `open`/`save` from `@tauri-apps/plugin-dialog` with filters `txt`, `md`. Keyboard: Ctrl/Cmd+O, Ctrl/Cmd+S, Ctrl/Cmd+Shift+S via a CodeMirror keymap at normal priority.
  3. Top bar shows the file name (or "Untitled") and a `•` when there are unsaved changes.
  4. On open: replace the document, clear `dismissed`, call `engine.checkAllNow()`.
  5. On window close with unsaved changes: use `getCurrentWindow().onCloseRequested` and the dialog plugin `ask("Discard unsaved changes?")`.
  6. Remember: the editor undo history is reset when a file is opened (create a fresh state with `view.setState`).
- **Commands:** `npm run verify`
- **Accept:** Build passes. **[HUMAN]** Open, edit, save, reopen works. Unsaved prompt appears.
- **Verify:** SV.

### M8-T02: Settings polish and error states
- **Goal:** Dialect, pause time, reset, and calm error handling.
- **Files:** `src/lib/ui/SettingsDialog.svelte`, `src/lib/ui/BottomBar.svelte`, `src/lib/ai/errors.ts`
- **Depends:** M8-T01
- **Steps:**
  1. Add: Dialect select (American, British, Canadian, Australian; changing it calls `engine.checkAllNow()` with the cache cleared), pause time (300-3000 ms slider), "Reset all settings" (confirm; calls `save_settings` with defaults; also offer "Remove saved API key").
  2. All AI errors appear as a one-line, dismissible message in the bottom bar (muted red text). They never open dialogs and never block typing.
  3. If `check_text` fails, show "Spelling check unavailable" once, and keep the editor usable.
  4. Make sure every interactive element is reachable with the keyboard and has a visible focus ring (`:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`).
- **Commands:** `npm run verify`
- **Accept:** Build passes. **[HUMAN]** Changing dialect re-checks the text. Errors never block typing.
- **Verify:** SV.

### M8-T03: Performance measurement
- **Goal:** Record that budgets (Section 11) are met.
- **Files:** none (results in Development Status.md)
- **Depends:** M8-T02
- **Steps:** Run every measurement in Section 11.2 and record each number.
- **Commands:** `cargo test --manifest-path src-tauri/Cargo.toml --release -- --ignored perf`
- **Accept:** All budgets met, or each miss is a Known issue with numbers.
- **Verify:** Log entry exists.

### M8-T04: Privacy audit
- **Goal:** Prove the privacy rules in Section 12 hold.
- **Files:** none (results in Development Status.md)
- **Depends:** M8-T02
- **Steps:**
  1. `grep -rn "println!\|eprintln!\|dbg!" src-tauri/src` prints nothing (except none).
  2. `grep -rn "console\.log" src` prints nothing.
  3. `grep -rn "localStorage\|sessionStorage" src` prints nothing.
  4. `grep -rn "fetch(\|XMLHttpRequest\|WebSocket" src` prints nothing.
  5. `grep -n "connect-src" src-tauri/tauri.conf.json` shows only `ipc:`, `http://ipc.localhost` (and the dev-only localhost entries in `devCsp`).
  6. Open `settings.json` in the app config dir. Confirm it has no key and no document text.
  7. `cargo tree --manifest-path src-tauri/Cargo.toml --depth 1` and list direct dependencies. Confirm each is in Section 5.
  8. **[HUMAN]** Disconnect the network. Typing still shows Harper marks and Tab works. With engine Off, a network monitor shows no traffic from the app.
  9. **[HUMAN]** With a local model running, confirm the llama-server process listens only on 127.0.0.1 (`netstat -an` / `lsof -i`).
- **Commands:** as listed.
- **Accept:** Steps 1-7 print the expected results.
- **Verify:** Log entry with outputs.

### M8-T05: Package the app
- **Goal:** A release build / installer.
- **Files:** none (build output in `src-tauri/target/release/bundle/`)
- **Depends:** M8-T03, M8-T04
- **Steps:**
  1. `npm run tauri build`.
  2. Record the installer file name and size.
  3. **[HUMAN]** Install it on a clean machine or account, launch it, type a sentence with a typo, confirm the mark and Tab fix.
- **Commands:** `npm run tauri build`
- **Accept:** A bundle exists. Size recorded.
- **Verify:** `ls src-tauri/target/release/bundle`.

### M8-T06: Final definition-of-done run
- **Goal:** Check Section 14 line by line.
- **Files:** none
- **Depends:** M8-T05
- **Steps:** Go through every line of Section 14. Record result and evidence for each.
- **Accept:** Every line passes, or is recorded as a Known issue and reported to the human.
- **Verify:** Log entry.

### M8-TGATE: Milestone 8 gate

---

## 9. Test strategy

### 9.1 What is unit tested (automatic, in `npm run verify`)
**Rust:** offset map, Lint conversion, protected ranges, safety rules, Harper fixture cases, settings load/save/validate, secrets (mock), OpenAI client (wiremock), SSE parser, cloud policy, download + checksum + cancel, archive extraction (including path traversal), llama-server argument builder.
**TypeScript:** hash, LRU, paragraphs, sentences, touched rule, mark mapping, engine (fake timers + fake IPC), applyFix, fix-all (single undo), dismiss, gating, provider registry, word diff, hunks, prompts, protect, validate, stats, pending tracker, AI checker, AI scheduler.

### 9.2 What is tested manually ([HUMAN])
Window appearance and dark mode, typing feel, mark flicker, card position, Tab and undo, cloud rewrite with a real key, local download and model run, file open/save, packaging, offline behavior.

### 9.3 Sample inputs and expected results
"Must" lines are hard requirements. Where Harper's exact wording is not known in advance, freeze it in `harper-cases.json` after the first reviewed run.

| # | Input | Expected |
|---|---|---|
| 1 | `I recieve teh package yesterday.` | Marks on `recieve` -> `receive` and `teh` -> `the`, kind spelling, both safeToAutoApply = true. |
| 2 | `This is an test.` | A grammar mark on `an` with replacement `a` (Harper's own README example). |
| 3 | `the the cat sat` | A repetition mark. Safe = true if the kind name is in the safe list. |
| 4 | `See https://exmaple.com/teh-page for details.` | NO mark inside the URL. |
| 5 | ``Run `npm isntall` now.`` | NO mark inside the backticks. |
| 6 | `Mail jhon.smtih@exmple.com today` | NO mark inside the email. |
| 7 | A fenced block (three backticks) containing `teh` and a typo `recieve` outside it | Only the outside typo is marked. |
| 8 | `😀 teh cat` | The `teh` mark has `start = 3`, `end = 6` (UTF-16). |
| 9 | `I met Kowalski yesterday.` | If `Kowalski` is flagged: safeToAutoApply = false. |
| 10 | `I dont know.` | `dont` -> `don't` (or similar), safe = true. |
| 11 | `"   "` or `""` | No marks, no error. |
| 12 | `NASA lauched it.` | `lauched` -> `launched` safe; `NASA` never auto-fixed. |
| 13 | `a\r\n\r\nb teh` (CRLF) | Mark on `teh` with correct absolute offset after paragraph splitting. |
| 14 | A 12,000-char paragraph | Checked in chunks, no error, offsets correct. |
| 15 | `Dr. Smith went home. He was tired.` | `splitSentences` gives exactly 2 sentences. |
| 16 | `Pi is 3.14 today. Yes.` | `splitSentences` gives exactly 2 sentences. |

### 9.4 Tab and undo checks
- 3 safe fixes, Tab, 1 undo -> original text. 0 safe fixes, Tab -> text unchanged and the key is not consumed. A rewrite mark and a non-safe grammar mark are never applied by Tab.

### 9.5 Mark shifting checks
- Insert 3 characters before a mark: it moves by 3. Type inside: removed. Type a space after it: stays. Type a letter right after it: removed. Result for a paragraph that came back after the text changed: discarded.

---

## 10. Prompt templates (for 2B-4B models)

Rules for all prompts: one user message (no system message, so any chat template works); short rules; one example; output-only; delimiters `<<<` and `>>>`; temperature 0.2 (local); thinking off (`chat_template_kwargs.enable_thinking = false`, local only).

### 10.1 Common rules block
````
You are a text editing tool. You are not a chat assistant.
Rules:
1. Output ONLY the result text. No introduction, no notes, no explanation, no quotes around it, no markdown.
2. Keep the same language as the input.
3. Keep the same meaning. Do not add facts, names, numbers or quotes that are not in the input.
4. Copy every item that looks like [[P1]], [[P2]] and so on exactly as written, once each, in the same order.
5. Keep these words and phrases exactly as written: {FROZEN_LIST}
````
`{FROZEN_LIST}` = `"w1", "w2"`. Omit rule 5 when the list is empty.

### 10.2 Wrapper
````
{COMMON_RULES}

TASK: {TASK}

EXAMPLE
INPUT:
<<<
{EXAMPLE_IN}
>>>
OUTPUT:
{EXAMPLE_OUT}

NOW DO THE SAME FOR THIS INPUT.
INPUT:
<<<
{TEXT}
>>>
OUTPUT:
````
Retry suffix (appended on the second attempt): `Your last answer broke the rules. Output only the result text and nothing else.`

### 10.3 Task and example per mode
| Mode | TASK | EXAMPLE_IN | EXAMPLE_OUT |
|---|---|---|---|
| fluent | Rewrite the text so it reads smoothly and naturally. Fix awkward phrasing. Keep the length about the same. | The meeting got moved by them to tomorrow because of they were busy. | They moved the meeting to tomorrow because they were busy. |
| formal | Rewrite the text in a formal, professional tone. Do not use contractions or slang. | Hey, we can't make it, sorry. Can we do it next week? | Unfortunately, we are unable to attend. Would it be possible to reschedule for next week? |
| concise | Make the text shorter. Remove filler words and repetition. Keep every important fact. | In my personal opinion, I think that we should probably go ahead and start the project as soon as possible. | I think we should start the project soon. |
| expand | Make the text longer and clearer by explaining the ideas more fully. Do not invent specific facts, numbers, names or quotes. | The app is fast. | The app is fast. It responds quickly to what you type, so you rarely have to wait. |
| simplify | Rewrite the text using short sentences and plain, common words that a 12-year-old can understand. Keep the meaning. | The committee deliberated extensively before reaching a determination. | The committee talked for a long time before it made a decision. |
| custom | `{USER_INSTRUCTION}` Also obey the rules above. | (use the fluent example) | (use the fluent example) |
| check (proactive) | Fix spelling, grammar and punctuation errors in the text. Change as few words as possible. Do not rephrase. If there are no errors, output the text exactly as given. | She dont like apples , but she eat them. | She doesn't like apples, but she eats them. |
| summarize | Summarize the text in 2 to 3 short sentences. Output only the summary. | (use a 3-sentence example about a team meeting) | (a 2-sentence summary) |

For summarize, write one real short example pair in `prompts.ts` (3 sentences in, 2 sentences out). Do not leave it empty.

### 10.4 Allowed length ratio (output length / input length)
fluent 0.6-1.5; formal 0.6-1.6; concise 0.2-0.95; expand 1.1-3.5; simplify 0.5-1.8; check 0.8-1.25; custom 0.2-4; summarize 0.05-0.8.

### 10.5 Frozen/protected word survival plan
1. Before sending: replace URLs, emails, code, and the preset's frozen words with `[[P1]]`, `[[P2]]`... (M5-T05).
2. After receiving: check each placeholder appears exactly once and in order. If not, the output is invalid.
3. After restoring: check every frozen word appears at least as many times as in the input.
4. If invalid: retry once with the retry suffix. If still invalid: show "Couldn't produce a safe rewrite. Your text is unchanged." and change nothing.
5. The unit tests in `validate.test.ts` and `protect.test.ts` cover each failure; M6-T08 checks it with the real model.

---

## 11. Performance budgets

### 11.1 Budgets
| What | Budget |
|---|---|
| Harper check of one paragraph (<= 300 words), release build, median | < 50 ms |
| First marks after loading a 5,000-word document | < 1.5 s total, paragraphs appear progressively |
| Keystroke handling in the editor (no check logic on the main thread except mark mapping) | no long task > 50 ms |
| Mark update after a Harper result | < 100 ms |
| Tab fix-all with 200 fixes | < 100 ms |
| Local AI checks | only after a pause or sentence end; one at a time; never during IME composition |
| Cloud AI | never automatic unless the user opted in |
| Rewrite output | streamed; UI updates at most 10 times per second |
| Local server memory | stopped after `idleStopMinutes` (default 10) idle |

### 11.2 How to measure
1. Harper: `cargo test --manifest-path src-tauri/Cargo.toml --release -- --ignored perf` (prints the median). Record it.
2. 5,000-word load: paste a 5,000-word text (copy a 100-word paragraph with 3 typos 50 times). In devtools run `performance.mark("a")` before pasting and watch the time until the last mark appears; record it.
3. Long tasks: run the `PerformanceObserver` snippet from M7-T06 while typing for 30 s.
4. Tab fix-all with 200 fixes: paste a text with 200 `teh`, in devtools time `performance.now()` around the Tab keypress handler or measure with the `fixAll` unit test using `performance.now()`; record it.
5. Memory: after 11 minutes idle with a local model, confirm the `llama-server` process is gone.

---

## 12. Privacy and security rules

1. **API key:** stored only in the OS keychain (`keyring`). Never written to `settings.json`, never returned to JavaScript, never logged. The settings UI is write-only for the key.
2. **What is sent, and when:**
   - Engine Off: nothing. No network at all.
   - Engine Local: text goes only to `127.0.0.1` (the child process). The server is protected by a random per-launch API key and listens only on loopback.
   - Engine Cloud: text goes only to the user's configured host, and only when (a) the user clicks Rewrite or Summarize, or (b) the user enabled "Allow automatic cloud checks". The first use of each host requires consent. Rust enforces consent and the auto-check opt-in (not just the UI).
3. **Always visible:** the bottom bar shows the engine, and whether text leaves the device.
4. **No logging of text:** no printing of text, prompts, or responses. `llama-server` output is sent to null. Error messages never contain request bodies. No crash reports. No analytics.
5. **Network surface:** the webview CSP allows only IPC. All HTTP is in Rust. Downloads only from `github.com` and `huggingface.co` over HTTPS, and every download is SHA-256 verified.
6. **Files:** the app reads/writes only paths the user picked in a dialog, plus its own config/data folders. Archive extraction rejects path traversal.
7. **No telemetry, no auto-update, no accounts.**
8. **Base URLs:** `https://` only, except loopback hosts (for local OpenAI-compatible servers like LM Studio).

---

## 13. Risks and common failure modes for weak agents

| Risk | How the plan guards against it |
|---|---|
| Agent writes Svelte 4 syntax | Rule 13 forbids it. `svelte-check` in `verify` catches most cases. |
| Agent upgrades or changes Harper version | `=3.2.0` pinned. M2-T01 says do not upgrade. |
| Agent invents Harper/Tauri/CodeMirror APIs | Rule 11: read real source. VERIFY steps list what to confirm. |
| Offset bugs (chars vs UTF-16 vs bytes) | Rule 14. `OffsetMap` with emoji tests. Fixture case 8. |
| Marks drift while typing | Pure `isMarkTouched` and `mapMarks` with tests. Stale-result hash check. |
| Tab fix applied as many transactions (many undo steps) | M3-T02 requires ONE dispatch, tested by counting `update` calls and a single `undo`. |
| Tab breaks normal typing | Handler returns `false` when nothing is pending (tested). |
| Native browser spellcheck conflicts with marks | M2-T08 turns it off. |
| API key leaks | Keychain only; no command returns it; audit M8-T04. |
| Text logged | Lint denies prints; grep audit; `llama-server` output to null. |
| Webview makes network calls | CSP; grep audit. |
| Tauri commands run on the UI thread | M2-T06 requires `async` + `spawn_blocking`. |
| Harper not `Send` | Feature `concurrent`; fallback to worker thread, recorded. |
| Model output has chatter or `<think>` text | `enable_thinking: false`, output-only prompts, `validate.ts`, one retry, no change on failure. |
| Placeholders mangled by small models | Order and count check; retry; refuse. |
| Overreaching fixes (names, acronyms) | Strict `safeToAutoApply` rules. |
| AI check conflicts with Harper marks | AI skips sentences that have Harper marks. |
| Stale AI results applied to edited text | `PendingTracker` + hash check + abort. |
| Cloud auto-checks without consent | Rust policy check + UI + visible indicator. |
| Task too big, agent skips steps | Small tasks, numbered steps, acceptance lines, one commit per task. |
| Agent says "done" without testing | Rule 6; log must contain command results. |
| Agent edits the Plan or ticks the Roadmap early | Rules 9 and 10. |
| Added dependencies "just in case" | Rule 4; crates are added only in the task that lists them. |
| Windows paths with spaces (`Development Status.md`) | Rule 1 says to quote. |
| Download of a bad or tampered file | SHA-256 check; host allowlist; HTTPS only. |
| Zip-slip in archives | Explicit rejection plus a test. |
| macOS upstream llama.cpp binaries reportedly require macOS 26 | Open question in M6-T01. Platform-support flag in `local_status`. Fallback: local engine unsupported on older macOS. |
| Orphaned `llama-server` after a hard crash | `kill_on_drop`, exit hook, idle stop. Windows job object is listed under "Later". |
| Gemma 3-style system role unsupported | Prompts use a single user message. |
| Gemini 3-style cloud models cannot turn thinking off (slow) | Cloud auto-checks are opt-in; documented in the settings note. |
| Headless agent cannot see the UI | Rule 7: [HUMAN] steps go to a visible list; automated checks still run. |
| Fenced code blocks containing blank lines | `paragraphs.ts` keeps a fence as one paragraph. |
| Network blocked for the agent | M6-T01 stops and asks the human. |

---

## 14. Definition of done (whole project)

All lines must be true. Each is checked in M8-T06 with evidence.

1. `npm run verify` passes with 0 failures.
2. `npm run tauri build` produces an installer, and it launches on a clean machine.
3. With the network disconnected and engine Off, typing shows red and blue marks within ~0.3 s.
4. Tab fixes all safe fixes in one step, and one undo restores them. Tab does nothing special when no fixes are pending.
5. Clicking a mark shows the card with old word, new word, reason, Accept, Dismiss. Both buttons work.
6. Spelling = red wavy, grammar = blue wavy, AI rewrite = solid purple. Tab never applies purple marks.
7. No marks appear inside URLs, emails, or code.
8. The five rewrite modes and custom presets work with the word diff, per-change accept/reject, and one-step undo for Apply.
9. Frozen words and placeholders survive rewriting, or the rewrite is refused with the original text untouched.
10. Summarize, word count, reading time, and readability work.
11. Cloud: base URL, key, and model can be set; Test connection works; the key is not in `settings.json`; first use asks for consent.
12. Local: E2B (default) and E4B can be downloaded with progress, verified, started, used, stopped on idle and on app exit, and removed.
13. Proactive checking: after a ~700 ms pause or sentence end, only the changed sentence is checked; stale requests are cancelled; results are cached; marks stay in place while typing.
14. Automatic cloud checks are off by default, and when on, a visible indicator shows text is being sent.
15. The UI always shows the active engine and whether text leaves the device.
16. Performance budgets in Section 11 are met or recorded as Known issues.
17. The privacy audit (M8-T04) passes.
18. All four Roadmap statuses (all 8 milestones) are ticked with evidence in Development Status.md.

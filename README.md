# FuseWriter

A small, private desktop writing app. It checks spelling and grammar while you type — a private alternative to Grammarly and QuillBot. Local checking with Harper, optional AI (local Gemma 4 via llama.cpp, or any OpenAI-compatible cloud API the user configures). No server, no account, no telemetry.

**Status:** finalized — all 8 build milestones are implemented (editor with Harper marks, Tab fix-all, suggestion cards, cloud + local AI rewrites with diff view, proactive pause-based checking, file open/save, packaging). Automated checks pass, the app launches on Windows, and the code plus generated icons are pushed to GitHub. The remaining window checks listed in `docs/Development Status.md` under "Needs human verification" are for a human to confirm, so the Roadmap milestones are intentionally left unticked. See that file for the current state.

## Docs

- `docs/Plan.md` — full build plan (human edits only)
- `docs/Development Status.md` — living development log, source of truth for project state
- `docs/Roadmap.md` — milestone checklists

## Develop

```sh
npm install
npm run verify     # svelte-check + vitest + cargo fmt/clippy/test
npm run tauri dev  # opens the app window (needs the Tauri prerequisites for your OS)
```

App icons in `src-tauri/icons/` are generated from `assets/app-icon.svg` with `npx tauri icon assets/app-icon.svg` and are committed, so a fresh clone builds without extra steps. Regenerate them only when changing the SVG.

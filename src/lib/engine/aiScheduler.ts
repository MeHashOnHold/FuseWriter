import type { Transaction } from "@codemirror/state";
import { protectText } from "../ai/protect";
import { aiErrorText } from "../ai/errors";
import { AiError, type AiProvider } from "../providers/types";
import type { Settings, Suggestion } from "../types";
import { checkSentence, makeAiSuggestion } from "./aiChecker";
import { autoAiAllowed } from "./gating";
import { hashText } from "./hash";
import { PendingTracker } from "./pending";
import { sentenceAt, splitSentences, type Sentence } from "./sentences";

export interface AiHost {
  getText(): string;
  applyMarks(u: { from: number; to: number; group: "ai"; marks: Suggestion[] }): void;
}

export interface AiSchedulerDeps {
  settings(): Settings;
  provider(): AiProvider | null;
  hasHarperMarksIn(from: number, to: number): boolean;
  isComposing(): boolean;
  onSendingChange?(sending: boolean): void;
  onError?(message: string): void;
}

const HARD_ERRORS = new Set(["unauthorized", "not_found", "local_start_failed"]);
const MAX_QUEUE = 3;
const PER_PAUSE = 2;
const END_DELAY_MS = 150;

/**
 * Decides when finished sentences get an AI check (Plan.md M7-T04):
 * a pause after typing, or shortly after a sentence ends. One request
 * in flight; in-flight work is aborted when its sentence is edited.
 * Hard errors pause auto-checks until the settings change.
 */
export class AiScheduler {
  private tracker = new PendingTracker();
  private queue: string[] = [];
  private inFlight: { id: string; controller: AbortController } | null = null;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty: Sentence[] = [];
  private counter = 0;
  private lastCursor = 0;
  private pausedForError = false;
  private settingsKey = "";
  private disposed = false;

  constructor(
    private host: AiHost,
    private deps: AiSchedulerDeps,
  ) {}

  private allowed(): boolean {
    return !this.pausedForError && autoAiAllowed(this.deps.settings());
  }

  private refreshSettingsKey(): void {
    const s = this.deps.settings();
    const key = JSON.stringify([
      s.engine,
      s.autoCheck.enabled,
      s.autoCheck.allowCloud,
      s.autoCheck.pauseMs,
      s.local.modelId,
      s.cloud.baseUrl,
    ]);
    if (key !== this.settingsKey) {
      this.settingsKey = key;
      this.pausedForError = false; // settings changed: resume
    }
  }

  onDocChanged(tr: Transaction): void {
    if (this.disposed) return;
    this.refreshSettingsKey();
    this.lastCursor = tr.state.selection.main.head;
    if (!tr.docChanged) return;

    const stale = this.tracker.update(tr.changes, tr.newDoc);
    for (const id of stale) {
      this.queue = this.queue.filter((q) => q !== id);
      if (this.inFlight?.id === id) this.inFlight.controller.abort();
    }

    const text = tr.newDoc.toString();
    const sentences = splitSentences(text);
    let endedSentence: Sentence | null = null;
    tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
      void fromA;
      void toA;
      // Dirty sentences: anything overlapping the changed range.
      for (const s of sentences) {
        if (s.start <= toB && s.end >= fromB) {
          if (!this.dirty.some((d) => d.start === s.start && d.text === s.text)) {
            this.dirty.push(s);
          }
        }
      }
      // Sentence-end trigger: whitespace typed right after . ! ?
      const inserted = tr.newDoc.sliceString(fromB, toB);
      if (
        inserted.length > 0 &&
        /^\s+$/.test(inserted) &&
        fromB > 0 &&
        ".!?".includes(tr.newDoc.sliceString(fromB - 1, fromB))
      ) {
        endedSentence = sentenceAt(text, fromB - 1);
      }
    });

    if (!this.allowed()) return;

    if (endedSentence) {
      const target: Sentence = endedSentence;
      if (this.endTimer) clearTimeout(this.endTimer);
      this.endTimer = setTimeout(() => {
        this.endTimer = null;
        // Re-derive the sentence from the current text at fire time.
        const now = sentenceAt(this.host.getText(), target.end - 1);
        if (now && now.text === target.text) this.enqueue(now);
      }, END_DELAY_MS);
    }

    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    this.pauseTimer = setTimeout(() => {
      this.pauseTimer = null;
      this.onPause();
    }, this.deps.settings().autoCheck.pauseMs);
  }

  private onPause(): void {
    if (this.disposed || !this.allowed()) return;
    const text = this.host.getText();
    const candidates: Sentence[] = [];
    const cursorSentence = sentenceAt(text, this.lastCursor);
    if (cursorSentence) candidates.push(cursorSentence);
    for (const s of [...this.dirty].sort((a, b) => a.start - b.start)) {
      if (!candidates.some((c) => c.text === s.text)) candidates.push(s);
    }
    this.dirty = [];
    for (const c of candidates.slice(0, PER_PAUSE)) this.enqueue(c);
  }

  private skippable(s: Sentence): boolean {
    if (s.text.length < 12 || s.text.length > 600) return true;
    if (this.deps.isComposing()) return true;
    if (this.deps.hasHarperMarksIn(s.start, s.end)) return true;
    const { text: protectedText } = protectText(s.text, []);
    if (!protectedText.replace(/\[\[P\d+\]\]/g, "").trim()) return true;
    return false;
  }

  private enqueue(s: Sentence): void {
    if (this.disposed || !this.allowed()) return;
    if (this.skippable(s)) return;
    const hash = hashText(s.text);
    // A newer request for the same sentence replaces the queued one.
    for (const id of [...this.queue]) {
      if (this.tracker.get(id)?.textHash === hash) {
        this.tracker.remove(id);
        this.queue = this.queue.filter((q) => q !== id);
      }
    }
    const id = `aicheck-${++this.counter}`;
    this.tracker.add(id, s.start, s.end, hash);
    this.queue.push(id);
    while (this.queue.length > MAX_QUEUE) {
      const dropped = this.queue.shift()!;
      this.tracker.remove(dropped);
    }
    this.pump();
  }

  private pump(): void {
    if (this.disposed || this.inFlight) return;
    const provider = this.deps.provider();
    if (!provider || !this.allowed()) {
      for (const id of this.queue) this.tracker.remove(id);
      this.queue = [];
      return;
    }
    const id = this.queue.shift();
    if (!id) return;
    const tracked = this.tracker.get(id);
    if (!tracked) {
      this.pump();
      return;
    }
    const sentence = this.host.getText().slice(tracked.from, tracked.to);
    if (hashText(sentence) !== tracked.textHash || this.skippable({ start: tracked.from, end: tracked.to, text: sentence })) {
      this.tracker.remove(id);
      this.pump();
      return;
    }
    const controller = new AbortController();
    this.inFlight = { id, controller };
    this.deps.onSendingChange?.(true);
    checkSentence(provider, sentence, controller.signal)
      .then((result) => {
        if (this.disposed || this.inFlight?.id !== id) return;
        const now = this.tracker.get(id);
        if (result && now) {
          this.host.applyMarks({
            from: now.from,
            to: now.to,
            group: "ai",
            marks: [
              makeAiSuggestion({ from: now.from, to: now.to }, sentence, result, provider),
            ],
          });
        }
      })
      .catch((err: unknown) => {
        if (err instanceof AiError && HARD_ERRORS.has(err.code)) {
          this.pausedForError = true;
          this.deps.onError?.(aiErrorText(err.code));
          for (const q of this.queue) this.tracker.remove(q);
          this.queue = [];
        }
        // All other errors are ignored silently.
      })
      .finally(() => {
        if (this.inFlight?.id === id) {
          this.inFlight = null;
          this.deps.onSendingChange?.(false);
        }
        this.tracker.remove(id);
        this.pump();
      });
  }

  dispose(): void {
    this.disposed = true;
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    if (this.endTimer) clearTimeout(this.endTimer);
    this.inFlight?.controller.abort();
    this.inFlight = null;
  }
}
